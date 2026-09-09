export type SearchResult = {
  id: string;
  title: string;
  duration: number;
  durationText: string | null;
  channel: string;
  views: number;
  thumbnail: string;
  url: string;
};

export type VideoInfo = {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  durationText: string | null;
  channel: string;
  uploadDate?: string;
  viewCount?: number;
  likeCount?: number | null;
  url: string;
};

/** Formato de audio disponible en el backend. */
export type AudioFormat = 'mp3' | 'm4a';

export type QualityId = 128 | 320;

export type DownloadRequest = {
  url: string;
  title: string;
  format: AudioFormat;
  quality: QualityId | null;
};

/** Pista guardada en la biblioteca local del dispositivo. */
export type Track = {
  /** Nombre de archivo (único), p. ej. "mi-cancion-1699999999999.mp3" */
  fileName: string;
  title: string;
  channel?: string;
  thumbnail?: string;
  sourceUrl?: string;
  filePath: string;
  ext: string;
  format: AudioFormat;
  quality?: number;
  size: number;
  createdAt: number;
};