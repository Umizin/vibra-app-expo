import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { View } from 'react-native';

import { MiniPlayer } from '@/components/MiniPlayer';
import { useAuth } from '@/contexts/AuthContext';
import { usePreferencias } from '@/contexts/PreferenciasContext';
import { useTema } from '@/contexts/TemaContext';

export default function LayoutDeAbas() {
  const { usuario } = useAuth();
  const { onboardingFeito } = usePreferencias();
  const { cores } = useTema();

  if (!usuario) {
    return <Redirect href="/login" />;
  }

  if (!onboardingFeito) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: cores.destaque,
          tabBarInactiveTintColor: cores.textoSecundario,
          tabBarStyle: { backgroundColor: cores.superficie, borderTopColor: cores.borda },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Início',
            tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="buscar"
          options={{
            title: 'Buscar',
            tabBarIcon: ({ color, size }) => <Ionicons name="search" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="biblioteca"
          options={{
            title: 'Biblioteca',
            tabBarIcon: ({ color, size }) => <Ionicons name="library" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="perfil"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
          }}
        />
      </Tabs>
      <MiniPlayer />
    </View>
  );
}
