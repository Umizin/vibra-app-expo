import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { historicoService } from '@/services/historicoService';
import { Faixa } from '@/types/modelos';

type PlayerContextType = {
  faixaAtual: Faixa | null;
  filaDeFaixas: Faixa[];
  estaTocando: boolean;
  progressoEmSegundos: number;
  tocarFaixa: (faixa: Faixa, fila?: Faixa[]) => void;
  alternarReproducao: () => void;
  pausar: () => void;
  removerDaFila: (idDaFaixa: string) => void;
  irParaProxima: () => void;
  irParaAnterior: () => void;
};

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [faixaAtual, setFaixaAtual] = useState<Faixa | null>(null);
  const [filaDeFaixas, setFilaDeFaixas] = useState<Faixa[]>([]);
  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!faixaAtual) return;
    historicoService.registrar(faixaAtual).catch(() => undefined);
    if (!faixaAtual.audioUrl) {
      player.pause();
      return;
    }
    player.replace({ uri: faixaAtual.audioUrl });
    player.play();
  }, [faixaAtual, player]);

  useEffect(() => {
    if (status.didJustFinish) mudarFaixaNaFila(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.didJustFinish]);

  function mudarFaixaNaFila(deslocamento: number) {
    const indice = filaDeFaixas.findIndex((item) => item.id === faixaAtual?.id) + deslocamento;
    if (indice >= 0 && indice < filaDeFaixas.length) setFaixaAtual(filaDeFaixas[indice]);
  }

  function tocarFaixa(faixa: Faixa, fila: Faixa[] = [faixa]) {
    setFilaDeFaixas(fila);
    if (faixa.id !== faixaAtual?.id) {
      setFaixaAtual(faixa);
      return;
    }
    player.seekTo(0);
    player.play();
  }

  function alternarReproducao() {
    if (!faixaAtual) return;
    if (status.playing) player.pause();
    else player.play();
  }

  function removerDaFila(idDaFaixa: string) {
    setFilaDeFaixas((atual) => atual.filter((faixa) => faixa.id !== idDaFaixa));
  }

  return (
    <PlayerContext.Provider
      value={{
        faixaAtual,
        filaDeFaixas,
        estaTocando: status.playing,
        progressoEmSegundos: Math.floor(status.currentTime),
        tocarFaixa,
        alternarReproducao,
        pausar: () => player.pause(),
        removerDaFila,
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
