'use client';

import { useState, useRef, useEffect } from 'react';
import { useAudioManager } from './AudioManager';

type Voice = 'alloy' | 'onyx';

export default function TextToSpeech({ slug }: { slug: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<Voice>('onyx');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { setCurrentAudio } = useAudioManager();

  useEffect(() => {
    // Check if audio file exists
    const audioUrl = `/audio/${slug}-${selectedVoice}.mp3`;
    const audio = new Audio(audioUrl);
    
    audio.addEventListener('loadedmetadata', () => {
      audioRef.current = audio;
    });

    audio.addEventListener('error', () => {
      audioRef.current = null;
    });

    return () => {
      audio.remove();
    };
  }, [slug, selectedVoice]);

  const togglePlayPause = async () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        setCurrentAudio(audioRef.current);
        await audioRef.current.play();
        setIsPlaying(true);
      }
      return;
    }

    // Si pas d'audio chargé, on génère avec la voix actuelle
    setIsLoading(true);
    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slug, voice: selectedVoice }),
      });

      const data = await response.json();
      
      if (data.audioUrl) {
        const audio = new Audio(data.audioUrl);
        audio.addEventListener('ended', () => {
          setIsPlaying(false);
        });
        audioRef.current = audio;
        setCurrentAudio(audio);
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error generating speech:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const changeVoice = () => {
    if (!isPlaying) {
      setSelectedVoice(selectedVoice === 'onyx' ? 'alloy' : 'onyx');
      audioRef.current = null; // Force la régénération avec la nouvelle voix
    }
  };

  const getButtonText = () => {
    if (isLoading) {
      return (
        <>
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-label="Loading">
            <title>Loading...</title>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Generating audio...
        </>
      );
    }
    if (isPlaying) {
      return '⏸️ Pause';
    }
    return selectedVoice === 'onyx' ? '♂️ Écouter' : '♀️ Écouter';
  };

  const getMainButtonClass = () => {
    const baseClass = "flex items-center justify-center gap-2 text-white font-bold py-2 px-6 rounded-l min-w-[140px]";
    if (isPlaying) {
      return `${baseClass} bg-gray-500 hover:bg-gray-700`;
    }
    if (selectedVoice === 'onyx') {
      return `${baseClass} bg-blue-500 hover:bg-blue-700`;
    }
    return `${baseClass} bg-pink-500 hover:bg-pink-700`;
  };

  const getToggleButtonClass = () => {
    const baseClass = "flex items-center justify-center text-white font-bold py-2 px-3 rounded-r w-10";
    return selectedVoice === 'onyx' 
      ? `${baseClass} bg-pink-500 hover:bg-pink-700`
      : `${baseClass} bg-blue-500 hover:bg-blue-700`;
  };

  return (
    <div className="flex justify-center my-4">
      <div className="inline-flex">
        <button
          type="button"
          onClick={togglePlayPause}
          disabled={isLoading}
          className={getMainButtonClass()}
        >
          {getButtonText()}
        </button>
        {!isPlaying && !isLoading && (
          <button
            type="button"
            onClick={changeVoice}
            className={getToggleButtonClass()}
          >
            {selectedVoice === 'onyx' ? '♀️' : '♂️'}
          </button>
        )}
      </div>
    </div>
  );
} 