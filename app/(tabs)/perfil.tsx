import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotaoPrimario } from '@/components/BotaoPrimario';
import { useAuth } from '@/contexts/AuthContext';
import { useTema } from '@/contexts/TemaContext';

const atalhos = [
  { titulo: 'Seu Pulso', rota: '/pulso' },
  { titulo: 'Meus estilos', rota: '/onboarding?editar=1' },
] as const;

export default function TelaDePerfil() {
  const { usuario, sair } = useAuth();
  const { cores, modo, alternarTema } = useTema();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  async function lidarComSair() {
    await sair();
    router.replace('/login');
  }

  return (
    <View style={[estilos.container, { backgroundColor: cores.fundo, paddingTop: insets.top + 24 }]}>
      <Image source={{ uri: usuario?.avatarUrl }} style={estilos.avatar} contentFit="cover" />
      <Text style={[estilos.nome, { color: cores.texto }]}>{usuario?.nome}</Text>
      <Text style={[estilos.email, { color: cores.textoSecundario }]}>{usuario?.email}</Text>

      <View style={[estilos.linhaConfig, { borderColor: cores.borda }]}>
        <Text style={[estilos.rotuloConfig, { color: cores.texto }]}>Tema escuro</Text>
        <Switch
          value={modo === 'escuro'}
          onValueChange={alternarTema}
          trackColor={{ true: cores.destaque, false: cores.borda }}
        />
      </View>

      {atalhos.map((atalho) => (
        <Pressable
          key={atalho.titulo}
          onPress={() => router.push(atalho.rota)}
          style={[estilos.linhaConfig, { borderColor: cores.borda }]}
        >
          <Text style={[estilos.rotuloConfig, { color: cores.texto }]}>{atalho.titulo}</Text>
          <Ionicons name="chevron-forward" size={18} color={cores.textoSecundario} />
        </Pressable>
      ))}

      <View style={estilos.rodape}>
        <BotaoPrimario titulo="Sair da conta" aoPressionar={lidarComSair} />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingHorizontal: 24 },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 16 },
  nome: { fontSize: 20, fontWeight: '800' },
  email: { fontSize: 13, marginTop: 4, marginBottom: 32 },
  linhaConfig: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rotuloConfig: { fontSize: 15, fontWeight: '600' },
  rodape: { marginTop: 'auto', width: '100%', paddingBottom: 32 },
});
