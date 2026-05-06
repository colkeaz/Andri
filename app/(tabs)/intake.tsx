import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VisualIntakeScreen } from '../../src/screens/VisualIntake';
import { ManualAddScreen } from '../../src/screens/ManualAdd';
import { ReceiptProcessor } from '../../src/screens/ReceiptProcessor';

export default function Page() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; source?: string }>();
  const [view, setView] = useState<'camera' | 'manual' | 'receipt'>('camera');
  const [showManualBack, setShowManualBack] = useState(false);

  useEffect(() => {
    if (params.mode === 'manual') {
      setView('manual');
      setShowManualBack(params.source === 'camera');
    } else if (params.mode === 'receipt') {
      setView('receipt');
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

  if (view === 'receipt') {
    return (
      <ReceiptProcessor
        onBack={() => {
          if (params.source === 'dashboard') {
            router.push('/');
          } else {
            setView('camera');
          }
        }}
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

