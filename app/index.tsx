import { Redirect } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';

export default function Indice() {
  const { usuario, carregandoSessao } = useAuth();

  if (carregandoSessao) return null;

  return <Redirect href={usuario ? '/(tabs)' : '/login'} />;
}
