import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

async function salvar(chave: string, valor: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.sessionStorage.setItem(chave, valor);
    return;
  }
  await SecureStore.setItemAsync(chave, valor);
}

async function ler(chave: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof window === 'undefined' ? null : window.sessionStorage.getItem(chave);
  }
  return SecureStore.getItemAsync(chave);
}

async function remover(chave: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.sessionStorage.removeItem(chave);
    return;
  }
  await SecureStore.deleteItemAsync(chave);
}

export const armazenamentoSeguro = { salvar, ler, remover };
