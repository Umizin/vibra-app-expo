import { createContext, ReactNode, useContext, useState } from 'react';

import { paletaClara, paletaEscura, Paleta } from '@/constants/cores';

type ModoDeTema = 'claro' | 'escuro';

type TemaContextType = {
  modo: ModoDeTema;
  cores: Paleta;
  alternarTema: () => void;
};

const TemaContext = createContext<TemaContextType | undefined>(undefined);

export function TemaProvider({ children }: { children: ReactNode }) {
  const [modo, setModo] = useState<ModoDeTema>('escuro');

  function alternarTema() {
    setModo((atual) => (atual === 'escuro' ? 'claro' : 'escuro'));
  }

  const cores = modo === 'escuro' ? paletaEscura : paletaClara;

  return <TemaContext.Provider value={{ modo, cores, alternarTema }}>{children}</TemaContext.Provider>;
}

export function useTema() {
  const contexto = useContext(TemaContext);
  if (!contexto) throw new Error('useTema precisa estar dentro de um TemaProvider.');
  return contexto;
}
