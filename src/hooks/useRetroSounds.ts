import { useCallback, useRef, useState } from 'react';
import * as Tone from 'tone';

export const useRetroSounds = () => {
  const synthRef = useRef<Tone.Synth | null>(null);
  const isInitialized = useRef(false);
  const invaderMoveToggle = useRef(false);
  const lastLaserFireTime = useRef(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

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
    console.log('playWallHit called, soundEnabled:', soundEnabled);
    if (!soundEnabled) return;
    await initializeSynth();
    if (!synthRef.current) return;
    
    try {
      // Sharp, high-pitched blip for wall collision
      synthRef.current.triggerAttackRelease("C6", "32n");
    } catch (error) {
      console.warn('Wall hit sound failed:', error);
    }
  }, [initializeSynth, soundEnabled]);

  const playPaddleHit = useCallback(async () => {
    console.log('playPaddleHit called, soundEnabled:', soundEnabled);
    if (!soundEnabled) return;
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
  }, [initializeSynth, soundEnabled]);

  const playInvaderDestroyed = useCallback(async () => {
    if (!soundEnabled) return;
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
  }, [initializeSynth, soundEnabled]);

  const playInvaderMove = useCallback(async () => {
    if (!soundEnabled) return;
    await initializeSynth();
    if (!synthRef.current) return;
    
    try {
      // Alternate between two deep bass notes for classic Space Invaders march
      invaderMoveToggle.current = !invaderMoveToggle.current;
      const note = invaderMoveToggle.current ? "D1" : "F#1";
      synthRef.current.triggerAttackRelease(note, "4n");
    } catch (error) {
      console.warn('Invader move sound failed:', error);
    }
  }, [initializeSynth, soundEnabled]);

  const playDefeat = useCallback(async () => {
    if (!soundEnabled) return;
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
  }, [initializeSynth, soundEnabled]);

  const playGameOver = useCallback(async () => {
    if (!soundEnabled) return;
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
  }, [initializeSynth, soundEnabled]);

  const playVictory = useCallback(async () => {
    if (!soundEnabled) return;
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
  }, [initializeSynth, soundEnabled]);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      console.log('Sound toggle - was:', prev, 'now will be:', !prev);
      return !prev;
    });
  }, []);

  const playLaserFire = useCallback(async () => {
    console.log('playLaserFire called, soundEnabled:', soundEnabled);
    if (!soundEnabled) return;
    
    // Throttle laser fire sounds to prevent timing conflicts (max one every 150ms)
    const now = Date.now();
    if (now - lastLaserFireTime.current < 150) return;
    lastLaserFireTime.current = now;
    
    await initializeSynth();
    if (!synthRef.current) return;
    
    try {
      // Simple single note laser sound to avoid timing conflicts
      synthRef.current.triggerAttackRelease("A5", "64n");
    } catch (error) {
      console.warn('Laser fire sound failed:', error);
    }
  }, [initializeSynth, soundEnabled]);

  const playIntroMusic = useCallback(async () => {
    if (!soundEnabled) return;
    try {
      await initializeSynth();
      if (!synthRef.current) return;
      
      // Epic intro theme with Space Invaders inspired melody
      const introTheme = [
        { note: 'E3', duration: 0.4 },
        { note: 'E3', duration: 0.4 },
        { note: 'E3', duration: 0.4 },
        { note: 'C3', duration: 0.3 },
        { note: 'E3', duration: 0.4 },
        { note: 'G3', duration: 0.8 },
        { note: 'G2', duration: 0.8 },
        { note: 'C3', duration: 0.6 },
        { note: 'G2', duration: 0.4 },
        { note: 'E2', duration: 0.6 },
        { note: 'A2', duration: 0.4 },
        { note: 'B2', duration: 0.4 },
        { note: 'Bb2', duration: 0.3 },
        { note: 'A2', duration: 0.4 },
        { note: 'G2', duration: 0.3 },
        { note: 'E3', duration: 0.3 },
        { note: 'G3', duration: 0.3 },
        { note: 'A3', duration: 0.4 },
        { note: 'F3', duration: 0.3 },
        { note: 'G3', duration: 0.3 },
        { note: 'E3', duration: 0.4 },
        { note: 'C3', duration: 0.3 },
        { note: 'D3', duration: 0.3 },
        { note: 'B2', duration: 0.6 }
      ];
      
      let delay = 0;
      introTheme.forEach(({ note, duration }) => {
        setTimeout(() => {
          synthRef.current?.triggerAttackRelease(note, duration);
        }, delay * 300);
        delay++;
      });
    } catch (error) {
      console.error('Error playing intro music:', error);
    }
  }, [initializeSynth, soundEnabled]);

  return {
    playWallHit,
    playPaddleHit,
    playInvaderDestroyed,
    playInvaderMove,
    playDefeat,
    playGameOver,
    playVictory,
    playLaserFire,
    playIntroMusic,
    toggleSound,
    soundEnabled
  };
};