import { useState, useRef, useCallback } from 'react';

interface TTSOptions {
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
}

const getElevenLabsApiKey = () => localStorage.getItem('elevenLabsApiKey')?.trim() || '';
const getElevenLabsVoiceId = () => localStorage.getItem('elevenLabsVoiceId')?.trim() || '';

export const useTTS = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance>();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const speakElevenLabs = useCallback(async (text: string): Promise<boolean> => {
    const apiKey = getElevenLabsApiKey();
    const voiceId = getElevenLabsVoiceId();
    if (!apiKey || !voiceId) return false;

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          voice_settings: {
            stability: 0.35,
            similarity_boost: 0.75,
          },
        }),
      });

      if (!response.ok) {
        console.warn('ElevenLabs TTS returned error', response.status);
        return false;
      }

      const arrayBuffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'audio/mpeg';
      const blob = new Blob([arrayBuffer], { type: contentType });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        if (audioRef.current && audioRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioRef.current.src);
        }
        audioRef.current = null;
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        if (audioRef.current && audioRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioRef.current.src);
        }
        audioRef.current = null;
      };

      setIsSpeaking(true);
      await audio.play();
      return true;
    } catch (error) {
      console.warn('ElevenLabs TTS failed', error);
      return false;
    }
  }, []);

  const speak = useCallback(async (text: string, options: TTSOptions = {}) => {
    if (isMuted || !text.trim()) return;

    stop();

    const eleventySuccess = await speakElevenLabs(text);
    if (eleventySuccess) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    const voices = speechSynthesis.getVoices();
    const hindiVoice = voices.find(voice =>
      voice.lang.startsWith('hi') || voice.name.toLowerCase().includes('hindi') || voice.name.toLowerCase().includes('india')
    );
    const englishVoice = voices.find(voice =>
      voice.lang.startsWith('en') && voice.name.toLowerCase().includes('male')
    );

    utterance.voice = options.voice || hindiVoice || englishVoice || voices[0];
    utterance.rate = options.rate || 0.95;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 0.9;
    utterance.lang = options.lang || 'hi-IN';

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechSynthesis.speak(utterance);
  }, [isMuted, speakElevenLabs, stop]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      if (!prev) {
        stop();
      }
      return !prev;
    });
  }, [stop]);

  const speakSentence = useCallback((sentence: string) => {
    if (!isMuted && sentence.trim()) {
      speak(sentence, { lang: 'hi-IN' });
    }
  }, [isMuted, speak]);

  return {
    speak,
    stop,
    isSpeaking,
    isMuted,
    toggleMute,
    speakSentence,
  };
};