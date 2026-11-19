import { Faixa, Reproducao } from '@/types/modelos';

import { armazenamentoLocal } from './armazenamentoLocal';

const CHAVE_HISTORICO = 'vibra:historico';
const LIMITE_DE_REGISTROS = 500;

async function listar(): Promise<Reproducao[]> {
  return (await armazenamentoLocal.ler<Reproducao[]>(CHAVE_HISTORICO)) ?? [];
}

async function registrar(faixa: Faixa): Promise<void> {
  const historico = await listar();
  const novo = { faixa, tocadaEm: new Date().toISOString() };
  await armazenamentoLocal.salvar(CHAVE_HISTORICO, [novo, ...historico].slice(0, LIMITE_DE_REGISTROS));
}

export const historicoService = { listar, registrar };
