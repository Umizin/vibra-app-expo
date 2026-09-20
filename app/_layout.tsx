import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { FavoritosProvider } from '@/contexts/FavoritosContext';
import { PlayerProvider } from '@/contexts/PlayerContext';
import { TemaProvider, useTema } from '@/contexts/TemaContext';

function PilhaDeNavegacao() {
  const { carregandoSessao } = useAuth();
  const { cores } = useTema();

  if (carregandoSessao) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.fundo }}>
        <ActivityIndicator color={cores.destaque} size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.fundo } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="playlist/[id]" />
      <Stack.Screen name="favoritas" />
      <Stack.Screen name="player" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function LayoutRaiz() {
  return (
    <TemaProvider>
      <AuthProvider>
        <FavoritosProvider>
          <PlayerProvider>
            <StatusBar style="light" />
            <PilhaDeNavegacao />
          </PlayerProvider>
        </FavoritosProvider>
      </AuthProvider>
    </TemaProvider>
  );
}
