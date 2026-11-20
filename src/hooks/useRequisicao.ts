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
    let cancelada = false;
    setEstado((atual) => ({ ...atual, carregando: true, erro: null }));

    tarefa()
      .then((resultado) => {
        if (!cancelada) setEstado({ dado: resultado, carregando: false, erro: null });
      })
      .catch((erro: unknown) => {
        if (!cancelada) {
          setEstado({
            dado: null,
            carregando: false,
            erro: erro instanceof Error ? erro.message : 'Não foi possível carregar os dados.',
          });
        }
      });

    return () => {
      cancelada = true;
    };
    // a tarefa é recriada a cada render; o controle de quando buscar de novo é feito pelas dependências
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias);

  return estado;
}
