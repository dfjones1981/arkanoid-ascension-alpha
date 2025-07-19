
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRetroSounds } from '@/hooks/useRetroSounds';

interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
}

interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Invader {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  destroyed: boolean;
  row: number;
  col: number;
  size: 'large' | 'medium' | 'small';
  spawning?: boolean;
  spawnRotation?: number;
  spawnScale?: number;
  targetX?: number;
  targetY?: number;
}

interface Debris {
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
  color: string;
  life: number;
  rotation: number;
  rotationSpeed: number;
}

interface Laser {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PADDLE_WIDTH = 32;
const PADDLE_HEIGHT = 32;
const BALL_RADIUS = 8;
const INVADER_ROWS = 3;
const INVADER_COLS = 12; // Wider formation to fill screen
const LARGE_INVADER_WIDTH = 64;
const LARGE_INVADER_HEIGHT = 48;
const MEDIUM_INVADER_WIDTH = 48;
const MEDIUM_INVADER_HEIGHT = 36;
const SMALL_INVADER_WIDTH = 32;
const SMALL_INVADER_HEIGHT = 24;
const INVADER_PADDING = 4;
const INVADER_SPEED = 0.5;
const INVADER_DROP_SPEED = 16;

const INVADER_COLORS = [
  'brick-purple',
  'brick-blue', 
  'brick-green',
  'brick-orange',
  'brick-yellow'
];

const BreakoutGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const { playWallHit, playPaddleHit, playInvaderDestroyed, playInvaderMove, playDefeat, playGameOver, playVictory, playLaserFire, toggleSound, soundEnabled } = useRetroSounds();
  
  const [gameState, setGameState] = useState<'playing' | 'paused' | 'gameOver' | 'won'>('playing');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [ballAttached, setBallAttached] = useState(true);
  const [explosionEffect, setExplosionEffect] = useState<{active: boolean, particles: Array<{x: number, y: number, dx: number, dy: number, life: number}>}>({active: false, particles: []});
  const [warpEffect, setWarpEffect] = useState<{active: boolean, scale: number, opacity: number}>({active: false, scale: 0, opacity: 0});
  
  // Use refs for all game objects to avoid React re-renders during gameplay
  const [debris, setDebris] = useState<Debris[]>([]);
  const [lasers, setLasers] = useState<Laser[]>([]);
  const debrisRef = useRef<Debris[]>([]);
  const lasersRef = useRef<Laser[]>([]);
  const [invaderFrameCount, setInvaderFrameCount] = useState(0);
  const invaderDirectionRef = useRef<1 | -1>(1);
  const invaderSpeedRef = useRef<number>(15);
  
  // Performance optimization: batch updates
  const pendingStateUpdates = useRef({
    debris: false,
    lasers: false,
    explosion: false,
    lives: false,
    score: false,
    gameState: false
  });
  
  const ballRef = useRef<Ball>({
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT - 50,
    dx: 1.2,
    dy: -1.2,
    radius: BALL_RADIUS
  });
  
  const paddleRef = useRef<Paddle>({
    x: GAME_WIDTH / 2 - PADDLE_WIDTH / 2,
    y: GAME_HEIGHT - 30,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT
  });
  
  const invadersRef = useRef<Invader[]>([]);
  const animationRef = useRef<number>();
  const mouseXRef = useRef<number>(GAME_WIDTH / 2);
  const mouseYRef = useRef<number>(GAME_HEIGHT - 30);
  
  // Cache gradients for performance
  const gradientCacheRef = useRef<Map<string, CanvasGradient>>(new Map());

