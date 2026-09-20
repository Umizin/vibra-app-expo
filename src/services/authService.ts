import { Usuario } from '@/types/modelos';
import { paraBase64 } from '@/utils/base64';
import { simularRequisicao } from './api';
import { armazenamentoSeguro } from './armazenamentoSeguro';

const CHAVE_TOKEN = 'vibra.tokenDeAcesso';
const CHAVE_USUARIO = 'vibra.usuarioLogado';

function criarTokenDeAcesso(usuario: Usuario): string {
  const cabecalho = paraBase64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = paraBase64(
    JSON.stringify({ sub: usuario.id, nome: usuario.nome, exp: Date.now() + 1000 * 60 * 60 * 24 })
  );
  const assinatura = paraBase64(`${cabecalho}.${payload}.vibra`);
  return `${cabecalho}.${payload}.${assinatura}`;
}

async function entrar(email: string, senha: string): Promise<Usuario> {
  if (!email.includes('@')) {
    throw new Error('Informe um e-mail válido.');
  }
  if (senha.length < 4) {
    throw new Error('A senha precisa ter ao menos 4 caracteres.');
  }

  const nomeExtraido = email.split('@')[0];
  const usuario: Usuario = {
    id: 'usr-1',
    nome: nomeExtraido.charAt(0).toUpperCase() + nomeExtraido.slice(1),
    email,
    avatarUrl: `https://picsum.photos/seed/${nomeExtraido}/200/200`,
  };

  await simularRequisicao(usuario, 600);

  const token = criarTokenDeAcesso(usuario);
  await armazenamentoSeguro.salvar(CHAVE_TOKEN, token);
  await armazenamentoSeguro.salvar(CHAVE_USUARIO, JSON.stringify(usuario));

  return usuario;
}

async function sair(): Promise<void> {
  await armazenamentoSeguro.remover(CHAVE_TOKEN);
  await armazenamentoSeguro.remover(CHAVE_USUARIO);
}

async function recuperarSessao(): Promise<Usuario | null> {
  const token = await armazenamentoSeguro.ler(CHAVE_TOKEN);
  const usuarioSalvo = await armazenamentoSeguro.ler(CHAVE_USUARIO);

  if (!token || !usuarioSalvo) return null;

  return JSON.parse(usuarioSalvo) as Usuario;
}

export const authService = {
  entrar,
  sair,
  recuperarSessao,
};
