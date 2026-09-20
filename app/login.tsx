import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text } from 'react-native';

import { BotaoPrimario } from '@/components/BotaoPrimario';
import { CampoDeTexto } from '@/components/CampoDeTexto';
import { useAuth } from '@/contexts/AuthContext';
import { useTema } from '@/contexts/TemaContext';

export default function TelaDeLogin() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mensagemDeErro, setMensagemDeErro] = useState('');
  const [autenticando, setAutenticando] = useState(false);

  const { usuario, entrar } = useAuth();
  const { cores } = useTema();
  const router = useRouter();

  if (usuario) {
    return <Redirect href="/(tabs)" />;
  }

  async function lidarComEntrar() {
    setMensagemDeErro('');
    setAutenticando(true);
    try {
      await entrar(email, senha);
      router.replace('/(tabs)');
    } catch (erro) {
      setMensagemDeErro(erro instanceof Error ? erro.message : 'Não foi possível entrar.');
    } finally {
      setAutenticando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[estilos.container, { backgroundColor: cores.fundo }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={[estilos.marca, { color: cores.destaque }]}>Vibra</Text>
      <Text style={[estilos.subtitulo, { color: cores.textoSecundario }]}>Entre para continuar ouvindo</Text>

      <CampoDeTexto
        rotulo="E-mail"
        valor={email}
        aoMudar={setEmail}
        placeholder="voce@exemplo.com"
        tipoDeTeclado="email-address"
      />
      <CampoDeTexto
        rotulo="Senha"
        valor={senha}
        aoMudar={setSenha}
        placeholder="Mínimo de 4 caracteres"
        ehSenha
      />

      {mensagemDeErro ? <Text style={estilos.erro}>{mensagemDeErro}</Text> : null}

      <BotaoPrimario
        titulo="Entrar"
        aoPressionar={lidarComEntrar}
        carregando={autenticando}
        desabilitado={!email || !senha}
      />

      <Text style={[estilos.dica, { color: cores.textoSecundario }]}>
        Login simulado: use qualquer e-mail válido e senha com 4 ou mais caracteres.
      </Text>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 16 },
  marca: { fontSize: 40, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  subtitulo: { fontSize: 15, textAlign: 'center', marginBottom: 24 },
  erro: { color: '#F15E6C', fontSize: 13 },
  dica: { fontSize: 12, textAlign: 'center', marginTop: 24 },
});
