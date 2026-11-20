import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { authService } from '@/services/authService';
import type { AtualizacaoPerfil } from '@/services/authService';
import { observarExpiracaoDeSessao } from '@/services/sessao';
import type { Usuario } from '@/types/modelos';

type AuthContextType = {
  usuario: Usuario | null;
  carregandoSessao: boolean;
  erroRecuperacaoSessao: string | null;
  entrar: (email: string, senha: string) => Promise<void>;
  cadastrar: (nome: string, email: string, senha: string) => Promise<void>;
  atualizarPerfil: (atualizacao: AtualizacaoPerfil) => Promise<void>;
  sair: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregandoSessao, setCarregandoSessao] = useState(true);
  const [erroRecuperacaoSessao, setErroRecuperacaoSessao] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    const pararDeObservar = observarExpiracaoDeSessao(() => {
      if (!ativo) return;
      setUsuario(null);
      void authService.limparSessaoPersistida();
    });

    authService.recuperarSessao()
      .then((sessao) => { if (ativo) setUsuario(sessao); })
      .catch((erro: unknown) => {
        if (ativo) {
          setErroRecuperacaoSessao(
            erro instanceof Error ? erro.message : 'Não foi possível recuperar sua sessão.',
          );
        }
      })
      .finally(() => { if (ativo) setCarregandoSessao(false); });

    return () => {
      ativo = false;
      pararDeObservar();
    };
  }, []);

  async function entrar(email: string, senha: string) {
    setErroRecuperacaoSessao(null);
    const usuarioAutenticado = await authService.entrar(email, senha);
    setUsuario(usuarioAutenticado);
  }

  async function cadastrar(nome: string, email: string, senha: string) {
    setErroRecuperacaoSessao(null);
    const usuarioAutenticado = await authService.cadastrar(nome, email, senha);
    setUsuario(usuarioAutenticado);
  }

  async function atualizarPerfil(atualizacao: AtualizacaoPerfil) {
    const perfilAtualizado = await authService.atualizarPerfil(atualizacao);
    setUsuario(perfilAtualizado);
  }

  async function sair() {
    await authService.sair();
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{
      usuario,
      carregandoSessao,
      erroRecuperacaoSessao,
      entrar,
      cadastrar,
      atualizarPerfil,
      sair,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth precisa estar dentro de um AuthProvider.');
  return contexto;
}
