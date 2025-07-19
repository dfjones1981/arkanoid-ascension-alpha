
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

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

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PADDLE_WIDTH = 32;
const PADDLE_HEIGHT = 32;
const BALL_RADIUS = 8;
const INVADER_ROWS = 2;
const INVADER_COLS = 2;
const INVADER_WIDTH = 128; // 4x larger than original 32
const INVADER_HEIGHT = 96; // 4x larger than original 24
const INVADER_PADDING = 8;
const INVADER_SPEED = 0.5;
const INVADER_DROP_SPEED = 16;

const INVADER_COLORS = [
  'destructive',
  'warning', 
  'accent',
  'secondary',
  'primary'
];

const BreakoutGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  
  const [gameState, setGameState] = useState<'playing' | 'paused' | 'gameOver' | 'won'>('playing');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [ballAttached, setBallAttached] = useState(true);
  const [explosionEffect, setExplosionEffect] = useState<{active: boolean, particles: Array<{x: number, y: number, dx: number, dy: number, life: number}>}>({active: false, particles: []});
  const [warpEffect, setWarpEffect] = useState<{active: boolean, scale: number, opacity: number}>({active: false, scale: 0, opacity: 0});
  const [debris, setDebris] = useState<Debris[]>([]);
  const [invaderFrameCount, setInvaderFrameCount] = useState(0);
  const invaderDirectionRef = useRef<1 | -1>(1);
  
  const ballRef = useRef<Ball>({
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT - 50,
    dx: 1.8,
    dy: -1.8,
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

  // Initialize space invaders
  const initializeInvaders = useCallback(() => {
    const invaders: Invader[] = [];
    const startX = (GAME_WIDTH - (INVADER_COLS * (INVADER_WIDTH + INVADER_PADDING) - INVADER_PADDING)) / 2;
    const startY = 80;
    
    for (let row = 0; row < INVADER_ROWS; row++) {
      for (let col = 0; col < INVADER_COLS; col++) {
        invaders.push({
          x: startX + col * (INVADER_WIDTH + INVADER_PADDING),
          y: startY + row * (INVADER_HEIGHT + INVADER_PADDING),
          width: INVADER_WIDTH,
          height: INVADER_HEIGHT,
          color: INVADER_COLORS[row],
          destroyed: false,
          row,
          col,
          size: 'large'
        });
      }
    }
    
    invadersRef.current = invaders;
    invaderDirectionRef.current = 1;
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
      
      // Move invaders every 60 frames (1 second at 60fps)
      if (newCount >= 60) {
        const activeInvaders = invaders.filter(inv => !inv.destroyed && !inv.spawning);
        
        if (activeInvaders.length > 0) {
          // Check if formation hits edges and determine direction
          const leftMost = Math.min(...activeInvaders.map(inv => inv.x));
          const rightMost = Math.max(...activeInvaders.map(inv => inv.x + inv.width));
          
          console.log('Invader movement - Direction:', invaderDirectionRef.current, 'LeftMost:', leftMost, 'RightMost:', rightMost);
          
          let currentDirection = invaderDirectionRef.current;
          
          // Only change direction if we're actually at the wall and moving towards it
          if (currentDirection === 1 && rightMost + 15 >= GAME_WIDTH - 30) {
            currentDirection = -1;
            invaderDirectionRef.current = -1;
            console.log('Changed direction to LEFT');
          } else if (currentDirection === -1 && leftMost - 15 <= 30) {
            currentDirection = 1;
            invaderDirectionRef.current = 1;
            console.log('Changed direction to RIGHT');
          }
          
          // Move all invaders using the current direction
          activeInvaders.forEach(invader => {
            invader.x += currentDirection * 15;
          });
        }
        
        return 0; // Reset counter
      }
      
      return newCount;
    });

    // Update debris physics
    setDebris(prev => {
      return prev.map(piece => {
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
    });

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
    }
    if (ball.y - ball.radius <= 0) {
      ball.dy = -ball.dy;
    }

    // Ball collision with paddle
    if (checkBallPaddleCollision(ball, paddle)) {
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
        setDebris(prev => [...prev, ...newDebris]);
        
        // Handle invader splitting
        if (invader.size === 'large') {
          // Split into 2 medium invaders with spin animation
          const newInvaders = [];
          const centerX = invader.x + invader.width / 2;
          const centerY = invader.y + invader.height / 2;
          
          for (let i = 0; i < 2; i++) {
            const targetX = invader.x + (i * invader.width * 0.8);
            const targetY = invader.y;
            
            newInvaders.push({
              x: centerX - invader.width / 4, // Start from center
              y: centerY - invader.height / 4,
              width: invader.width / 2,
              height: invader.height / 2,
              color: INVADER_COLORS[Math.floor(Math.random() * INVADER_COLORS.length)],
              destroyed: false,
              row: invader.row,
              col: invader.col + i,
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
          
          for (let i = 0; i < 2; i++) {
            const targetX = invader.x + (i * invader.width * 0.9);
            const targetY = invader.y;
            
            newInvaders.push({
              x: centerX - invader.width / 4, // Start from center
              y: centerY - invader.height / 4,
              width: invader.width / 2,
              height: invader.height / 2,
              color: INVADER_COLORS[Math.floor(Math.random() * INVADER_COLORS.length)],
              destroyed: false,
              row: invader.row,
              col: invader.col + i,
              size: 'small' as const,
              spawning: true,
              spawnRotation: Math.random() * Math.PI * 2,
              spawnScale: 0.1,
              targetX,
              targetY
            });
          }
          invadersRef.current = [...invaders.filter(inv => inv !== invader), ...newInvaders];
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
          toast({
            title: "Game Over!",
            description: `Final Score: ${score}`,
            variant: "destructive"
          });
        } else {
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
      toast({
        title: "Invasion Defeated!",
        description: `You saved Earth! Final Score: ${score}`,
      });
    }

    // Render game
    ctx.fillStyle = getComputedColor('--game-bg');
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw space invaders
    invaders.forEach(invader => {
      if (!invader.destroyed) {
        drawInvader(ctx, invader);
        
        // Add subtle glow effect
        ctx.shadowColor = getComputedColor(`--${invader.color}`);
        ctx.shadowBlur = 2;
        drawInvader(ctx, invader);
        ctx.shadowBlur = 0;
      }
    });

    // Draw simplified circular paddle
    const paddleCenterX = paddle.x + paddle.width / 2;
    const paddleCenterY = paddle.y + paddle.height / 2;
    const paddleRadius = paddle.width / 2;
    
    // Simple paddle with basic gradient
    const paddleGradient = ctx.createRadialGradient(paddleCenterX, paddleCenterY, 0, paddleCenterX, paddleCenterY, paddleRadius);
    paddleGradient.addColorStop(0, getComputedColor('--primary'));
    paddleGradient.addColorStop(1, getComputedColorWithAlpha('--primary', 0.7));
    ctx.fillStyle = paddleGradient;
    ctx.beginPath();
    ctx.arc(paddleCenterX, paddleCenterY, paddleRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Simple border
    ctx.strokeStyle = getComputedColor('--primary');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(paddleCenterX, paddleCenterY, paddleRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw simplified ball
    if (warpEffect.active) {
      ctx.save();
      ctx.globalAlpha = warpEffect.opacity;
      ctx.translate(ball.x, ball.y);
      ctx.scale(warpEffect.scale, warpEffect.scale);
      ctx.translate(-ball.x, -ball.y);
    }

    // Simple ball with basic gradient
    const ballGradient = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 0, ball.x, ball.y, ball.radius);
    ballGradient.addColorStop(0, '#ffffff');
    ballGradient.addColorStop(0.7, getComputedColor('--accent'));
    ballGradient.addColorStop(1, getComputedColor('--primary'));
    ctx.fillStyle = ballGradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

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
    debris.forEach(piece => {
      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.rotation);
      ctx.globalAlpha = piece.life;
      ctx.fillStyle = getComputedColor(`--${piece.color}`);
      ctx.fillRect(-piece.size/2, -piece.size/2, piece.size, piece.size);
      ctx.restore();
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
    setDebris([]);
    invaderDirectionRef.current = 1;
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
