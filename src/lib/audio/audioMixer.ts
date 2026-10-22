/**
 * VoicePilot — Web Audio Mixer, Streaming Capture & Dual-Participant Recorder
 *
 * Architecture:
 * 1. Capture: User microphone audio -> Downsampler (16kHz PCM) -> Gemini Live session.
 * 2. Playback: Gemini Live audio chunks (24kHz PCM) -> AudioBufferSourceNode -> Output speakers.
 * 3. Mixed Recording:
 *    - Microphone Audio ---> [ Recording Mixer (GainNode) ] ---> [ MediaStreamDestination ] ---> [ MediaRecorder ]
 *    - AI Playback Audio ---> [ Recording Mixer (GainNode) ]
 *    - AI Playback Audio ---> [ AudioContext Destination (Speakers) ]
 *    - (Microphone audio is NEVER routed to speakers, preventing local feedback/echo).
 */

import { downsampleBuffer, floatTo16BitPCM, arrayBufferToBase64, base64ToPCMFloat32 } from './pcm';

export interface RecordingResult {
  blob: Blob;
  url: string;
  durationSeconds: number;
  mimeType: string;
  sizeBytes: number;
}

export type MicDataCallback = (base64PCM16k: string) => void;

export class AudioMixer {
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  private micProcessorNode: ScriptProcessorNode | null = null;
  private recordingMixerNode: GainNode | null = null;
  private micGainNode: GainNode | null = null;
  private streamDestination: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  private nextScheduledTime = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private onMicDataCallback: MicDataCallback | null = null;
  private isMuted = false;
  private startTime = 0;

  /**
   * Initialize Web Audio graph with microphone input and mixed recording destination.
   */
  public async initialize(micStream: MediaStream): Promise<void> {
    this.micStream = micStream;

    // Use standard window.AudioContext or webkitAudioContext
    const AudioContextClass =
      window.AudioContext ||
      // @ts-expect-error webkitAudioContext fallback
      window.webkitAudioContext;

    if (!AudioContextClass) {
      throw new Error('Web Audio API is not supported in this browser.');
    }

    this.audioCtx = new AudioContextClass();
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    // 1. Microphone source
    this.micSourceNode = this.audioCtx.createMediaStreamSource(micStream);

    // Mic gain for mute control
    this.micGainNode = this.audioCtx.createGain();
    this.micGainNode.gain.setValueAtTime(1.0, this.audioCtx.currentTime);
    this.micSourceNode.connect(this.micGainNode);

    // 2. Recording mixer node (combines mic + AI audio)
    this.recordingMixerNode = this.audioCtx.createGain();
    this.recordingMixerNode.gain.setValueAtTime(1.0, this.audioCtx.currentTime);
    this.micGainNode.connect(this.recordingMixerNode);

    // 3. MediaStream destination for MediaRecorder
    this.streamDestination = this.audioCtx.createMediaStreamDestination();
    this.recordingMixerNode.connect(this.streamDestination);

    // 4. Capture processor node for streaming microphone PCM to Gemini Live
    // 2048 buffer size @ 44.1/48kHz gives ~45ms audio packets, ideal for real-time VAD
    this.micProcessorNode = this.audioCtx.createScriptProcessor(2048, 1, 1);
    this.micProcessorNode.onaudioprocess = (event) => {
      if (this.isMuted) return;

      const inputBuffer = event.inputBuffer.getChannelData(0);
      const currentRate = this.audioCtx?.sampleRate || 48000;

      // Downsample to 16,000 Hz for Gemini Live API
      const downsampled = downsampleBuffer(inputBuffer, currentRate, 16000);
      if (downsampled.length === 0) return;

      // Convert to 16-bit linear PCM
      const pcmBuffer = floatTo16BitPCM(downsampled);
      const base64Chunk = arrayBufferToBase64(pcmBuffer);

      if (this.onMicDataCallback) {
        this.onMicDataCallback(base64Chunk);
      }
    };

    // Connect mic source to processor and dummy destination to drive the processor clock
    this.micSourceNode.connect(this.micProcessorNode);
    // Connect processor to a silent gain to ensure Chrome/Safari processes audio
    const silentGain = this.audioCtx.createGain();
    silentGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
    this.micProcessorNode.connect(silentGain);
    silentGain.connect(this.audioCtx.destination);

    // Initialize next scheduled playback time
    this.nextScheduledTime = this.audioCtx.currentTime;
  }

