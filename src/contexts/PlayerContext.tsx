import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';

import { historicoService } from '@/services/historicoService';
import { Faixa } from '@/types/modelos';
import { obterAudioUrlValida } from '@/utils/audio';

type PlayerContextType = {
  faixaAtual: Faixa | null;
  filaDeFaixas: Faixa[];
  estaTocando: boolean;
  carregandoAudio: boolean;
  erroReproducao: string | null;
  progressoEmSegundos: number;
  duracaoEmSegundos: number;
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
  const [erroReproducao, setErroReproducao] = useState<string | null>(null);
  const [carregandoAudio, setCarregandoAudio] = useState(false);
  const faixaRegistrada = useRef<string | null>(null);
  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  }, []);

  useEffect(() => {
    faixaRegistrada.current = null;
    setErroReproducao(null);
    if (!faixaAtual) {
      setCarregandoAudio(false);
      return;
    }

    const audioUrl = obterAudioUrlValida(faixaAtual.audioUrl);
    if (!audioUrl) {
      player.pause();
      setCarregandoAudio(false);
      setErroReproducao('Esta faixa não possui um stream de áudio disponível. Escolha outra música.');
      return;
    }

    setCarregandoAudio(true);
    try {
      player.replace({ uri: audioUrl });
      player.play();
    } catch {
      setCarregandoAudio(false);
      setErroReproducao('Não foi possível iniciar esta faixa. Tente novamente ou escolha outra música.');
      player.pause();
    }
  }, [faixaAtual, player]);

  useEffect(() => {
    if (!faixaAtual || !obterAudioUrlValida(faixaAtual.audioUrl)) return;
    if (status.error) {
      setCarregandoAudio(false);
      setErroReproducao('Não foi possível carregar esta faixa. Tente novamente ou escolha outra música.');
      player.pause();
      return;
    }
    if (status.isLoaded) setCarregandoAudio(false);
    if (status.isLoaded && status.playing && faixaRegistrada.current !== faixaAtual.id) {
      faixaRegistrada.current = faixaAtual.id;
      historicoService.registrar(faixaAtual).catch(() => undefined);
    }
  }, [faixaAtual, player, status.error, status.isLoaded, status.playing]);

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
    const audioUrl = obterAudioUrlValida(faixa.audioUrl);
    if (!audioUrl) {
      setErroReproducao('Esta faixa não possui um stream de áudio disponível. Escolha outra música.');
      return;
    }
    try {
      setErroReproducao(null);
      setCarregandoAudio(true);
      player.seekTo(0);
      player.play();
    } catch {
      setCarregandoAudio(false);
      setErroReproducao('Não foi possível iniciar esta faixa. Tente novamente ou escolha outra música.');
    }
  }

  function alternarReproducao() {
    if (!faixaAtual) return;
    if (!obterAudioUrlValida(faixaAtual.audioUrl)) {
      setErroReproducao('Esta faixa não possui um stream de áudio disponível. Escolha outra música.');
      return;
    }
    try {
      if (status.playing) {
        player.pause();
      } else {
        setErroReproducao(null);
        setCarregandoAudio(true);
        if (status.error) player.replace({ uri: obterAudioUrlValida(faixaAtual.audioUrl)! });
        player.play();
      }
    } catch {
      setCarregandoAudio(false);
      setErroReproducao('Não foi possível iniciar esta faixa. Tente novamente ou escolha outra música.');
    }
  }

  function removerDaFila(idDaFaixa: string) {
    setFilaDeFaixas((atual) => atual.filter((faixa) => faixa.id !== idDaFaixa));
  }

  return (
    <PlayerContext.Provider
      value={{
        faixaAtual,
        filaDeFaixas,
        estaTocando: Boolean(obterAudioUrlValida(faixaAtual?.audioUrl ?? undefined)) && status.playing && !erroReproducao,
        carregandoAudio: carregandoAudio || Boolean(faixaAtual?.audioUrl && status.isBuffering),
        erroReproducao,
        progressoEmSegundos: Math.floor(status.currentTime),
        duracaoEmSegundos: status.duration > 0 ? Math.floor(status.duration) : faixaAtual?.duracaoEmSegundos ?? 0,
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
