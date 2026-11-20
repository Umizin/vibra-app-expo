import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text } from 'react-native';

import { BotaoPrimario } from '@/components/BotaoPrimario';
import { CampoDeTexto } from '@/components/CampoDeTexto';
import { useAuth } from '@/contexts/AuthContext';
import { useTema } from '@/contexts/TemaContext';

export default function TelaDeCadastro() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mensagemDeErro, setMensagemDeErro] = useState('');
  const [cadastrando, setCadastrando] = useState(false);
  const { usuario, cadastrar } = useAuth();
  const { cores } = useTema();
  const router = useRouter();

  if (usuario) return <Redirect href="/(tabs)" />;

  async function lidarComCadastro() {
    setMensagemDeErro('');
    setCadastrando(true);
    try {
      await cadastrar(nome, email, senha);
      router.replace('/(tabs)');
    } catch (erro) {
      setMensagemDeErro(erro instanceof Error ? erro.message : 'Não foi possível criar a conta.');
    } finally {
      setCadastrando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[estilos.container, { backgroundColor: cores.fundo }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={[estilos.marca, { color: cores.destaque }]}>Vibra</Text>
      <Text style={[estilos.subtitulo, { color: cores.textoSecundario }]}>Crie sua conta para começar</Text>
      <CampoDeTexto rotulo="Nome de exibição" valor={nome} aoMudar={setNome} placeholder="Como podemos chamar você?" />
      <CampoDeTexto
        rotulo="E-mail"
        valor={email}
        aoMudar={setEmail}
        placeholder="voce@exemplo.com"
        tipoDeTeclado="email-address"
      />
      <CampoDeTexto rotulo="Senha" valor={senha} aoMudar={setSenha} placeholder="Mínimo de 8 caracteres" ehSenha />
      {mensagemDeErro ? <Text style={[estilos.erro, { color: cores.perigo }]}>{mensagemDeErro}</Text> : null}
      <BotaoPrimario
        titulo="Criar conta"
        aoPressionar={lidarComCadastro}
        carregando={cadastrando}
        desabilitado={!nome.trim() || !email.trim() || senha.length < 8}
      />
      <Pressable onPress={() => router.replace('/login')}>
        <Text style={[estilos.dica, { color: cores.destaque }]}>Já tem uma conta? Entrar</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 16 },
  marca: { fontSize: 40, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  subtitulo: { fontSize: 15, textAlign: 'center', marginBottom: 24 },
  erro: { fontSize: 13 },
  dica: { fontSize: 13, textAlign: 'center', marginTop: 12, fontWeight: '700' },
});
