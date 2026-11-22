import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotaoPrimario } from '@/components/BotaoPrimario';
import { corSobreHumor, Humor, humores } from '@/constants/humores';
import { usePlayer } from '@/contexts/PlayerContext';
import { catalogoService } from '@/services/catalogoService';
import { embaralhar } from '@/utils/embaralhar';
import { voltarOuIrPara } from '@/utils/navegacao';

export default function TelaDoRadio() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tocarFaixa } = usePlayer();
  const [humor, setHumor] = useState<Humor>(humores[0]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function tocarRadio() {
    setCarregando(true);
    setErro(null);
    try {
      const fila = embaralhar(await catalogoService.buscarPorGeneros(humor.generos));
      if (fila.length === 0) {
        setErro('Nenhuma faixa encontrada para esse humor.');
        return;
      }
      tocarFaixa(fila[0], fila);
      router.push('/player');
    } catch {
      setErro('Não foi possível montar a rádio agora.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <LinearGradient colors={humor.cores} style={[estilos.container, { paddingTop: insets.top + 12 }]}>
      <Pressable onPress={() => voltarOuIrPara(router, '/(tabs)')} hitSlop={12}>
        <Ionicons name="chevron-back" size={26} color={corSobreHumor} />
      </Pressable>

      <Text style={estilos.titulo}>Rádio de Humor</Text>
      <Text style={estilos.subtitulo}>Como você está agora?</Text>

      <View style={estilos.grade}>
        {humores.map((item) => {
          const ativo = item.id === humor.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setHumor(item)}
              style={[estilos.cartao, { backgroundColor: item.cores[0], borderColor: ativo ? corSobreHumor : 'transparent' }]}
            >
              <Ionicons name={item.icone} size={28} color={corSobreHumor} />
              <Text style={estilos.nome}>{item.nome}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[estilos.rodape, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={estilos.generos}>{humor.generos.join(' · ')}</Text>
        {erro && <Text style={estilos.erro}>{erro}</Text>}
        <BotaoPrimario titulo={`Tocar rádio ${humor.nome}`} aoPressionar={tocarRadio} carregando={carregando} />
      </View>
    </LinearGradient>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  titulo: { color: corSobreHumor, fontSize: 30, fontWeight: '900', marginTop: 20 },
  subtitulo: { color: corSobreHumor, opacity: 0.8, fontSize: 15, marginTop: 4, marginBottom: 28 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
  cartao: { width: '48%', height: 110, borderRadius: 16, borderWidth: 2, padding: 16, justifyContent: 'space-between' },
  nome: { color: corSobreHumor, fontSize: 17, fontWeight: '800' },
  rodape: { marginTop: 'auto', gap: 12 },
  generos: { color: corSobreHumor, opacity: 0.8, textAlign: 'center', fontSize: 13 },
  erro: { color: corSobreHumor, textAlign: 'center', fontWeight: '700' },
});
