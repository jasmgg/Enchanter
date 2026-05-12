import { Redirect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import { ONBOARDING_KEY } from './onboarding/index';

type OnboardingState = 'loading' | 'unseen' | 'seen';

export default function Index() {
  const { session, loading: authLoading } = useAuth();
  const [onboarding, setOnboarding] = useState<OnboardingState>('loading');

  useEffect(() => {
    SecureStore.getItemAsync(ONBOARDING_KEY).then((value) => {
      setOnboarding(value === 'true' ? 'seen' : 'unseen');
    });
  }, []);

  if (authLoading || onboarding === 'loading') {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: Colors.bg,
        }}
      >
        <ActivityIndicator color={Colors.gold} />
      </View>
    );
  }

  // Authed users always go straight to the map regardless of onboarding state
  if (session) {
    return <Redirect href="/tabs/map" />;
  }

  // New users see onboarding first
  if (onboarding === 'unseen') {
    return <Redirect href="/onboarding" />;
  }

  // Returning logged-out users go straight to login
  return <Redirect href="/auth/login" />;
}
