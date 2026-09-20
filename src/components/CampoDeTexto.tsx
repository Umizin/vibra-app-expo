import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useTema } from '@/contexts/TemaContext';

type Propriedades = {
  rotulo?: string;
  valor: string;
  aoMudar: (texto: string) => void;
  placeholder?: string;
  ehSenha?: boolean;
  tipoDeTeclado?: 'default' | 'email-address';
};

export function CampoDeTexto({
  rotulo,
  valor,
  aoMudar,
  placeholder,
  ehSenha = false,
  tipoDeTeclado = 'default',
}: Propriedades) {
  const { cores } = useTema();

  return (
    <View style={estilos.container}>
      {rotulo ? <Text style={[estilos.rotulo, { color: cores.textoSecundario }]}>{rotulo}</Text> : null}
      <TextInput
        value={valor}
        onChangeText={aoMudar}
        placeholder={placeholder}
        placeholderTextColor={cores.textoSecundario}
        secureTextEntry={ehSenha}
        keyboardType={tipoDeTeclado}
        autoCapitalize="none"
        style={[
          estilos.campo,
          { backgroundColor: cores.superficieElevada, color: cores.texto, borderColor: cores.borda },
        ]}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { gap: 6 },
  rotulo: { fontSize: 13, fontWeight: '600' },
  campo: { height: 48, borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, fontSize: 15 },
});
