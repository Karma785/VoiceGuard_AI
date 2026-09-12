import { useState } from 'react';
import Onboarding from '@/components/Onboarding';
import Dashboard from '@/components/Dashboard';

export default function App() {
  const [screen, setScreen] = useState<'onboarding' | 'dashboard'>('onboarding');

  if (screen === 'onboarding') {
    return <Onboarding onPermissionGranted={() => setScreen('dashboard')} />;
  }

  return <Dashboard />;
}