  // Initialize space invaders
  const initializeInvaders = useCallback(() => {
    const invaders: Invader[] = [];
    const startY = 80;
    
    // Row 0 & 1: 2x2 grid of large invaders in center, fewer medium invaders on sides
    for (let row = 0; row < 2; row++) {
      // Calculate positions for formation with consistent spacing
      const standardSpacing = LARGE_INVADER_WIDTH * 0.5; // Same proportional spacing as other invaders
      const largeGridWidth = 2 * LARGE_INVADER_WIDTH + 1 * standardSpacing;
      const sideMargin = 100; // Adjusted for better symmetry
      const availableWidth = GAME_WIDTH - (2 * sideMargin) - largeGridWidth;
      const mediumsPerSide = 3; // Fixed number for better spacing
      
      // Center the 2x2 large invader grid first
      const largeStartX = (GAME_WIDTH - largeGridWidth) / 2;
      
      // Calculate medium invader positions symmetrically around large formation
      const gapFromLargeInvaders = 40; // Fixed gap between medium and large invaders
      const mediumSpacing = MEDIUM_INVADER_WIDTH + INVADER_PADDING * 1.5;
      const totalMediumWidth = mediumsPerSide * mediumSpacing - INVADER_PADDING * 1.5;
      
      // Left side medium invaders - positioned to the left of large formation
      let currentX = largeStartX - gapFromLargeInvaders - totalMediumWidth;
      for (let i = 0; i < mediumsPerSide; i++) {
        invaders.push({
          x: currentX,
          y: startY + row * (Math.max(LARGE_INVADER_HEIGHT, MEDIUM_INVADER_HEIGHT) + INVADER_PADDING),
          width: MEDIUM_INVADER_WIDTH,
          height: MEDIUM_INVADER_HEIGHT,
          color: INVADER_COLORS[row + 1],
          destroyed: false,
          row,
          col: i,
          size: 'medium'
        });
        currentX += mediumSpacing;
      }
      
      // 2x2 grid of large invaders in center
      
      // 2x2 grid of large invaders in center
      for (let col = 0; col < 2; col++) {
        invaders.push({
          x: largeStartX + col * (LARGE_INVADER_WIDTH + standardSpacing),
          y: startY + row * (Math.max(LARGE_INVADER_HEIGHT, MEDIUM_INVADER_HEIGHT) + INVADER_PADDING),
          width: LARGE_INVADER_WIDTH,
          height: LARGE_INVADER_HEIGHT,
          color: INVADER_COLORS[row],
          destroyed: false,
          row,
          col: mediumsPerSide + col,
          size: 'large'
        });
      }
      
      // Right side medium invaders - positioned symmetrically to left side
      currentX = largeStartX + largeGridWidth + gapFromLargeInvaders;
      for (let i = 0; i < mediumsPerSide; i++) {
        invaders.push({
          x: currentX,
          y: startY + row * (Math.max(LARGE_INVADER_HEIGHT, MEDIUM_INVADER_HEIGHT) + INVADER_PADDING),
          width: MEDIUM_INVADER_WIDTH,
          height: MEDIUM_INVADER_HEIGHT,
          color: INVADER_COLORS[row + 1],
          destroyed: false,
          row,
          col: mediumsPerSide + 2 + i,
          size: 'medium'
        });
        currentX += mediumSpacing;
      }
    }
    
    // Row 2: Exactly 10 small invaders centered and lowered
    const smallRowY = startY + 2 * (Math.max(LARGE_INVADER_HEIGHT, MEDIUM_INVADER_HEIGHT) + INVADER_PADDING) + 30; // Extra spacing to avoid overlap
    const smallsCount = 10; // Fixed number of small invaders
    const smallRowWidth = smallsCount * SMALL_INVADER_WIDTH + (smallsCount - 1) * INVADER_PADDING;
    const smallStartX = (GAME_WIDTH - smallRowWidth) / 2; // Center the row
    
    for (let col = 0; col < smallsCount; col++) {
      invaders.push({
        x: smallStartX + col * (SMALL_INVADER_WIDTH + INVADER_PADDING),
        y: smallRowY,
        width: SMALL_INVADER_WIDTH,
        height: SMALL_INVADER_HEIGHT,
        color: INVADER_COLORS[2],
        destroyed: false,
        row: 2,
        col,
        size: 'small'
      });
    }
    
    invadersRef.current = invaders;
    invaderDirectionRef.current = 1;
    invaderSpeedRef.current = 15; // Reset speed to initial value
    setInvaderFrameCount(0);
  }, []);

  // Collision detection for circular paddle
  const checkBallPaddleCollision = (ball: Ball, paddle: Paddle): boolean => {
    const paddleCenterX = paddle.x + paddle.width / 2;
    const paddleCenterY = paddle.y + paddle.height / 2;
    const paddleRadius = paddle.width / 2; // Use width as diameter
    
    const distanceX = ball.x - paddleCenterX;
    const distanceY = ball.y - paddleCenterY;
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
    
    return distance <= (ball.radius + paddleRadius);
  };

  const checkBallInvaderCollision = (ball: Ball, invader: Invader): boolean => {
    if (invader.destroyed) return false;
    
    return ball.x + ball.radius > invader.x &&
           ball.x - ball.radius < invader.x + invader.width &&
           ball.y + ball.radius > invader.y &&
           ball.y - ball.radius < invader.y + invader.height;
  };

  // Check debris collision with paddle
  const checkDebrisPaddleCollision = (debris: Debris, paddle: Paddle): boolean => {
    return debris.x + debris.size > paddle.x &&
           debris.x - debris.size < paddle.x + paddle.width &&
           debris.y + debris.size > paddle.y &&
           debris.y - debris.size < paddle.y + paddle.height;
  };

