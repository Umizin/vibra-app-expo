const ATRASO_PADRAO_EM_MS = 400;

export function simularRequisicao<T>(dados: T, atrasoEmMs: number = ATRASO_PADRAO_EM_MS): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const respostaEmJson = JSON.stringify(dados);
      resolve(JSON.parse(respostaEmJson) as T);
    }, atrasoEmMs);
  });
}
