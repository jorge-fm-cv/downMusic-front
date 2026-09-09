import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SearchResult, VideoInfo, DownloadRequest } from './types';

const BASE_URL_STORAGE_KEY = 'settings.baseUrl';

/** Puerto del backend local. */
export const BACKEND_PORT = 4000;

/**
 * Detecta la IP del ordenador que ejecuta Metro/Expo (hostUri p. ej.
 * "192.168.1.20:8081") y devuelve la base URL del backend en esa IP.
 */
export function detectBaseUrl(): string {
  try {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const host = hostUri.split(':')[0];
      if (host) {
        // En el emulador de Android, "localhost"/"127.0.0.1" apuntan al propio
        // emulador. El alias para llegar al host (el ordenador) es 10.0.2.2.
        if (Platform.OS === 'android' && (host === 'localhost' || host === '127.0.0.1')) {
          return `http://10.0.2.2:${BACKEND_PORT}`;
        }
        return `http://${host}:${BACKEND_PORT}`;
      }
    }
  } catch {
    // ignorar: usaremos el valor por defecto
  }
  // Sin hostUri: en el emulador de Android el host se alcanza vía 10.0.2.2.
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${BACKEND_PORT}`;
  }
  return `http://localhost:${BACKEND_PORT}`;
}

export async function loadBaseUrl(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(BASE_URL_STORAGE_KEY);
    return stored || detectBaseUrl();
  } catch {
    return detectBaseUrl();
  }
}

export async function saveBaseUrl(baseUrl: string): Promise<void> {
  await AsyncStorage.setItem(BASE_URL_STORAGE_KEY, baseUrl.trim().replace(/\/+$/, ''));
}

// ---------------------------------------------------------------------------
// API del backend
// ---------------------------------------------------------------------------

async function requestJson<T>(baseUrl: string, path: string): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Accept: 'application/json' },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (json && (json as { error?: string }).error) ||
      `Error HTTP ${res.status}`;
    throw new Error(message);
  }
  return json as T;
}

export async function apiSearch(baseUrl: string, query: string, limit = 12): Promise<SearchResult[]> {
  const data = await requestJson<{ results: SearchResult[] }>(
    baseUrl,
    `/api/search?q=${encodeURIComponent(query)}&limit=${limit}`
  );
  return data.results || [];
}

export async function apiInfo(baseUrl: string, url: string): Promise<VideoInfo> {
  return requestJson<VideoInfo>(baseUrl, `/api/info?url=${encodeURIComponent(url)}`);
}

export async function apiHealth(baseUrl: string): Promise<{ ok: boolean }> {
  return requestJson<{ ok: boolean }>(baseUrl, '/api/health');
}

/** Construye la URL del archivo de audio a descargar. */
export function buildDownloadUrl(
  baseUrl: string,
  request: DownloadRequest
): string {
  const params = new URLSearchParams({
    url: request.url,
    title: request.title,
    format: request.format,
  });
  if (request.format === 'mp3' && request.quality) {
    params.set('quality', String(request.quality));
  }
  return `${baseUrl}/api/download?${params.toString()}`;
}