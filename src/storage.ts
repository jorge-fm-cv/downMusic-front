import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, Paths, File } from 'expo-file-system';
import { Track } from './types';

const TRACKS_KEY = 'library.tracks';

/** Directorio persistente donde viven las canciones. */
export const MUSIC_DIR = new Directory(Paths.document, 'Musica');

/** Asegura que el directorio de música existe. */
export function ensureMusicDir(): Directory {
  if (!MUSIC_DIR.exists) {
    MUSIC_DIR.create({ intermediates: true, idempotent: true });
  }
  return MUSIC_DIR;
}

export async function loadTracks(): Promise<Track[]> {
  try {
    const raw = await AsyncStorage.getItem(TRACKS_KEY);
    const tracks: Track[] = raw ? JSON.parse(raw) : [];
    // Elimina entradas huérfanas (archivo borrado fuera de la app)
    const valid = tracks.filter((track) => {
      try {
        return new File(track.filePath).exists;
      } catch {
        return false;
      }
    });
    if (valid.length !== tracks.length) {
      await AsyncStorage.setItem(TRACKS_KEY, JSON.stringify(valid));
    }
    return valid.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function saveTrack(track: Track): Promise<void> {
  const tracks = await loadTracks();
  const next = [track, ...tracks];
  await AsyncStorage.setItem(TRACKS_KEY, JSON.stringify(next));
}

export async function removeTrack(filePath: string): Promise<void> {
  try {
    const file = new File(filePath);
    if (file.exists) file.delete();
  } catch {
    // el archivo podría no existir; seguimos
  }
  const tracks = await loadTracks();
  const next = tracks.filter((track) => track.filePath !== filePath);
  await AsyncStorage.setItem(TRACKS_KEY, JSON.stringify(next));
}

/** Nombre de archivo único para una descarga nueva. */
export function uniqueFileName(safeTitle: string, ext: string): string {
  ensureMusicDir();
  let candidate = `${safeTitle}.${ext}`;
  let suffix = 1;
  while (new File(MUSIC_DIR, candidate).exists) {
    candidate = `${safeTitle} (${suffix}).${ext}`;
    suffix += 1;
  }
  return candidate;
}

export function trackFile(fileName: string): File {
  return new File(ensureMusicDir(), fileName);
}