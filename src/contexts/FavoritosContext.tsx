import { createContext, ReactNode, useContext, useState } from 'react';

type FavoritosContextType = {
  idsFavoritos: string[];
  alternarFavorito: (idDaFaixa: string) => void;
  ehFavorita: (idDaFaixa: string) => boolean;
};

const FavoritosContext = createContext<FavoritosContextType | undefined>(undefined);

export function FavoritosProvider({ children }: { children: ReactNode }) {
  const [idsFavoritos, setIdsFavoritos] = useState<string[]>([]);

  function alternarFavorito(idDaFaixa: string) {
    setIdsFavoritos((atuais) =>
      atuais.includes(idDaFaixa) ? atuais.filter((id) => id !== idDaFaixa) : [...atuais, idDaFaixa]
    );
  }

  function ehFavorita(idDaFaixa: string) {
    return idsFavoritos.includes(idDaFaixa);
  }

  return (
    <FavoritosContext.Provider value={{ idsFavoritos, alternarFavorito, ehFavorita }}>
      {children}
    </FavoritosContext.Provider>
  );
}

export function useFavoritos() {
  const contexto = useContext(FavoritosContext);
  if (!contexto) throw new Error('useFavoritos precisa estar dentro de um FavoritosProvider.');
  return contexto;
}
