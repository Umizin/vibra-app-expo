import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { ApiClientError } from '@/services/api';
import { favoritoService } from '@/services/favoritoService';

type FavoritosContextType = {
  idsFavoritos: string[];
  carregando: boolean;
  erro: string | null;
  alternarFavorito: (idDaFaixa: string) => Promise<void>;
  ehFavorita: (idDaFaixa: string) => boolean;
};

const FavoritosContext = createContext<FavoritosContextType | undefined>(undefined);

export function FavoritosProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const [idsFavoritos, setIdsFavoritos] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const emAndamento = useRef(new Set<string>());
  const usuarioAtual = useRef(usuario?.id);
  usuarioAtual.current = usuario?.id;

  useEffect(() => {
    setIdsFavoritos([]);
    setErro(null);
    setCarregando(!!usuario);
    if (!usuario) return;

    let ativo = true;
    favoritoService.listar()
      .then((ids) => { if (ativo) setIdsFavoritos(ids); })
      .catch((e: unknown) => {
        if (ativo) setErro(e instanceof Error ? e.message : 'Não foi possível carregar seus favoritos.');
      })
      .finally(() => { if (ativo) setCarregando(false); });

    return () => { ativo = false; };
  }, [usuario?.id]);

  function aplicar(idDaFaixa: string, favorita: boolean) {
    setIdsFavoritos((atuais) => {
      const sem = atuais.filter((id) => id !== idDaFaixa);
      return favorita ? [...sem, idDaFaixa] : sem;
    });
  }

  async function alternarFavorito(idDaFaixa: string) {
    if (emAndamento.current.has(idDaFaixa)) return;
    emAndamento.current.add(idDaFaixa);

    const usuarioInicial = usuario?.id;
    const eraFavorita = idsFavoritos.includes(idDaFaixa);
    aplicar(idDaFaixa, !eraFavorita);
    try {
      if (eraFavorita) await favoritoService.remover(idDaFaixa);
      else await favoritoService.adicionar(idDaFaixa);
    } catch (e) {
      const jaNoEstadoDesejado = e instanceof ApiClientError && e.status === (eraFavorita ? 404 : 409);
      if (!jaNoEstadoDesejado && usuarioAtual.current === usuarioInicial) aplicar(idDaFaixa, eraFavorita);
    } finally {
      emAndamento.current.delete(idDaFaixa);
    }
  }

  function ehFavorita(idDaFaixa: string) {
    return idsFavoritos.includes(idDaFaixa);
  }

  return (
    <FavoritosContext.Provider value={{ idsFavoritos, carregando, erro, alternarFavorito, ehFavorita }}>
      {children}
    </FavoritosContext.Provider>
  );
}

export function useFavoritos() {
  const contexto = useContext(FavoritosContext);
  if (!contexto) throw new Error('useFavoritos precisa estar dentro de um FavoritosProvider.');
  return contexto;
}
