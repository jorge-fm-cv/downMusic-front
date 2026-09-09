/** Utilidades de formato y saneamiento. */

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '--:--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatViews(views: number | null | undefined): string {
  if (!views || views <= 0) return '';
  const n = views;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace('.0', '')} mil M`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace('.0', '')} K`;
  return String(n);
}

/** Convierte un título en un nombre de archivo seguro (sin acentos ni caracteres raros). */
export function sanitizeFilename(name: string): string {
  return (
    (name || 'audio')
      .normalize('NFD') // separa acentos
      .replace(/[\u0300-\u036f]/g, '') // elimina diacríticos
      .replace(/[\\/:*?"<>|]+/g, ' ')
      .replace(/[^\w\- ]+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 100) || 'audio'
  );
}

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Extrae el ID de YouTube de una URL o devuelve null si no es un enlace válido. */
export function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function isYouTubeUrl(input: string): boolean {
  return extractYouTubeId(input) !== null;
}