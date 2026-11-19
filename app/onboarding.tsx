import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotaoPrimario } from '@/components/BotaoPrimario';
import { Genero, generos } from '@/constants/generos';
import { usePreferencias } from '@/contexts/PreferenciasContext';
import { useTema } from '@/contexts/TemaContext';

export default function TelaDeOnboarding() {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { editar } = useLocalSearchParams<{ editar?: string }>();
  const { generos: salvos, salvarGeneros } = usePreferencias();
  const [selecionados, setSelecionados] = useState<Genero[]>(salvos);
  const [salvando, setSalvando] = useState(false);

  function alternar(genero: Genero) {
    setSelecionados((atuais) =>
      atuais.includes(genero) ? atuais.filter((item) => item !== genero) : [...atuais, genero]
    );
  }

  async function concluir(escolha: Genero[]) {
    setSalvando(true);
    await salvarGeneros(escolha);
    if (editar) router.back();
    else router.replace('/(tabs)');
  }

  return (
    <View style={[estilos.container, { backgroundColor: cores.fundo, paddingTop: insets.top + 48 }]}>
      <Text style={[estilos.titulo, { color: cores.texto }]}>Monte sua vibe</Text>
      <Text style={[estilos.subtitulo, { color: cores.textoSecundario }]}>
        Escolha os estilos que combinam com você. Dá para mudar depois no perfil.
      </Text>

      <View style={estilos.chips}>
        {generos.map((genero) => {
          const ativo = selecionados.includes(genero);
          return (
            <Pressable
              key={genero}
              onPress={() => alternar(genero)}
              style={[
                estilos.chip,
                {
                  borderColor: ativo ? cores.destaque : cores.borda,
                  backgroundColor: ativo ? cores.destaque : cores.superficie,
                },
              ]}
            >
              <Text style={[estilos.textoChip, { color: ativo ? '#121212' : cores.texto }]}>{genero}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[estilos.rodape, { paddingBottom: insets.bottom + 24 }]}>
        <BotaoPrimario
          titulo="Continuar"
          aoPressionar={() => concluir(selecionados)}
          desabilitado={selecionados.length === 0}
          carregando={salvando}
        />
        {!editar && (
          <Pressable onPress={() => concluir([])} hitSlop={12}>
            <Text style={[estilos.pular, { color: cores.textoSecundario }]}>Pular por enquanto</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  titulo: { fontSize: 32, fontWeight: '800' },
  subtitulo: { fontSize: 15, marginTop: 8, marginBottom: 32, lineHeight: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  chip: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, borderWidth: 1 },
  textoChip: { fontSize: 15, fontWeight: '700' },
  rodape: { marginTop: 'auto', gap: 20, alignItems: 'stretch' },
  pular: { textAlign: 'center', fontSize: 14, fontWeight: '600' },
});
