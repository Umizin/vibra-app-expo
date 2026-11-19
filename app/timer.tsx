import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotaoPrimario } from '@/components/BotaoPrimario';
import { useTema } from '@/contexts/TemaContext';
import { useTimer } from '@/contexts/TimerContext';
import { formatarDuracao } from '@/utils/formatarDuracao';

const OPCOES_EM_MINUTOS = [5, 15, 30, 45, 60];

export default function TelaDoTimer() {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { fimEm, iniciarTimer, cancelarTimer } = useTimer();
  const [agora, setAgora] = useState(Date.now());

  useEffect(() => {
    if (!fimEm) return;
    const intervalo = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(intervalo);
  }, [fimEm]);

  const segundosRestantes = fimEm ? Math.max(0, Math.round((fimEm - agora) / 1000)) : 0;

  return (
    <View style={[estilos.container, { backgroundColor: cores.fundo, paddingTop: insets.top + 12 }]}>
      <Pressable onPress={() => router.back()} hitSlop={12}>
        <Ionicons name="chevron-down" size={28} color={cores.texto} />
      </Pressable>

      <Text style={[estilos.titulo, { color: cores.texto }]}>Timer de sono</Text>
      <Text style={[estilos.subtitulo, { color: cores.textoSecundario }]}>
        A música para sozinha quando o tempo acabar.
      </Text>

      {fimEm ? (
        <View style={estilos.centro}>
          <View style={[estilos.anel, { borderColor: cores.destaque }]}>
            <Ionicons name="moon" size={28} color={cores.destaque} />
            <Text style={[estilos.contagem, { color: cores.texto }]}>{formatarDuracao(segundosRestantes)}</Text>
          </View>
          <View style={estilos.botao}>
            <BotaoPrimario titulo="Cancelar timer" aoPressionar={cancelarTimer} />
          </View>
        </View>
      ) : (
        <View style={estilos.opcoes}>
          {OPCOES_EM_MINUTOS.map((minutos) => (
            <Pressable
              key={minutos}
              onPress={() => iniciarTimer(minutos)}
              style={[estilos.opcao, { backgroundColor: cores.superficieElevada }]}
            >
              <Text style={[estilos.valorOpcao, { color: cores.texto }]}>{minutos}</Text>
              <Text style={[estilos.unidade, { color: cores.textoSecundario }]}>min</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  titulo: { fontSize: 26, fontWeight: '800', marginTop: 24 },
  subtitulo: { fontSize: 14, marginTop: 6, marginBottom: 40 },
  centro: { alignItems: 'center' },
  anel: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  contagem: { fontSize: 44, fontWeight: '800', fontVariant: ['tabular-nums'] },
  botao: { width: '100%', marginTop: 48 },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center' },
  opcao: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  valorOpcao: { fontSize: 26, fontWeight: '800' },
  unidade: { fontSize: 12 },
});
