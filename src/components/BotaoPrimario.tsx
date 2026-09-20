import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { useTema } from '@/contexts/TemaContext';

type Propriedades = {
  titulo: string;
  aoPressionar: () => void;
  desabilitado?: boolean;
  carregando?: boolean;
};

export function BotaoPrimario({
  titulo,
  aoPressionar,
  desabilitado = false,
  carregando = false,
}: Propriedades) {
  const { cores } = useTema();
  const inativo = desabilitado || carregando;

  return (
    <Pressable
      onPress={aoPressionar}
      disabled={inativo}
      style={({ pressed }) => [
        estilos.botao,
        { backgroundColor: cores.destaque, opacity: inativo ? 0.5 : pressed ? 0.8 : 1 },
      ]}
    >
      {carregando ? <ActivityIndicator color="#121212" /> : <Text style={estilos.texto}>{titulo}</Text>}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  botao: { height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  texto: { color: '#121212', fontSize: 15, fontWeight: '700' },
});
