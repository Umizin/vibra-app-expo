import { useEffect, useState } from 'react';

type EstadoDaRequisicao<T> = {
  dado: T | null;
  carregando: boolean;
  erro: string | null;
};

export function useRequisicao<T>(tarefa: () => Promise<T>, dependencias: unknown[] = []) {
  const [estado, setEstado] = useState<EstadoDaRequisicao<T>>({
    dado: null,
    carregando: true,
    erro: null,
  });

  useEffect(() => {
    setEstado((atual) => ({ ...atual, carregando: true, erro: null }));

    tarefa()
      .then((resultado) => setEstado({ dado: resultado, carregando: false, erro: null }))
      .catch(() => setEstado({ dado: null, carregando: false, erro: 'Não foi possível carregar os dados.' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias);

  return estado;
}
