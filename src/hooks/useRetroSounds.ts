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

  const playDefeat = useCallback(async () => {
    await initializeSynth();
    if (!synthRef.current) return;
    
    try {
      // Sad descending sound for losing a life
      const notes = ["F4", "D4", "B3", "G3"];
      notes.forEach((note, index) => {
        setTimeout(() => {
          synthRef.current?.triggerAttackRelease(note, "8n");
        }, index * 150);
      });
    } catch (error) {
      console.warn('Defeat sound failed:', error);
    }
  }, [initializeSynth]);

  const playGameOver = useCallback(async () => {
    await initializeSynth();
    if (!synthRef.current) return;
    
    try {
      // Big dramatic game over sound - longer descending sequence
      const notes = ["C4", "A3", "F3", "D3", "B2", "G2", "E2", "C2"];
      notes.forEach((note, index) => {
        setTimeout(() => {
          synthRef.current?.triggerAttackRelease(note, "4n");
        }, index * 200);
      });
    } catch (error) {
      console.warn('Game over sound failed:', error);
    }
  }, [initializeSynth]);

  const playVictory = useCallback(async () => {
    await initializeSynth();
    if (!synthRef.current) return;
    
    try {
      // Triumphant ascending victory fanfare
      const notes = ["C4", "E4", "G4", "C5", "E5", "G5", "C6"];
      notes.forEach((note, index) => {
        setTimeout(() => {
          synthRef.current?.triggerAttackRelease(note, "8n");
        }, index * 100);
      });
      
      // Add a final chord after the sequence
      setTimeout(() => {
        synthRef.current?.triggerAttackRelease("C5", "2n");
      }, 800);
    } catch (error) {
      console.warn('Victory sound failed:', error);
    }
  }, [initializeSynth]);

  return {
    playWallHit,
    playPaddleHit,
    playInvaderDestroyed,
    playInvaderMove,
    playDefeat,
    playGameOver,
    playVictory
  };
};