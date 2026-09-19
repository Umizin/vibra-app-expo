export function formatarDuracao(duracaoEmSegundos: number): string {
  const minutos = Math.floor(duracaoEmSegundos / 60);
  const segundosRestantes = Math.floor(duracaoEmSegundos % 60);
  return `${minutos}:${segundosRestantes.toString().padStart(2, '0')}`;
}