  // Check invader collision with paddle
  const checkInvaderPaddleCollision = (invader: Invader, paddle: Paddle): boolean => {
    if (invader.destroyed || invader.spawning) return false;
    
    const paddleCenterX = paddle.x + paddle.width / 2;
    const paddleCenterY = paddle.y + paddle.height / 2;
    const paddleRadius = paddle.width / 2;
    
    // Check if any corner of invader is within paddle radius
    const corners = [
      { x: invader.x, y: invader.y },
      { x: invader.x + invader.width, y: invader.y },
      { x: invader.x, y: invader.y + invader.height },
      { x: invader.x + invader.width, y: invader.y + invader.height }
    ];
    
    return corners.some(corner => {
      const distanceX = corner.x - paddleCenterX;
      const distanceY = corner.y - paddleCenterY;
      const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
      return distance <= paddleRadius;
    });
  };

  // Check laser collision with paddle
  const checkLaserPaddleCollision = (laser: Laser, paddle: Paddle): boolean => {
    return laser.x + laser.width > paddle.x &&
           laser.x < paddle.x + paddle.width &&
           laser.y + laser.height > paddle.y &&
           laser.y < paddle.y + paddle.height;
  };

  // Create debris from destroyed invader
  const createDebris = (invader: Invader): Debris[] => {
    const pieces: Debris[] = [];
    const numPieces = 12;
    
    for (let i = 0; i < numPieces; i++) {
      pieces.push({
        x: invader.x + Math.random() * invader.width,
        y: invader.y + Math.random() * invader.height,
        dx: (Math.random() - 0.5) * 8,
        dy: Math.random() * 4 + 2,
        size: Math.random() * 3 + 1,
        color: invader.color,
        life: 1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3
      });
    }
    
    return pieces;
  };

  // Draw pixelated space invader
  const drawInvader = (ctx: CanvasRenderingContext2D, invader: Invader) => {
    ctx.save();
    
    // Handle spawning animation
    if (invader.spawning) {
      const centerX = invader.x + invader.width / 2;
      const centerY = invader.y + invader.height / 2;
      
      ctx.translate(centerX, centerY);
      ctx.rotate(invader.spawnRotation || 0);
      ctx.scale(invader.spawnScale || 1, invader.spawnScale || 1);
      ctx.translate(-centerX, -centerY);
    }
    
    // Scale pixel size based on invader size
    const basePixelSize = invader.size === 'large' ? 8 : invader.size === 'medium' ? 4 : 2;
    
    const pattern = [
      [0,0,1,0,0,0,0,0,1,0,0],
      [0,0,0,1,0,0,0,1,0,0,0],
      [0,0,1,1,1,1,1,1,1,0,0],
      [0,1,1,0,1,1,1,0,1,1,0],
      [1,1,1,1,1,1,1,1,1,1,1],
      [1,0,1,1,1,1,1,1,1,0,1],
      [1,0,1,0,0,0,0,0,1,0,1],
      [0,0,0,1,1,0,1,1,0,0,0],
    ];
    
    ctx.fillStyle = getComputedColor(`--${invader.color}`);
    
    for (let row = 0; row < pattern.length; row++) {
      for (let col = 0; col < pattern[row].length; col++) {
        if (pattern[row][col]) {
          const x = invader.x + col * basePixelSize;
          const y = invader.y + row * basePixelSize;
          ctx.fillRect(x, y, basePixelSize, basePixelSize);
        }
      }
    }
    
    ctx.restore();
  };

