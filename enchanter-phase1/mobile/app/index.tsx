import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { Colors } from '../constants/theme';

export default function Index() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator color={Colors.gold} />
      </View>
    );
  }

  return <Redirect href={session ? '/tabs/map' : '/auth/login'} />;
}
