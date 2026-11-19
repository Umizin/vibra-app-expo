import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { usePlayer } from './PlayerContext';

type TimerContextType = {
  fimEm: number | null;
  iniciarTimer: (minutos: number) => void;
  cancelarTimer: () => void;
};

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: ReactNode }) {
  const { pausar } = usePlayer();
  const [fimEm, setFimEm] = useState<number | null>(null);

  useEffect(() => {
    if (!fimEm) return;

    const espera = setTimeout(() => {
      pausar();
      setFimEm(null);
    }, fimEm - Date.now());

    return () => clearTimeout(espera);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fimEm]);

  function iniciarTimer(minutos: number) {
    setFimEm(Date.now() + minutos * 60 * 1000);
  }

  return (
    <TimerContext.Provider value={{ fimEm, iniciarTimer, cancelarTimer: () => setFimEm(null) }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const contexto = useContext(TimerContext);
  if (!contexto) throw new Error('useTimer precisa estar dentro de um TimerProvider.');
  return contexto;
}
