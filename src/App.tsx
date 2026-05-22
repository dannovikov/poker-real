import { useState } from 'react';
import { LandingScreen } from './components/LandingScreen';
import { GameTable } from './components/GameTable';
import './styles/casino.css';

type Screen = 'landing' | 'game';

function App() {
  const [screen, setScreen] = useState<Screen>('landing');

  return (
    <>
      {screen === 'landing' && (
        <LandingScreen onSitDown={() => setScreen('game')} />
      )}
      {screen === 'game' && <GameTable />}
    </>
  );
}

export default App;