  /**
   * Register callback to receive raw 16kHz PCM chunks from microphone.
   */
  public onMicrophoneData(callback: MicDataCallback): void {
    this.onMicDataCallback = callback;
  }

  /**
   * Start recording the combined stream (human mic + AI speech).
   */
  public startRecording(): void {
    if (!this.streamDestination) {
      throw new Error('AudioMixer must be initialized before recording.');
    }

    this.recordedChunks = [];
    this.startTime = Date.now();

    // Select the best supported browser MIME type
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
    ];

    let selectedMime = '';
    for (const mime of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mime)) {
        selectedMime = mime;
        break;
      }
    }

    const options: MediaRecorderOptions = selectedMime ? { mimeType: selectedMime } : {};
    this.mediaRecorder = new MediaRecorder(this.streamDestination.stream, options);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    // Timeslice of 500ms for continuous buffer collection
    this.mediaRecorder.start(500);
  }

  /**
   * Decode model PCM audio chunk and schedule seamless playback to speakers and recording mixer.
   */
  public scheduleAIChunk(base64Pcm: string, sampleRate = 24000): void {
    if (!this.audioCtx || !this.recordingMixerNode) return;

    try {
      const float32Samples = base64ToPCMFloat32(base64Pcm);
      if (float32Samples.length === 0) return;

      const audioBuffer = this.audioCtx.createBuffer(1, float32Samples.length, sampleRate);
      audioBuffer.getChannelData(0).set(float32Samples);

      const source = this.audioCtx.createBufferSource();
      source.buffer = audioBuffer;

      // 1. Play out of speakers
      source.connect(this.audioCtx.destination);
      // 2. Play into recording mixer so the AI voice is recorded alongside the user
      source.connect(this.recordingMixerNode);

      // Schedule smoothly back-to-back without overlap or gaps
      const now = this.audioCtx.currentTime;
      const startTime = Math.max(now, this.nextScheduledTime);
      source.start(startTime);
      this.nextScheduledTime = startTime + audioBuffer.duration;

      this.activeSources.add(source);
      source.onended = () => {
        this.activeSources.delete(source);
      };
    } catch (err) {
      console.warn('Failed to decode or schedule AI audio chunk:', err);
    }
  }

  /**
   * Immediately cancel any scheduled or currently playing AI speech chunks (barge-in / interruption).
   */
  public interrupt(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Source may already have stopped
      }
    }
    this.activeSources.clear();
    if (this.audioCtx) {
      this.nextScheduledTime = this.audioCtx.currentTime;
    }
  }

  /**
   * Toggle mute on user microphone.
   */
  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.micGainNode && this.audioCtx) {
      this.micGainNode.gain.setValueAtTime(muted ? 0 : 1.0, this.audioCtx.currentTime);
    }
    if (this.micStream) {
      this.micStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  /**
   * Stop recording and return finalized Blob, playable URL, and duration.
   */
  public async stopRecording(): Promise<RecordingResult | null> {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      return null;
    }

    const durationSeconds = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));

    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        resolve({
          blob,
          url,
          durationSeconds,
          mimeType,
          sizeBytes: blob.size,
        });
      };

      try {
        this.mediaRecorder.stop();
      } catch {
        resolve(null);
      }
    });
  }

  /**
   * Fully release all media streams, nodes, and AudioContext resources.
   */
  public close(): void {
    this.interrupt();

    if (this.micProcessorNode) {
      this.micProcessorNode.disconnect();
      this.micProcessorNode = null;
    }

    if (this.micSourceNode) {
      this.micSourceNode.disconnect();
      this.micSourceNode = null;
    }

    if (this.recordingMixerNode) {
      this.recordingMixerNode.disconnect();
      this.recordingMixerNode = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }

    this.onMicDataCallback = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
  }
}
