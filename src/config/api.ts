/**
 * Defina EXPO_PUBLIC_API_URL no ambiente do Expo.
 * Android Emulator: http://10.0.2.2:3001
 * iOS Simulator/Web local: http://localhost:3001
 * Dispositivo físico: use o endereço LAN do computador.
 */
export function obterUrlBaseApi(): string | undefined {
  return process.env.EXPO_PUBLIC_API_URL;
}
