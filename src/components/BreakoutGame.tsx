
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

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  destroyed: boolean;
}

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PADDLE_WIDTH = 120;
const PADDLE_HEIGHT = 15;
const BALL_RADIUS = 8;
const BRICK_ROWS = 5;
const BRICK_COLS = 10;
const BRICK_WIDTH = 75;
const BRICK_HEIGHT = 25;
const BRICK_PADDING = 5;

const BRICK_COLORS = [
  'brick-red',
  'brick-orange', 
  'brick-yellow',
  'brick-green',
  'brick-blue'
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
  
  const ballRef = useRef<Ball>({
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT - 50,
    dx: 2.5,
    dy: -2.5,
    radius: BALL_RADIUS
  });
  
  const paddleRef = useRef<Paddle>({
    x: GAME_WIDTH / 2 - PADDLE_WIDTH / 2,
    y: GAME_HEIGHT - 30,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT
  });
  
  const bricksRef = useRef<Brick[]>([]);
  const animationRef = useRef<number>();
  const mouseXRef = useRef<number>(GAME_WIDTH / 2);
  const mouseYRef = useRef<number>(GAME_HEIGHT - 30);

  // Initialize bricks
  const initializeBricks = useCallback(() => {
    const bricks: Brick[] = [];
    const startX = (GAME_WIDTH - (BRICK_COLS * (BRICK_WIDTH + BRICK_PADDING) - BRICK_PADDING)) / 2;
    const startY = 50;
    
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        bricks.push({
          x: startX + col * (BRICK_WIDTH + BRICK_PADDING),
          y: startY + row * (BRICK_HEIGHT + BRICK_PADDING),
          width: BRICK_WIDTH,
          height: BRICK_HEIGHT,
          color: BRICK_COLORS[row],
          destroyed: false
        });
      }
    }
    bricksRef.current = bricks;
  }, []);

  // Collision detection
  const checkBallPaddleCollision = (ball: Ball, paddle: Paddle): boolean => {
    return ball.x + ball.radius > paddle.x &&
           ball.x - ball.radius < paddle.x + paddle.width &&
           ball.y + ball.radius > paddle.y &&
           ball.y - ball.radius < paddle.y + paddle.height;
  };

  const checkBallBrickCollision = (ball: Ball, brick: Brick): boolean => {
    if (brick.destroyed) return false;
    
    return ball.x + ball.radius > brick.x &&
           ball.x - ball.radius < brick.x + brick.width &&
           ball.y + ball.radius > brick.y &&
           ball.y - ball.radius < brick.y + brick.height;
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
    const bricks = bricksRef.current;

    // Update paddle position to follow mouse cursor
    paddle.x = Math.max(0, Math.min(GAME_WIDTH - paddle.width, mouseXRef.current - paddle.width / 2));
    paddle.y = Math.max(0, Math.min(GAME_HEIGHT - paddle.height, mouseYRef.current - paddle.height / 2));

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

    // Ball attachment logic
    if (ballAttached) {
      ball.x = paddle.x + paddle.width / 2;
      ball.y = paddle.y - ball.radius - 5;
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
      ball.dy = -Math.abs(ball.dy);
      // Add angle based on where ball hits paddle
      const hitPosition = (ball.x - paddle.x) / paddle.width - 0.5;
      ball.dx += hitPosition * 3;
      // Limit ball speed
      const speed = Math.sqrt(ball.dx ** 2 + ball.dy ** 2);
      if (speed > 8) {
        ball.dx = (ball.dx / speed) * 8;
        ball.dy = (ball.dy / speed) * 8;
      }
    }

    // Ball collision with bricks
    for (const brick of bricks) {
      if (checkBallBrickCollision(ball, brick)) {
        brick.destroyed = true;
        ball.dy = -ball.dy;
        setScore(prev => prev + 10);
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
          ball.y = paddle.y - ball.radius - 5;
          ball.dx = 2.5;
          ball.dy = -2.5;
        }
        return newLives;
      });
    }

    // Check for win condition
    const remainingBricks = bricks.filter(brick => !brick.destroyed);
    if (remainingBricks.length === 0) {
      setGameState('won');
      toast({
        title: "Congratulations!",
        description: `You won! Final Score: ${score}`,
      });
    }

    // Render game
    ctx.fillStyle = getComputedColor('--game-bg');
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw bricks
    bricks.forEach(brick => {
      if (!brick.destroyed) {
        ctx.fillStyle = getComputedColor(`--${brick.color}`);
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
        
        // Add brick highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(brick.x, brick.y, brick.width, 3);
      }
    });

    // Draw paddle with gradient effect
    const paddleGradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.height);
    paddleGradient.addColorStop(0, getComputedColor('--primary'));
    paddleGradient.addColorStop(1, getComputedColorWithAlpha('--primary', 0.8));
    ctx.fillStyle = paddleGradient;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);

    // Draw ball with glow effect and warp animation
    if (warpEffect.active) {
      ctx.save();
      ctx.globalAlpha = warpEffect.opacity;
      ctx.translate(ball.x, ball.y);
      ctx.scale(warpEffect.scale, warpEffect.scale);
      ctx.translate(-ball.x, -ball.y);
    }

    const ballGradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.radius);
    ballGradient.addColorStop(0, getComputedColor('--ball'));
    ballGradient.addColorStop(1, getComputedColorWithAlpha('--ball', 0.6));
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

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, score, toast]);

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
    if (ballAttached && gameState === 'playing') {
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
    ballRef.current = {
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT - 50,
      dx: 2.5,
      dy: -2.5,
      radius: BALL_RADIUS
    };
    initializeBricks();
  };

  const pauseGame = () => {
    setGameState(prev => prev === 'playing' ? 'paused' : 'playing');
  };

  // Initialize game
  useEffect(() => {
    initializeBricks();
    startGame();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [initializeBricks]);

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
        <p>Move your mouse to control the paddle. Hit the ball to destroy all bricks!</p>
        <p className="mt-2">Different colored bricks may have special properties in future updates.</p>
      </div>
    </div>
  );
};

export default BreakoutGame;
