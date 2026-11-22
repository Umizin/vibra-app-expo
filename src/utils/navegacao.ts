import type { Href } from 'expo-router';

type RouterComHistorico = {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: Href) => void;
};

/** Volta pelo histórico normal ou substitui a rota por um destino seguro. */
export function voltarOuIrPara(router: RouterComHistorico, fallback: Href): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallback);
}
