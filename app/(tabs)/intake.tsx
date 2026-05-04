import React, { useState } from 'react';
import { VisualIntakeScreen } from '../../src/screens/VisualIntake';
import { ManualAddScreen } from '../../src/screens/ManualAdd';

export default function Page() {
  const [view, setView] = useState<'camera' | 'manual'>('camera');

  if (view === 'manual') {
    return <ManualAddScreen onComplete={() => setView('camera')} />;
  }

  return (
    <VisualIntakeScreen onSwitchToManual={() => setView('manual')} />
  );
}
