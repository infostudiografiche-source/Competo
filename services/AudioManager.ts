// --- Private module-level variables ---
let audioContext: AudioContext | null = null;
let isSpeaking = false;
const audioQueue: string[] = [];
let audioEnabled = false;

// --- Private Helper Functions ---

function decodeBase64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function isRiffWav(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46    // F
  );
}

async function decodePcmAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, Math.floor(data.byteLength / 2));
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const processQueue = async () => {
    if (isSpeaking || audioQueue.length === 0 || !audioContext) return;

    isSpeaking = true;
    const text = audioQueue.shift();

    if (!text) {
        isSpeaking = false;
        processQueue();
        return;
    }

    try {
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        const response = await fetch('/api/ai/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });

        if (!response.ok) {
            throw new Error(`TTS server error (${response.status})`);
        }

        const data = (await response.json()) as { audioBase64?: string; mimeType?: string };
        const base64Audio = data.audioBase64;

        if (base64Audio) {
            const bytes = decodeBase64ToBytes(base64Audio);
            let buffer: AudioBuffer;

            if (isRiffWav(bytes) || (data.mimeType && data.mimeType.includes('wav'))) {
                const arrayBuffer = bytes.slice().buffer;
                buffer = await audioContext.decodeAudioData(arrayBuffer);
            } else {
                buffer = await decodePcmAudioData(bytes, audioContext, 24000, 1);
            }

            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            source.start();
            source.onended = () => {
                isSpeaking = false;
                processQueue();
            };
        } else {
            isSpeaking = false;
            processQueue();
        }
    } catch (error) {
        console.error("AudioManager: TTS generation failed:", error);
        isSpeaking = false;
        processQueue();
    }
};

// --- Public API ---

/**
 * Initializes the AudioManager. This must be called after a user interaction.
 * @returns {boolean} True if initialization was successful or already initialized, false otherwise.
 */
const initialize = (): boolean => {
    if (audioContext) {
        return true;
    }
    try {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        // Play a silent sound to unlock the audio context on some browsers
        const buffer = context.createBuffer(1, 1, 24000);
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.start(0);
        audioContext = context;
        console.log("AudioManager initialized successfully.");
        return true;
    } catch (e) {
        console.error("AudioManager: Could not initialize AudioContext:", e);
        return false;
    }
};

/**
 * Enables or disables audio playback.
 * @param {boolean} enabled - Whether to enable audio.
 */
const setAudioEnabled = (enabled: boolean) => {
    audioEnabled = enabled;
    if (!enabled) {
        audioQueue.length = 0; // Clear the queue if audio is disabled
    }
};

/**
 * Adds a text announcement to the playback queue.
 * @param {string} text - The text to be spoken.
 */
const playAnnouncement = (text: string) => {
    if (!audioEnabled || !audioContext || !text) return;
    audioQueue.push(text);
    if (!isSpeaking) {
        processQueue();
    }
};

/**
 * Returns whether audio playback is currently enabled.
 * @returns {boolean}
 */
const isAudioEnabled = (): boolean => {
    return audioEnabled;
};

export const AudioManager = {
    initialize,
    setAudioEnabled,
    isAudioEnabled,
    playAnnouncement,
};
