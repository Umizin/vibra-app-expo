import AsyncStorage from '@react-native-async-storage/async-storage';

async function ler<T>(chave: string): Promise<T | null> {
  const valor = await AsyncStorage.getItem(chave);
  return valor ? (JSON.parse(valor) as T) : null;
}

async function salvar<T>(chave: string, valor: T): Promise<void> {
  await AsyncStorage.setItem(chave, JSON.stringify(valor));
}

export const armazenamentoLocal = { ler, salvar };
