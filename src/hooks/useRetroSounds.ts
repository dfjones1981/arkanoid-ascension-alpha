import { useCallback, useRef } from 'react';
import * as Tone from 'tone';

export const useRetroSounds = () => {
  const synthRef = useRef<Tone.Synth | null>(null);
  const isInitialized = useRef(false);

  const initializeSynth = useCallback(async () => {
    if (isInitialized.current) return;
    
    try {
      await Tone.start();
      synthRef.current = new Tone.Synth({
        oscillator: {
          type: "sawtooth"
        },
        envelope: {
          attack: 0.01,
          decay: 0.1,
          sustain: 0.3,
          release: 0.1
        }
      }).toDestination();
      
      isInitialized.current = true;
    } catch (error) {
      console.warn('Audio initialization failed:', error);
    }
  }, []);

  const playWallHit = useCallback(async () => {
    await initializeSynth();
    if (!synthRef.current) return;
    
    try {
      // Sharp, high-pitched blip for wall collision
      synthRef.current.triggerAttackRelease("C6", "32n");
    } catch (error) {
      console.warn('Wall hit sound failed:', error);
    }
  }, [initializeSynth]);

  const playPaddleHit = useCallback(async () => {
    await initializeSynth();
    if (!synthRef.current) return;
    
    try {
      // Deeper, more resonant hit for paddle
      synthRef.current.triggerAttackRelease("G4", "16n");
      // Add a quick harmonic
      setTimeout(() => {
        synthRef.current?.triggerAttackRelease("G5", "32n");
      }, 50);
    } catch (error) {
      console.warn('Paddle hit sound failed:', error);
    }
  }, [initializeSynth]);

  const playInvaderDestroyed = useCallback(async () => {
    await initializeSynth();
    if (!synthRef.current) return;
    
    try {
      // Classic arcade explosion sound - descending pitch
      const notes = ["C5", "A4", "F4", "D4"];
      notes.forEach((note, index) => {
        setTimeout(() => {
          synthRef.current?.triggerAttackRelease(note, "32n");
        }, index * 30);
      });
    } catch (error) {
      console.warn('Invader destroyed sound failed:', error);
    }
  }, [initializeSynth]);

  const playInvaderMove = useCallback(async () => {
    await initializeSynth();
    if (!synthRef.current) return;
    
    try {
      // Classic Space Invaders march sound - alternating low tones
      const isEvenStep = Math.random() > 0.5;
      const note = isEvenStep ? "E2" : "C2";
      synthRef.current.triggerAttackRelease(note, "8n");
    } catch (error) {
      console.warn('Invader move sound failed:', error);
    }
  }, [initializeSynth]);

  return {
    playWallHit,
    playPaddleHit,
    playInvaderDestroyed,
    playInvaderMove
  };
};