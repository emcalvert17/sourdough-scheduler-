import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import BottomNav from './components/BottomNav.jsx';
import AuthScreen from './screens/AuthScreen.jsx';
import BakesScreen from './screens/BakesScreen.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import CalendarScreen from './screens/CalendarScreen.jsx';
import GalleryScreen from './screens/GalleryScreen.jsx';
import ProfileScreen from './screens/ProfileScreen.jsx';
import StarterHealthScreen from './screens/StarterHealthScreen.jsx';
import './App.css';

function AppShell() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('home');

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-logo">StarterSync</div>
        <div className="app-loading-spinner" />
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  return (
    <div className="app">
      <div className="screen-container">
        <BakesScreen active={activeTab === 'bakes'} />
        {activeTab === 'home'    && <HomeScreen onTabChange={setActiveTab} />}
        {activeTab === 'starter' && <StarterHealthScreen />}
        {activeTab === 'gallery' && <GalleryScreen />}
        {activeTab === 'profile' && <ProfileScreen onTabChange={setActiveTab} />}
      </div>
      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
