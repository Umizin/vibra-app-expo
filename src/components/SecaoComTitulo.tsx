import { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTema } from '@/contexts/TemaContext';

type Propriedades = {
  titulo: string;
  children: ReactNode;
};

export function SecaoComTitulo({ titulo, children }: Propriedades) {
  const { cores } = useTema();

  return (
    <View style={estilos.container}>
      <Text style={[estilos.titulo, { color: cores.texto }]}>{titulo}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.lista}>
        {children}
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { marginBottom: 28 },
  titulo: { fontSize: 18, fontWeight: '700', paddingHorizontal: 16, marginBottom: 14 },
  lista: { paddingHorizontal: 16 },
});
