import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { personalidadeDe } from '@/constants/generos';
import { useTema } from '@/contexts/TemaContext';
import { useRequisicao } from '@/hooks/useRequisicao';
import { historicoService } from '@/services/historicoService';
import { calcularPulso } from '@/utils/calcularPulso';
import { voltarOuIrPara } from '@/utils/navegacao';

export default function TelaDoPulso() {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const historico = useRequisicao(() => historicoService.listar(), []);

  const pulso = calcularPulso(historico.dado ?? []);
  const personalidade = personalidadeDe(pulso.topGenero);

  const cartoes = [
    { icone: 'time', rotulo: 'Minutos de música', valor: String(pulso.minutos) },
    { icone: 'musical-notes', rotulo: 'Faixas tocadas', valor: String(pulso.reproducoes) },
    { icone: 'mic', rotulo: 'Artista do momento', valor: pulso.topArtista },
    { icone: 'repeat', rotulo: 'Faixa no repeat', valor: pulso.topFaixa },
    { icone: 'sunny', rotulo: 'Você ouve mais de', valor: pulso.periodo },
    { icone: 'disc', rotulo: 'Estilo dominante', valor: pulso.topGenero },
  ] as const;

  return (
    <ScrollView
      style={{ backgroundColor: cores.fundo }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40, paddingHorizontal: 16 }}
    >
      <View style={estilos.cabecalho}>
        <Pressable onPress={() => voltarOuIrPara(router, '/(tabs)/perfil')} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={cores.texto} />
        </Pressable>
        <Text style={[estilos.titulo, { color: cores.texto }]}>Seu Pulso</Text>
      </View>

      {historico.carregando && <ActivityIndicator color={cores.destaque} />}

      {!historico.carregando && pulso.reproducoes === 0 && (
        <Text style={[estilos.vazio, { color: cores.textoSecundario }]}>
          Dê play em algumas faixas para descobrir o seu Pulso.
        </Text>
      )}

      {personalidade && (
        <Animated.View entering={FadeInDown.springify()}>
          <LinearGradient colors={[cores.destaque, cores.superficieElevada]} style={estilos.destaque}>
            <Text style={estilos.rotuloDestaque}>Sua personalidade musical</Text>
            <Text style={estilos.nomeDestaque}>{personalidade.nome}</Text>
            <Text style={estilos.descricaoDestaque}>{personalidade.descricao}</Text>
          </LinearGradient>
        </Animated.View>
      )}

      {pulso.reproducoes > 0 && (
        <View style={estilos.grade}>
          {cartoes.map((cartao, indice) => (
            <Animated.View
              key={cartao.rotulo}
              entering={FadeInDown.delay((indice + 1) * 100).springify()}
              style={[estilos.cartao, { backgroundColor: cores.superficie }]}
            >
              <Ionicons name={cartao.icone} size={22} color={cores.destaque} />
              <Text style={[estilos.valor, { color: cores.texto }]} numberOfLines={1}>
                {cartao.valor ?? '—'}
              </Text>
              <Text style={[estilos.rotulo, { color: cores.textoSecundario }]}>{cartao.rotulo}</Text>
            </Animated.View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  titulo: { fontSize: 20, fontWeight: '800' },
  vazio: { textAlign: 'center', marginTop: 40, fontSize: 14, paddingHorizontal: 24 },
  destaque: { borderRadius: 16, padding: 24, marginBottom: 16 },
  rotuloDestaque: { color: '#121212', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  nomeDestaque: { color: '#121212', fontSize: 30, fontWeight: '900', marginTop: 6 },
  descricaoDestaque: { color: '#121212', fontSize: 14, marginTop: 6 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  cartao: { width: '48.5%', borderRadius: 12, padding: 16, gap: 6 },
  valor: { fontSize: 20, fontWeight: '800', textTransform: 'capitalize' },
  rotulo: { fontSize: 12 },
});
