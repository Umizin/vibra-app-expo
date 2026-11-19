import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { FavoritosProvider } from '@/contexts/FavoritosContext';
import { PlayerProvider } from '@/contexts/PlayerContext';
import { PreferenciasProvider, usePreferencias } from '@/contexts/PreferenciasContext';
import { TemaProvider, useTema } from '@/contexts/TemaContext';
import { TimerProvider } from '@/contexts/TimerContext';

function PilhaDeNavegacao() {
  const { carregandoSessao } = useAuth();
  const { carregandoPreferencias } = usePreferencias();
  const { cores } = useTema();

  if (carregandoSessao || carregandoPreferencias) {
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
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="playlist/[id]" />
      <Stack.Screen name="favoritas" />
      <Stack.Screen name="player" options={{ presentation: 'modal' }} />
      <Stack.Screen name="fila" />
      <Stack.Screen name="timer" options={{ presentation: 'modal' }} />
      <Stack.Screen name="pulso" />
      <Stack.Screen name="radio" />
    </Stack>
  );
}

export default function LayoutRaiz() {
  return (
    <TemaProvider>
      <AuthProvider>
        <PreferenciasProvider>
          <FavoritosProvider>
            <PlayerProvider>
              <TimerProvider>
                <StatusBar style="light" />
                <PilhaDeNavegacao />
              </TimerProvider>
            </PlayerProvider>
          </FavoritosProvider>
        </PreferenciasProvider>
      </AuthProvider>
    </TemaProvider>
  );
}
