const TABELA_DE_CARACTERES =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function paraBase64(texto: string): string {
  let resultado = '';
  let indice = 0;

  while (indice < texto.length) {
    const byte1 = texto.charCodeAt(indice++);
    const byte2 = texto.charCodeAt(indice++);
    const byte3 = texto.charCodeAt(indice++);

    const bloco1 = byte1 >> 2;
    const bloco2 = ((byte1 & 3) << 4) | (isNaN(byte2) ? 0 : byte2 >> 4);
    const bloco3 = isNaN(byte2) ? 64 : ((byte2 & 15) << 2) | (isNaN(byte3) ? 0 : byte3 >> 6);
    const bloco4 = isNaN(byte3) ? 64 : byte3 & 63;

    resultado +=
      TABELA_DE_CARACTERES[bloco1] +
      TABELA_DE_CARACTERES[bloco2] +
      (bloco3 === 64 ? '=' : TABELA_DE_CARACTERES[bloco3]) +
      (bloco4 === 64 ? '=' : TABELA_DE_CARACTERES[bloco4]);
  }

  return resultado;
}
