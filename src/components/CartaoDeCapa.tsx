import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTema } from '@/contexts/TemaContext';

type Propriedades = {
  titulo: string;
  subtitulo: string;
  capaUrl?: string;
  aoPressionar: () => void;
};

export function CartaoDeCapa({ titulo, subtitulo, capaUrl, aoPressionar }: Propriedades) {
  const { cores } = useTema();

  return (
    <Pressable onPress={aoPressionar} style={estilos.container}>
      {capaUrl ? (
        <Image source={{ uri: capaUrl }} style={estilos.capa} contentFit="cover" />
      ) : (
        <View style={[estilos.capa, estilos.capaVazia, { backgroundColor: cores.superficieElevada }]}>
          <Ionicons name="musical-notes" size={32} color={cores.textoSecundario} />
        </View>
      )}
      <Text style={[estilos.titulo, { color: cores.texto }]} numberOfLines={1}>
        {titulo}
      </Text>
      <Text style={[estilos.subtitulo, { color: cores.textoSecundario }]} numberOfLines={1}>
        {subtitulo}
      </Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  container: { width: 140, marginRight: 14 },
  capa: { width: 140, height: 140, borderRadius: 6, marginBottom: 8 },
  capaVazia: { alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: 14, fontWeight: '600' },
  subtitulo: { fontSize: 12, marginTop: 2 },
});
