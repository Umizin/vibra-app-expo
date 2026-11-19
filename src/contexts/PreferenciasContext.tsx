import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { Genero } from '@/constants/generos';
import { armazenamentoLocal } from '@/services/armazenamentoLocal';

const CHAVE_GENEROS = 'vibra:generos';

type PreferenciasContextType = {
  generos: Genero[];
  onboardingFeito: boolean;
  carregandoPreferencias: boolean;
  salvarGeneros: (generos: Genero[]) => Promise<void>;
};

const PreferenciasContext = createContext<PreferenciasContextType | undefined>(undefined);

export function PreferenciasProvider({ children }: { children: ReactNode }) {
  const [generos, setGeneros] = useState<Genero[] | null>(null);
  const [carregandoPreferencias, setCarregandoPreferencias] = useState(true);

  useEffect(() => {
    armazenamentoLocal
      .ler<Genero[]>(CHAVE_GENEROS)
      .then(setGeneros)
      .finally(() => setCarregandoPreferencias(false));
  }, []);

  async function salvarGeneros(novos: Genero[]) {
    await armazenamentoLocal.salvar(CHAVE_GENEROS, novos);
    setGeneros(novos);
  }

  return (
    <PreferenciasContext.Provider
      value={{
        generos: generos ?? [],
        onboardingFeito: generos !== null,
        carregandoPreferencias,
        salvarGeneros,
      }}
    >
      {children}
    </PreferenciasContext.Provider>
  );
}

export function usePreferencias() {
  const contexto = useContext(PreferenciasContext);
  if (!contexto) throw new Error('usePreferencias precisa estar dentro de um PreferenciasProvider.');
  return contexto;
}
