import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { authService } from '@/services/authService';
import { Usuario } from '@/types/modelos';

type AuthContextType = {
  usuario: Usuario | null;
  carregandoSessao: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregandoSessao, setCarregandoSessao] = useState(true);

  useEffect(() => {
    authService
      .recuperarSessao()
      .then(setUsuario)
      .finally(() => setCarregandoSessao(false));
  }, []);

  async function entrar(email: string, senha: string) {
    const usuarioAutenticado = await authService.entrar(email, senha);
    setUsuario(usuarioAutenticado);
  }

  async function sair() {
    await authService.sair();
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, carregandoSessao, entrar, sair }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth precisa estar dentro de um AuthProvider.');
  return contexto;
}
