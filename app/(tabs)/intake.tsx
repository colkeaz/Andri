import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VisualIntakeScreen } from '../../src/screens/VisualIntake';
import { ManualAddScreen } from '../../src/screens/ManualAdd';

export default function Page() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; source?: string }>();
  const [view, setView] = useState<'camera' | 'manual'>('camera');
  const [showManualBack, setShowManualBack] = useState(false);

  useEffect(() => {
    if (params.mode === 'manual') {
      setView('manual');
      setShowManualBack(params.source === 'camera');
    }
  }, [params.mode, params.source]);

  if (view === 'manual') {
    return (
      <ManualAddScreen
        onComplete={() => setView('camera')}
        onBack={
          showManualBack
            ? () => setView('camera')
            : params.source === 'dashboard'
            ? () => router.push('/')
            : undefined
        }
      />
    );
  }

  return (
    <VisualIntakeScreen
      onSwitchToManual={() => {
        setShowManualBack(true);
        setView('manual');
      }}
    />
  );
}
