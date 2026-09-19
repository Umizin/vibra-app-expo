import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { Faixa } from '@/types/modelos';

type PlayerContextType = {
  faixaAtual: Faixa | null;
  filaDeFaixas: Faixa[];
  estaTocando: boolean;
  progressoEmSegundos: number;
  tocarFaixa: (faixa: Faixa, fila?: Faixa[]) => void;
  alternarReproducao: () => void;
  irParaProxima: () => void;
  irParaAnterior: () => void;
};

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [faixaAtual, setFaixaAtual] = useState<Faixa | null>(null);
  const [filaDeFaixas, setFilaDeFaixas] = useState<Faixa[]>([]);
  const [estaTocando, setEstaTocando] = useState(false);
  const [progressoEmSegundos, setProgressoEmSegundos] = useState(0);

  function mudarFaixaNaFila(deslocamento: number) {
    if (!faixaAtual) return;
    const indiceAtual = filaDeFaixas.findIndex((item) => item.id === faixaAtual.id);
    const proximoIndice = indiceAtual + deslocamento;
    if (proximoIndice < 0 || proximoIndice >= filaDeFaixas.length) return;
    setFaixaAtual(filaDeFaixas[proximoIndice]);
    setProgressoEmSegundos(0);
  }

  useEffect(() => {
    if (!estaTocando || !faixaAtual) return;

    const intervalo = setInterval(() => {
      setProgressoEmSegundos((atual) => {
        if (atual + 1 >= faixaAtual.duracaoEmSegundos) {
          mudarFaixaNaFila(1);
          return 0;
        }
        return atual + 1;
      });
    }, 1000);

    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estaTocando, faixaAtual]);

  function tocarFaixa(faixa: Faixa, fila: Faixa[] = [faixa]) {
    setFaixaAtual(faixa);
    setFilaDeFaixas(fila);
    setProgressoEmSegundos(0);
    setEstaTocando(true);
  }

  function alternarReproducao() {
    if (!faixaAtual) return;
    setEstaTocando((atual) => !atual);
  }

  return (
    <PlayerContext.Provider
      value={{
        faixaAtual,
        filaDeFaixas,
        estaTocando,
        progressoEmSegundos,
        tocarFaixa,
        alternarReproducao,
        irParaProxima: () => mudarFaixaNaFila(1),
        irParaAnterior: () => mudarFaixaNaFila(-1),
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const contexto = useContext(PlayerContext);
  if (!contexto) throw new Error('usePlayer precisa estar dentro de um PlayerProvider.');
  return contexto;
}