  // Get computed color values for canvas
  const getComputedColor = (cssVar: string): string => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      const value = getComputedStyle(root).getPropertyValue(cssVar).trim();
      return `hsl(${value})`;
    }
    return '#ffffff'; // fallback
  };

  // Convert HSL to HSLA with alpha
  const getComputedColorWithAlpha = (cssVar: string, alpha: number): string => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      const value = getComputedStyle(root).getPropertyValue(cssVar).trim();
      // Convert space-separated HSL to comma-separated for Canvas
      const hslParts = value.split(' ');
      if (hslParts.length === 3) {
        return `hsla(${hslParts[0]}, ${hslParts[1]}, ${hslParts[2]}, ${alpha})`;
      }
    }
    return `rgba(255, 255, 255, ${alpha})`; // fallback
  };

  // Game loop
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || gameState !== 'playing') return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ball = ballRef.current;
    const paddle = paddleRef.current;
    const invaders = invadersRef.current;

    // Update paddle position to follow mouse cursor (limited to lower half)
    paddle.x = Math.max(0, Math.min(GAME_WIDTH - paddle.width, mouseXRef.current - paddle.width / 2));
    paddle.y = Math.max(GAME_HEIGHT / 2, Math.min(GAME_HEIGHT - paddle.height, mouseYRef.current - paddle.height / 2));

    // Update warp effect
    if (warpEffect.active) {
      setWarpEffect(prev => {
        const newScale = Math.min(prev.scale + 0.05, 1);
        const newOpacity = Math.min(prev.opacity + 0.03, 1);
        if (newScale >= 1 && newOpacity >= 1) {
          return { active: false, scale: 1, opacity: 1 };
        }
        return { ...prev, scale: newScale, opacity: newOpacity };
      });
    }

    // Update explosion effect
    if (explosionEffect.active) {
      setExplosionEffect(prev => {
        const updatedParticles = prev.particles.map(particle => ({
          ...particle,
          x: particle.x + particle.dx,
          y: particle.y + particle.dy,
          life: particle.life - 0.02
        })).filter(particle => particle.life > 0);
        
        if (updatedParticles.length === 0) {
          return { active: false, particles: [] };
        }
        return { ...prev, particles: updatedParticles };
      });
    }

    // Update spawning invaders
    invaders.forEach(invader => {
      if (invader.spawning) {
        // Update spawn animation
        if (invader.spawnRotation !== undefined) {
          invader.spawnRotation += 0.15;
        }
        if (invader.spawnScale !== undefined && invader.spawnScale < 1) {
          invader.spawnScale += 0.05;
        }
        
        // Move towards target position
        if (invader.targetX !== undefined && invader.targetY !== undefined) {
          const dx = invader.targetX - invader.x;
          const dy = invader.targetY - invader.y;
          invader.x += dx * 0.1;
          invader.y += dy * 0.1;
          
          // Stop spawning when close to target
          if (Math.abs(dx) < 2 && Math.abs(dy) < 2 && invader.spawnScale >= 0.95) {
            invader.spawning = false;
            invader.spawnRotation = 0;
            invader.spawnScale = 1;
            invader.x = invader.targetX;
            invader.y = invader.targetY;
            delete invader.targetX;
            delete invader.targetY;
          }
        }
      }
    });

    // Simple frame-based invader movement
    setInvaderFrameCount(prev => {
      const newCount = prev + 1;
      
      // Move invaders every 180 frames (3 seconds at 60fps)
      if (newCount >= 180) {
        const activeInvaders = invaders.filter(inv => !inv.destroyed && !inv.spawning);
        
        if (activeInvaders.length > 0) {
          // Check if formation hits edges and determine direction
          const leftMost = Math.min(...activeInvaders.map(inv => inv.x));
          const rightMost = Math.max(...activeInvaders.map(inv => inv.x + inv.width));
          
          console.log('Invader movement - Direction:', invaderDirectionRef.current, 'LeftMost:', leftMost, 'RightMost:', rightMost);
          
          let currentDirection = invaderDirectionRef.current;
          
          // Only change direction if we're actually at the wall and moving towards it
          if (currentDirection === 1 && rightMost + invaderSpeedRef.current >= GAME_WIDTH - 30) {
            currentDirection = -1;
            invaderDirectionRef.current = -1;
            invaderSpeedRef.current += 5; // Increase speed when changing direction
            console.log('Changed direction to LEFT, new speed:', invaderSpeedRef.current);
            // Move all invaders down when changing direction
            activeInvaders.forEach(invader => {
              invader.y += INVADER_DROP_SPEED;
            });
          } else if (currentDirection === -1 && leftMost - invaderSpeedRef.current <= 30) {
            currentDirection = 1;
            invaderDirectionRef.current = 1;
            invaderSpeedRef.current += 5; // Increase speed when changing direction
            console.log('Changed direction to RIGHT, new speed:', invaderSpeedRef.current);
            // Move all invaders down when changing direction
            activeInvaders.forEach(invader => {
              invader.y += INVADER_DROP_SPEED;
            });
          }
          
          // Move all invaders using the current direction and speed
          activeInvaders.forEach(invader => {
            invader.x += currentDirection * invaderSpeedRef.current;
          });
          
          // Play urgent invader movement sound
          playInvaderMove();
        }
        
        return 0; // Reset counter
      }
      
      // Check for laser firing every 30 frames (0.5 seconds) - only one laser at a time
      if (newCount % 30 === 0 && lasersRef.current.length === 0) { // Only fire if no lasers on screen
        const activeInvaders = invaders.filter(inv => !inv.destroyed && !inv.spawning);
        if (activeInvaders.length > 0 && Math.random() < 0.05) { // 5% chance when no lasers exist
          const randomInvader = activeInvaders[Math.floor(Math.random() * activeInvaders.length)];
          const newLaser: Laser = {
            x: randomInvader.x + randomInvader.width / 2 - 2, // Center the 4px wide laser
            y: randomInvader.y + randomInvader.height,
            width: 4,
            height: 12,
            speed: 3
          };
          lasersRef.current = [newLaser]; // Only one laser
          playLaserFire();
        }
      }
      
      return newCount;
    });

    // Update debris physics (use ref for performance)
    debrisRef.current = debrisRef.current.map(piece => {
      // Apply gravity
      piece.dy += 0.3;
      piece.x += piece.dx;
      piece.y += piece.dy;
      piece.rotation += piece.rotationSpeed;
      piece.life -= 0.008;

      // Check collision with paddle
      if (checkDebrisPaddleCollision(piece, paddle)) {
        piece.dy = -Math.abs(piece.dy) * 0.6; // Bounce with some energy loss
        piece.dx *= 0.8; // Apply some friction
        piece.y = paddle.y - piece.size; // Position above paddle
      }

      // Bounce off walls
      if (piece.x <= 0 || piece.x >= GAME_WIDTH) {
        piece.dx = -piece.dx * 0.7;
        piece.x = Math.max(0, Math.min(GAME_WIDTH, piece.x));
      }

      return piece;
    }).filter(piece => piece.life > 0 && piece.y < GAME_HEIGHT + 50);

    // Update lasers (use ref for performance)
    lasersRef.current = lasersRef.current.map(laser => ({
      ...laser,
      y: laser.y + laser.speed
    })).filter(laser => laser.y <= GAME_HEIGHT);

    // Optimized collision detection - early exit and batch processing
    const activeInvaders = invaders.filter(inv => !inv.destroyed && !inv.spawning);
    
    // Check laser-paddle collisions (more efficient)
    for (let i = lasersRef.current.length - 1; i >= 0; i--) {
      const laser = lasersRef.current[i];
      if (checkLaserPaddleCollision(laser, paddle)) {
        // Remove the laser immediately
        lasersRef.current.splice(i, 1);
        
        // Create explosion effect at paddle
        const explosionParticles = [];
        for (let i = 0; i < 20; i++) {
          explosionParticles.push({
            x: paddle.x + paddle.width / 2,
            y: paddle.y + paddle.height / 2,
            dx: (Math.random() - 0.5) * 10,
            dy: (Math.random() - 0.5) * 10,
            life: 1
          });
        }
        setExplosionEffect({ active: true, particles: explosionParticles });
        
        // Lose a life
        setLives(prev => {
          const newLives = prev - 1;
          if (newLives <= 0) {
            setGameState('gameOver');
            playGameOver();
            toast({
              title: "Game Over!",
              description: `Final Score: ${score}`,
              variant: "destructive"
            });
          } else {
            playDefeat();
            // Reset ball and attach to paddle for next life
            setBallAttached(true);
            setWarpEffect({ active: true, scale: 0, opacity: 0 });
            ball.x = paddle.x + paddle.width / 2;
            const paddleRadius = paddle.width / 2;
            ball.y = paddle.y + paddle.height / 2 - paddleRadius - ball.radius;
            ball.dx = 2.5;
            ball.dy = -2.5;
            
            // Clear any remaining lasers
            lasersRef.current = [];
          }
          return newLives;
        });
        break;
      }
    }

    // Check invader-paddle collisions (optimized)
    for (const invader of activeInvaders) {
      if (checkInvaderPaddleCollision(invader, paddle)) {
        // Paddle hit by invader - create explosion and lose life
        const explosionParticles = [];
        for (let i = 0; i < 25; i++) {
          explosionParticles.push({
            x: paddle.x + paddle.width / 2,
            y: paddle.y + paddle.height / 2,
            dx: (Math.random() - 0.5) * 12,
            dy: (Math.random() - 0.5) * 12,
            life: 1
          });
        }
        setExplosionEffect({ active: true, particles: explosionParticles });
        
        setLives(prev => {
          const newLives = prev - 1;
          if (newLives <= 0) {
            setGameState('gameOver');
            playGameOver();
            toast({
              title: "Game Over!",
              description: `Final Score: ${score}`,
              variant: "destructive"
            });
          } else {
            playDefeat();
            // Reset ball and attach to paddle
            setBallAttached(true);
            setWarpEffect({ active: true, scale: 0, opacity: 0 });
            ball.x = paddle.x + paddle.width / 2;
            const paddleRadius = paddle.width / 2;
            ball.y = paddle.y + paddle.height / 2 - paddleRadius - ball.radius;
            ball.dx = 2.5;
            ball.dy = -2.5;
            
            // Clear any remaining lasers
            lasersRef.current = [];
          }
          return newLives;
        });
        break;
      }
      
      // Check if invader reached bottom of screen
      if (invader.y + invader.height >= GAME_HEIGHT) {
        setGameState('gameOver');
        playGameOver();
        toast({
          title: "Invasion Successful!",
          description: "The invaders have reached Earth. Game Over!",
          variant: "destructive"
        });
        break;
      }
    }

    // Batch state updates at the end of frame for performance
    if (debrisRef.current.length !== debris.length) {
      setDebris([...debrisRef.current]);
    }
    if (lasersRef.current.length !== lasers.length) {
      setLasers([...lasersRef.current]);
    }

    // Ball attachment logic
    if (ballAttached) {
      ball.x = paddle.x + paddle.width / 2;
      // Position ball to touch the top of the circular paddle
      const paddleRadius = paddle.width / 2;
      ball.y = paddle.y + paddle.height / 2 - paddleRadius - ball.radius;
      ball.dx = 0;
      ball.dy = 0;
    } else {
      // Update ball position
      ball.x += ball.dx;
      ball.y += ball.dy;
    }

    // Ball collision with walls
    if (ball.x - ball.radius <= 0 || ball.x + ball.radius >= GAME_WIDTH) {
      ball.dx = -ball.dx;
      playWallHit();
    }
    if (ball.y - ball.radius <= 0) {
      ball.dy = -ball.dy;
      playWallHit();
    }

    // Ball collision with paddle
    if (!ballAttached && checkBallPaddleCollision(ball, paddle)) {
      const paddleCenterX = paddle.x + paddle.width / 2;
      const paddleCenterY = paddle.y + paddle.height / 2;
      
      // Calculate collision normal based on circular paddle
      const distanceX = ball.x - paddleCenterX;
      const distanceY = ball.y - paddleCenterY;
      const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
      
      // Normalize the collision normal
      const normalX = distanceX / distance;
      const normalY = distanceY / distance;
      
      // Reflect the ball velocity off the circular surface
      const dotProduct = ball.dx * normalX + ball.dy * normalY;
      ball.dx = ball.dx - 2 * dotProduct * normalX;
      ball.dy = ball.dy - 2 * dotProduct * normalY;
      
      // Ensure ball moves away from paddle
      ball.dy = -Math.abs(ball.dy);
      
      // Play paddle hit sound
      playPaddleHit();
      
      // Limit ball speed
      const speed = Math.sqrt(ball.dx ** 2 + ball.dy ** 2);
      if (speed > 8) {
        ball.dx = (ball.dx / speed) * 8;
        ball.dy = (ball.dy / speed) * 8;
      }
    }

    // Ball collision with invaders
    for (const invader of invaders) {
      if (checkBallInvaderCollision(ball, invader)) {
        invader.destroyed = true;
        ball.dy = -ball.dy;
        
        // Play invader destroyed sound
        playInvaderDestroyed();
        
        // Create explosion effect
        const explosionParticles = [];
        for (let i = 0; i < 20; i++) {
          explosionParticles.push({
            x: invader.x + invader.width / 2,
            y: invader.y + invader.height / 2,
            dx: (Math.random() - 0.5) * 8,
            dy: (Math.random() - 0.5) * 8,
            life: 1
          });
        }
        setExplosionEffect({ active: true, particles: explosionParticles });
        
        // Create debris from destroyed invader
        const newDebris = createDebris(invader);
        debrisRef.current = [...debrisRef.current, ...newDebris];
        
        // Handle invader splitting
        if (invader.size === 'large') {
          // Split into 2 medium invaders with spin animation
          const newInvaders = [];
          const centerX = invader.x + invader.width / 2;
          const centerY = invader.y + invader.height / 2;
          
          // Calculate proper spacing for medium invaders
          const mediumWidth = invader.width / 2;
          const mediumSpacing = mediumWidth + INVADER_PADDING;
          
          for (let i = 0; i < 2; i++) {
            const targetX = invader.x + (i * mediumSpacing);
            const targetY = invader.y;
            
            newInvaders.push({
              x: centerX - mediumWidth / 2, // Start from center
              y: centerY - invader.height / 4,
              width: mediumWidth,
              height: invader.height / 2,
              color: INVADER_COLORS[Math.floor(Math.random() * INVADER_COLORS.length)],
              destroyed: false,
              row: invader.row,
              col: invader.col * 2 + i, // Proper column indexing
              size: 'medium' as const,
              spawning: true,
              spawnRotation: Math.random() * Math.PI * 2,
              spawnScale: 0.1,
              targetX,
              targetY
            });
          }
          invadersRef.current = [...invaders.filter(inv => inv !== invader), ...newInvaders];
        } else if (invader.size === 'medium') {
          // Split into 2 small invaders with spin animation
          const newInvaders = [];
          const centerX = invader.x + invader.width / 2;
          const centerY = invader.y + invader.height / 2;
          
          // Calculate proper spacing for small invaders
          const smallWidth = invader.width / 2;
          const smallSpacing = smallWidth + INVADER_PADDING / 2;
          
          for (let i = 0; i < 2; i++) {
            const targetX = invader.x + (i * smallSpacing);
            const targetY = invader.y;
            
            newInvaders.push({
              x: centerX - smallWidth / 2, // Start from center
              y: centerY - invader.height / 4,
              width: smallWidth,
              height: invader.height / 2,
              color: INVADER_COLORS[Math.floor(Math.random() * INVADER_COLORS.length)],
              destroyed: false,
              row: invader.row,
              col: invader.col * 2 + i, // Proper column indexing
              size: 'small' as const,
              spawning: true,
              spawnRotation: Math.random() * Math.PI * 2,
              spawnScale: 0.1,
              targetX,
              targetY
            });
          }
          invadersRef.current = [...invaders.filter(inv => inv !== invader), ...newInvaders];
        } else if (invader.size === 'small') {
          // Small invaders are just destroyed - increase speed for remaining invaders
          invaderSpeedRef.current += 1; // Speed up slightly with each small invader destroyed
        }
        // Small invaders are just destroyed (no splitting)
        
        setScore(prev => prev + (invader.row + 1) * 10); // Higher rows worth more points
        break;
      }
    }

    // Check for game over conditions  
    if (ball.y > GAME_HEIGHT && !ballAttached) {
      // Create explosion effect
      const particles = [];
      for (let i = 0; i < 15; i++) {
        particles.push({
          x: ball.x,
          y: GAME_HEIGHT,
          dx: (Math.random() - 0.5) * 6,
          dy: (Math.random() - 0.5) * 6,
          life: 1
        });
      }
      setExplosionEffect({ active: true, particles });
      
      setLives(prev => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          setGameState('gameOver');
          playGameOver();
          toast({
            title: "Game Over!",
            description: `Final Score: ${score}`,
            variant: "destructive"
          });
        } else {
          playDefeat();
          // Reset ball and attach to paddle
          setBallAttached(true);
          setWarpEffect({ active: true, scale: 0, opacity: 0 });
          ball.x = paddle.x + paddle.width / 2;
          // Position ball to touch the top of the circular paddle
          const paddleRadius = paddle.width / 2;
          ball.y = paddle.y + paddle.height / 2 - paddleRadius - ball.radius;
          ball.dx = 2.5;
          ball.dy = -2.5;
        }
        return newLives;
      });
    }

    // Check for win condition
    const remainingInvaders = invaders.filter(invader => !invader.destroyed);
    if (remainingInvaders.length === 0) {
      setGameState('won');
      playVictory();
      toast({
        title: "Invasion Defeated!",
        description: `You saved Earth! Final Score: ${score}`,
      });
    }

    // Render game
    ctx.fillStyle = getComputedColor('--game-bg');
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw space invaders (optimized - single pass)
    invaders.forEach(invader => {
      if (!invader.destroyed) {
        drawInvader(ctx, invader);
      }
    });

    // Draw simplified circular paddle (cached gradient)
    const paddleCenterX = paddle.x + paddle.width / 2;
    const paddleCenterY = paddle.y + paddle.height / 2;
    const paddleRadius = paddle.width / 2;
    
    // Use cached gradient or create new one
    const paddleKey = `paddle-${paddleRadius}`;
    let paddleGradient = gradientCacheRef.current.get(paddleKey);
    if (!paddleGradient) {
      paddleGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, paddleRadius);
      paddleGradient.addColorStop(0, getComputedColor('--primary'));
      paddleGradient.addColorStop(1, getComputedColorWithAlpha('--primary', 0.7));
      gradientCacheRef.current.set(paddleKey, paddleGradient);
    }
    
    ctx.save();
    ctx.translate(paddleCenterX, paddleCenterY);
    ctx.fillStyle = paddleGradient;
    ctx.beginPath();
    ctx.arc(0, 0, paddleRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Simple border
    ctx.strokeStyle = getComputedColor('--primary');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, paddleRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Draw simplified ball
    if (warpEffect.active) {
      ctx.save();
      ctx.globalAlpha = warpEffect.opacity;
      ctx.translate(ball.x, ball.y);
      ctx.scale(warpEffect.scale, warpEffect.scale);
      ctx.translate(-ball.x, -ball.y);
    }

    // Simple ball with cached gradient
    const ballKey = `ball-${ball.radius}`;
    let ballGradient = gradientCacheRef.current.get(ballKey);
    if (!ballGradient) {
      ballGradient = ctx.createRadialGradient(-2, -2, 0, 0, 0, ball.radius);
      ballGradient.addColorStop(0, '#ffffff');
      ballGradient.addColorStop(0.7, getComputedColor('--accent'));
      ballGradient.addColorStop(1, getComputedColor('--primary'));
      gradientCacheRef.current.set(ballKey, ballGradient);
    }
    
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.fillStyle = ballGradient;
    ctx.beginPath();
    ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (warpEffect.active) {
      ctx.restore();
    }

    // Draw explosion effect
    if (explosionEffect.active) {
      explosionEffect.particles.forEach(particle => {
        ctx.fillStyle = `rgba(255, 100, 100, ${particle.life})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw falling debris
    debrisRef.current.forEach(piece => {
      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.rotation);
      ctx.globalAlpha = piece.life;
      ctx.fillStyle = getComputedColor(`--${piece.color}`);
      ctx.fillRect(-piece.size/2, -piece.size/2, piece.size, piece.size);
      ctx.restore();
    });

    // Draw lasers (optimized - no glow for performance)
    ctx.fillStyle = getComputedColor('--destructive');
    lasersRef.current.forEach((laser) => {
      ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
    });

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, score, toast, ballAttached, warpEffect, explosionEffect]);

  // Mouse movement handler
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    mouseXRef.current = ((e.clientX - rect.left) / rect.width) * GAME_WIDTH;
    mouseYRef.current = ((e.clientY - rect.top) / rect.height) * GAME_HEIGHT;
  }, []);

  // Mouse click handler for launching ball
  const handleMouseClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    console.log('Mouse click detected, ballAttached:', ballAttached, 'gameState:', gameState);
    if (ballAttached && gameState === 'playing') {
      console.log('Launching ball!');
      setBallAttached(false);
      const ball = ballRef.current;
      ball.dx = 2.5;
      ball.dy = -2.5;
    }
  }, [ballAttached, gameState]);

  // Game controls
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setLives(3);
    setBallAttached(true);
    setExplosionEffect({ active: false, particles: [] });
    setWarpEffect({ active: true, scale: 0, opacity: 0 });
    debrisRef.current = [];
    setDebris([]);
    lasersRef.current = [];
    setLasers([]);
    invaderDirectionRef.current = 1;
    invaderSpeedRef.current = 15; // Reset speed to initial value
    setInvaderFrameCount(0);
    ballRef.current = {
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT - 50,
      dx: 2.5,
      dy: -2.5,
      radius: BALL_RADIUS
    };
    initializeInvaders();
  };

  const pauseGame = () => {
    setGameState(prev => prev === 'playing' ? 'paused' : 'playing');
  };

  // Initialize game
  useEffect(() => {
    initializeInvaders();
    startGame();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [initializeInvaders]);

  // Start game loop
  useEffect(() => {
    if (gameState === 'playing') {
      animationRef.current = requestAnimationFrame(gameLoop);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, gameLoop]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="mb-4 flex items-center gap-6 text-foreground">
        <div className="text-lg font-bold">Score: <span className="text-primary">{score}</span></div>
        <div className="text-lg font-bold">Lives: <span className="text-destructive">{lives}</span></div>
      </div>
      
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          onMouseMove={handleMouseMove}
          onClick={handleMouseClick}
          className="border-2 border-border rounded-lg shadow-2xl cursor-none"
          style={{
            background: 'var(--gradient-game-bg)',
            boxShadow: '0 0 50px hsl(var(--primary) / 0.3)'
          }}
        />
        
        {gameState !== 'playing' && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
            <div className="text-center">
              {gameState === 'paused' && (
                <div>
                  <h2 className="text-2xl font-bold mb-4 text-foreground">Game Paused</h2>
                  <button
                    onClick={pauseGame}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    Resume
                  </button>
                </div>
              )}
              
              {(gameState === 'gameOver' || gameState === 'won') && (
                <div>
                  <h2 className="text-2xl font-bold mb-4 text-foreground">
                    {gameState === 'won' ? 'You Won!' : 'Game Over'}
                  </h2>
                  <p className="mb-4 text-muted-foreground">Final Score: {score}</p>
                  <button
                    onClick={startGame}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    Play Again
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 flex gap-4">
        <button
          onClick={pauseGame}
          disabled={gameState === 'gameOver' || gameState === 'won'}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 disabled:opacity-50"
        >
          {gameState === 'paused' ? 'Resume' : 'Pause'}
        </button>
        
        <button
          onClick={toggleSound}
          className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/90"
        >
          {soundEnabled ? '🔊 Sound On' : '🔇 Sound Off'}
        </button>
        
        <button
          onClick={startGame}
          className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90"
        >
          New Game
        </button>
      </div>
      
      <div className="mt-6 text-center text-sm text-muted-foreground max-w-md">
        <p>Move your mouse to control the paddle. Destroy the invading alien fleet!</p>
        <p className="mt-2">Watch them move in formation - just like the classic arcade game!</p>
      </div>
    </div>
  );
};

export default BreakoutGame;
