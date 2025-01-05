'use client';

import { createContext, useContext, useRef } from 'react';

type AudioManagerContextType = {
  stopCurrentAudio: () => void;
  setCurrentAudio: (audio: HTMLAudioElement) => void;
};

const AudioManagerContext = createContext<AudioManagerContextType | null>(null);

export function AudioManagerProvider({ children }: { children: React.ReactNode }) {
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopCurrentAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
  };

  const setCurrentAudio = (audio: HTMLAudioElement) => {
    stopCurrentAudio();
    currentAudioRef.current = audio;
  };

  return (
    <AudioManagerContext.Provider value={{ stopCurrentAudio, setCurrentAudio }}>
      {children}
    </AudioManagerContext.Provider>
  );
}

export function useAudioManager() {
  const context = useContext(AudioManagerContext);
  if (!context) {
    throw new Error('useAudioManager must be used within an AudioManagerProvider');
  }
  return context;
} 