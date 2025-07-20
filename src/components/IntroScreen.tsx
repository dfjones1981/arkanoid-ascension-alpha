import { useEffect } from 'react';
import introHero from '@/assets/intro-hero.jpg';

interface IntroScreenProps {
  onStart: () => void;
  playIntroMusic: () => void;
}

const IntroScreen = ({ onStart, playIntroMusic }: IntroScreenProps) => {
  // Removed intro music - no longer playing automatically

  const handleClick = () => {
    onStart();
  };

  return (
    <div 
      className="w-full h-screen bg-background flex flex-col items-center justify-center relative cursor-pointer overflow-hidden"
      onClick={handleClick}
    >
      {/* Hero Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={introHero} 
          alt="Space Battle" 
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/40 to-background/80" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 text-center animate-fade-in">
        {/* Game Title */}
        <h1 className="text-8xl md:text-9xl font-bold mb-8 text-foreground drop-shadow-2xl">
          <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-pulse">
            ARKAN
          </span>
          <br />
          <span className="bg-gradient-to-r from-accent via-primary to-accent bg-clip-text text-transparent animate-pulse">
            INVADERS
          </span>
        </h1>
        
        {/* Subtitle */}
        <p className="text-2xl md:text-3xl text-muted-foreground mb-12 font-semibold drop-shadow-lg">
          DEFEND EARTH FROM THE ALIEN INVASION
        </p>
        
        {/* Start Instructions */}
        <div className="animate-pulse">
          <p className="text-xl md:text-2xl text-primary font-bold mb-4 drop-shadow-lg">
            CLICK TO START MISSION
          </p>
          <div className="flex justify-center items-center gap-2">
            <div className="w-3 h-3 bg-primary rounded-full animate-ping" />
            <div className="w-3 h-3 bg-accent rounded-full animate-ping animation-delay-75" />
            <div className="w-3 h-3 bg-primary rounded-full animate-ping animation-delay-150" />
          </div>
        </div>
      </div>
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 z-5">
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary rounded-full animate-pulse opacity-60"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${1 + Math.random()}s`
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default IntroScreen;