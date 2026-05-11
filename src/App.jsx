import { useState } from 'react';
import BottomNav from './components/BottomNav.jsx';
import Onboarding from './components/Onboarding.jsx';
import BakesScreen from './screens/BakesScreen.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import CalendarScreen from './screens/CalendarScreen.jsx';
import GalleryScreen from './screens/GalleryScreen.jsx';
import ProfileScreen from './screens/ProfileScreen.jsx';
import { getProfile } from './utils/socialStorage.js';
import './App.css';

export default function App() {
  const [activeTab,   setActiveTab]   = useState('home');
  const [onboarded,   setOnboarded]   = useState(() => !!getProfile());

  if (!onboarded) {
    return (
      <div className="app">
        <Onboarding onComplete={() => setOnboarded(true)} />
      </div>
    );
  }

  return (
    <div className="app">
      <div className="screen-container">
        {/* BakesScreen stays mounted to preserve navigation state */}
        <BakesScreen active={activeTab === 'bakes'} />

        {activeTab === 'home'     && <HomeScreen onTabChange={setActiveTab} />}
        {activeTab === 'calendar' && <CalendarScreen />}
        {activeTab === 'gallery'  && <GalleryScreen />}
        {activeTab === 'profile'  && <ProfileScreen />}
      </div>

      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  );
}
