/**
 * VoicePilot — Audio PCM Utilities
 *
 * Provides linear PCM conversions, resampling, and base64 encoding/decoding
 * required for the Gemini Live bidirectional audio protocol.
 *
 * Gemini Live expects:
 * - Input: 16,000 Hz, 16-bit linear PCM, mono, little-endian.
 * - Output: Typically 24,000 Hz, 16-bit linear PCM, mono, little-endian.
 */

/**
 * Downsample Float32 audio buffer from inputSampleRate to outputSampleRate (e.g. 48kHz -> 16kHz)
 * using linear interpolation.
 */
export function downsampleBuffer(
  buffer: Float32Array,
  inputSampleRate: number,
  outputSampleRate = 16000
): Float32Array {
  if (inputSampleRate === outputSampleRate) {
    return buffer;
  }
  if (inputSampleRate < outputSampleRate) {
    // If browser input is somehow lower, return buffer as-is
    return buffer;
  }

  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);

  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    // Simple box-filter averaging over the sample window to prevent aliasing
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }

  return result;
}

/**
 * Convert normalized Float32 audio samples (-1.0 to 1.0) to 16-bit signed PCM ArrayBuffer (little-endian).
 */
export function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);

  for (let i = 0; i < float32Array.length; i++) {
    // Clamp to [-1.0, 1.0]
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    // Scale to 16-bit signed integer [-32768, 32767]
    const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(i * 2, int16, true); // true = little-endian
  }

  return buffer;
}

/**
 * Convert base64-encoded 16-bit linear PCM audio chunk into a normalized Float32Array (-1.0 to 1.0).
 */
export function base64ToPCMFloat32(base64: string): Float32Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  // Each 16-bit sample takes 2 bytes
  const numSamples = Math.floor(len / 2);
  const float32 = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const byte1 = binaryString.charCodeAt(i * 2);
    const byte2 = binaryString.charCodeAt(i * 2 + 1);
    // Combine 2 bytes as signed 16-bit little-endian integer
    let int16 = (byte2 << 8) | byte1;
    if (int16 >= 0x8000) {
      int16 -= 0x10000;
    }
    float32[i] = int16 < 0 ? int16 / 0x8000 : int16 / 0x7fff;
  }

  return float32;
}

/**
 * Convert an ArrayBuffer to a standard base64 string.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32KB chunks to avoid call stack limits in String.fromCharCode
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(sub));
  }
  return btoa(binary);
}
