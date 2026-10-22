"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { GoogleGenAI, Modality } from "@google/genai";
import type { LiveServerMessage } from "@google/genai";
import type { CustomerInfo, ProductConfig, TranscriptMessage, CallStatus } from "@/types";
import { AudioMixer, RecordingResult } from "@/lib/audio/audioMixer";
import { generateId } from "@/lib/utils";

export interface LiveSessionState {
  status: CallStatus;
  statusDetail: string;
  error: string | null;
  transcript: TranscriptMessage[];
  elapsedSeconds: number;
  isMuted: boolean;
  recording: RecordingResult | null;
}

export function useLiveSession() {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [statusDetail, setStatusDetail] = useState<string>("Ready");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [recording, setRecording] = useState<RecordingResult | null>(null);

  // References to keep active media and session handles across re-renders
  const audioMixerRef = useRef<AudioMixer | null>(null);
  const sessionRef = useRef<{ conn?: { close: () => void } } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const statusRef = useRef<CallStatus>("idle");

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Active transcript tracking references to avoid state update races during streaming
  const activeCustomerMessageIdRef = useRef<string | null>(null);
  const activeAiMessageIdRef = useRef<string | null>(null);

  // Clear timer helper
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Teardown everything idempotently
  const cleanupResources = useCallback(async () => {
    stopTimer();

    // Close Gemini Live session
    if (sessionRef.current?.conn) {
      try {
        sessionRef.current.conn.close();
      } catch {
        // Already closed
      }
      sessionRef.current = null;
    }

    // Stop mixer and recorder
    let recordingResult: RecordingResult | null = null;
    if (audioMixerRef.current) {
      try {
        recordingResult = await audioMixerRef.current.stopRecording();
      } catch {
        // Recorder might not have started
      }
      try {
        audioMixerRef.current.close();
      } catch {
        // Ignore cleanup errors
      }
      audioMixerRef.current = null;
    }

    activeCustomerMessageIdRef.current = null;
    activeAiMessageIdRef.current = null;

    return recordingResult;
  }, [stopTimer]);

  // Teardown on component unmount
  useEffect(() => {
    return () => {
      if (statusRef.current === "active" || statusRef.current === "connecting") {
        void cleanupResources();
      }
    };
  }, [cleanupResources]);

  /**
   * Handle incoming transcription text chunks from customer
   */
  const handleCustomerTranscription = useCallback((text: string, isFinished?: boolean) => {
    if (!text.trim()) return;

    setTranscript((prev) => {
      const activeId = activeCustomerMessageIdRef.current;
      const lastMsg = prev[prev.length - 1];

      // If last message is customer and matching our active turn, append/update text
      if (lastMsg && lastMsg.id === activeId && lastMsg.speaker === "customer") {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...lastMsg,
          text: lastMsg.text ? `${lastMsg.text} ${text.trim()}` : text.trim(),
          isInterim: !isFinished,
        };
        if (isFinished) {
          activeCustomerMessageIdRef.current = null;
        }
        return updated;
      }

      // Otherwise start a new customer message
      const newId = generateId();
      if (!isFinished) {
        activeCustomerMessageIdRef.current = newId;
      }
      // Since customer is speaking, AI's previous turn is done
      activeAiMessageIdRef.current = null;

      return [
        ...prev,
        {
          id: newId,
          speaker: "customer",
          text: text.trim(),
          timestamp: new Date().toISOString(),
          isInterim: !isFinished,
        },
      ];
    });
  }, []);

  /**
   * Handle incoming transcription text chunks from AI assistant
   */
  const handleAiTranscription = useCallback((text: string, isFinished?: boolean) => {
    if (!text.trim()) return;

    setTranscript((prev) => {
      const activeId = activeAiMessageIdRef.current;
      const lastMsg = prev[prev.length - 1];

      // If last message is AI and matching our active turn, append/update text
      if (lastMsg && lastMsg.id === activeId && lastMsg.speaker === "ai") {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...lastMsg,
          text: `${lastMsg.text} ${text.trim()}`,
          isInterim: !isFinished,
        };
        if (isFinished) {
          activeAiMessageIdRef.current = null;
        }
        return updated;
      }

      // Otherwise start a new AI message
      const newId = generateId();
      if (!isFinished) {
        activeAiMessageIdRef.current = newId;
      }
      // Since AI is speaking, customer's turn is done
      activeCustomerMessageIdRef.current = null;

      return [
        ...prev,
        {
          id: newId,
          speaker: "ai",
          text: text.trim(),
          timestamp: new Date().toISOString(),
          isInterim: !isFinished,
        },
      ];
    });
  }, []);

  /**
   * Start a real voice session
   */
  const startCall = useCallback(
    async ({
      customer,
      product,
      consent,
    }: {
      customer: CustomerInfo;
      product: ProductConfig;
      consent: boolean;
    }) => {
      if (!customer.name.trim()) {
        setError("Please enter a customer name before starting the call.");
        return;
      }
      if (!consent) {
        setError("Explicit customer recording consent is required before starting the call.");
        return;
      }

      setError(null);
      setStatus("connecting");
      setStatusDetail("Requesting microphone permission…");
      setTranscript([]);
      setElapsedSeconds(0);
      setRecording(null);

      let micStream: MediaStream | null = null;

      try {
        // 1. Request real browser microphone
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        // 2. Provision secure ephemeral token from our server route
        setStatusDetail("Securing Gemini Live session credential…");
        const tokenRes = await fetch("/api/live/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customer, product }),
        });

        if (!tokenRes.ok) {
          const errData = await tokenRes.json().catch(() => ({}));
          throw new Error(
            errData.error || `Server failed to provision token (HTTP ${tokenRes.status})`
          );
        }

        const { token, model } = (await tokenRes.json()) as { token: string; model: string };
        if (!token) {
          throw new Error("No token returned by the server.");
        }

        // 3. Initialize Web Audio mixer & combined recorder
        setStatusDetail("Initializing Web Audio mixer and dual-recording pipeline…");
        const mixer = new AudioMixer();
        await mixer.initialize(micStream);
        mixer.startRecording();
        audioMixerRef.current = mixer;

        // 4. Initialize Google Gen AI client with ephemeral token
        setStatusDetail("Connecting to Gemini Live WebSocket…");
        const ai = new GoogleGenAI({
          apiKey: token,
          httpOptions: { apiVersion: "v1alpha" },
        });

        // 5. Establish WebSocket live connection
        const session = await ai.live.connect({
          model,
          callbacks: {
            onopen: () => {
              // Successfully connected!
              setStatus("active");
              setStatusDetail("Live Call in progress");

              // Start elapsed timer
              timerRef.current = setInterval(() => {
                setElapsedSeconds((s) => s + 1);
              }, 1000);

              // Trigger initial AI salesperson greeting
              try {
                session.sendClientContent({
                  turns: [
                    {
                      role: "user",
                      parts: [
                        {
                          text: `[SYSTEM_EVENT: The call is now live with prospect ${
                            customer.name || "the prospect"
                          }${
                            customer.company ? ` from ${customer.company}` : ""
                          }. Please warmly introduce yourself as the AI sales assistant for ${
                            product.name
                          } and begin the conversation.]`,
                        },
                      ],
                    },
                  ],
                  turnComplete: true,
                });
              } catch (sendErr) {
                console.warn("Failed to trigger initial greeting:", sendErr);
              }
            },
            onmessage: (msg: LiveServerMessage) => {
              // A. Interruption: user spoke over the AI
              if (msg.serverContent?.interrupted) {
                mixer.interrupt();
              }

              // B. Model audio output chunks
              if (msg.serverContent?.modelTurn?.parts) {
                for (const part of msg.serverContent.modelTurn.parts) {
                  if (part.inlineData?.data) {
                    // Gemini Live audio is 24kHz 16-bit linear PCM
                    mixer.scheduleAIChunk(part.inlineData.data, 24000);
                  }
                }
              }

              // C. Customer speech transcription
              if (msg.serverContent?.inputTranscription?.text) {
                handleCustomerTranscription(
                  msg.serverContent.inputTranscription.text,
                  msg.serverContent.inputTranscription.finished
                );
              } else if (msg.serverContent?.interimInputTranscription?.text) {
                handleCustomerTranscription(
                  msg.serverContent.interimInputTranscription.text,
                  false
                );
              }

              // D. AI speech transcription
              if (msg.serverContent?.outputTranscription?.text) {
                handleAiTranscription(
                  msg.serverContent.outputTranscription.text,
                  msg.serverContent.outputTranscription.finished
                );
              }
            },
            onerror: (evt: unknown) => {
              console.error("Gemini Live session error:", evt);
              setError("Live session disconnected unexpectedly.");
              setStatus("error");
              setStatusDetail("Connection Error");
              void cleanupResources();
            },
            onclose: () => {
              if (statusRef.current === "active") {
                setStatus("ended");
                setStatusDetail("Call Ended");
                void cleanupResources().then((rec) => {
                  if (rec) setRecording(rec);
                });
              }
            },
          },
          config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        });

        sessionRef.current = session;

        // 6. Connect microphone PCM stream to Gemini Live realtime input
        mixer.onMicrophoneData((base64PCM16k) => {
          try {
            session.sendRealtimeInput({
              audio: {
                mimeType: "audio/pcm;rate=16000",
                data: base64PCM16k,
              },
            });
          } catch {
            // Session may be closing
          }
        });
      } catch (err: unknown) {
        console.error("Failed to start Live Call:", err);
        const e = err as { name?: string; message?: string };
        let msg = e.message || "Failed to start call.";

        if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
          msg =
            "Microphone permission was denied. Please allow microphone access in your browser settings to use VoicePilot.";
        } else if (e.name === "NotFoundError" || e.name === "DevicesNotFoundError") {
          msg = "No microphone was found on this device. Please connect a microphone to continue.";
        }

        setError(msg);
        setStatus("error");
        setStatusDetail("Call Failed");

        if (micStream) {
          micStream.getTracks().forEach((t) => t.stop());
        }
        void cleanupResources();
      }
    },
    [cleanupResources, handleAiTranscription, handleCustomerTranscription]
  );

  /**
   * End an active call cleanly and finalize recording
   */
  const endCall = useCallback(async () => {
    setStatus("ended");
    setStatusDetail("Call Ended");
    const rec = await cleanupResources();
    if (rec) {
      setRecording(rec);
    }
  }, [cleanupResources]);

  /**
   * Toggle microphone mute
   */
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (audioMixerRef.current) {
        audioMixerRef.current.setMuted(next);
      }
      return next;
    });
  }, []);

  /**
   * Reset workspace to ready state
   */
  const resetCall = useCallback(() => {
    void cleanupResources();
    setStatus("idle");
    setStatusDetail("Ready");
    setError(null);
    setTranscript([]);
    setElapsedSeconds(0);
    setIsMuted(false);
    setRecording(null);
  }, [cleanupResources]);

  return {
    status,
    statusDetail,
    error,
    transcript,
    elapsedSeconds,
    isMuted,
    recording,
    startCall,
    endCall,
    toggleMute,
    resetCall,
    clearError: () => setError(null),
  };
}
