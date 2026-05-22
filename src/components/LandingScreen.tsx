import { audioManager } from '../audio/AudioManager';

interface LandingScreenProps {
  onSitDown: () => void;
}

export function LandingScreen({ onSitDown }: LandingScreenProps) {
  const handleSitDown = () => {
    // Start audio context on user interaction
    audioManager.startAmbience();
    onSitDown();
  };

  // Generate random slot lights
  const slotLights = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    duration: 1.5 + Math.random() * 3,
    delay: Math.random() * 4,
    color: ['#ff6644', '#ffaa44', '#44ff66', '#ff4466'][Math.floor(Math.random() * 4)],
  }));

  return (
    <div className="landing-screen">
      <div className="casino-floor-bg" />
      <div className="haze-overlay" />

      {/* Distant slot machine lights */}
      <div className="slot-lights">
        {slotLights.map(light => (
          <div
            key={light.id}
            className="slot-light"
            style={{
              '--duration': `${light.duration}s`,
              '--delay': `${light.delay}s`,
              background: light.color,
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div className="landing-content">
        <h1 className="landing-title">Poker Real</h1>
        <p className="landing-subtitle">
          Tuesday night. $1/$2 no-limit. The felt is worn, the coffee is bad, and the guy in seat 3 won't stop talking about his divorce.
        </p>
        <button className="sit-down-btn" onClick={handleSitDown}>
          Sit Down
        </button>
      </div>

      <p className="landing-flavor">
        ♠ ♥ ♦ ♣ — The poker room is open. Table 7 has a seat.
      </p>
    </div>
  );
}
