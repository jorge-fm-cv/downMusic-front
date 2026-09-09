import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Asset, Album, usePermissions } from 'expo-media-library';
import { SearchResult, VideoInfo, AudioFormat, QualityId, Track } from '../types';
import { apiInfo, buildDownloadUrl } from '../api';
import { useSettings } from '../settings';
import { colors, spacing, radius } from '../theme';
import { formatBytes, formatDuration, formatViews, sanitizeFilename } from '../utils';
import { ensureMusicDir, uniqueFileName, saveTrack } from '../storage';

type Props = {
  video: SearchResult;
  onBack: () => void;
  onOpenLibrary: () => void;
};

type FormatOption = {
  key: string;
  label: string;
  sublabel: string;
  format: AudioFormat;
  quality: QualityId | null;
};

const FORMAT_OPTIONS: FormatOption[] = [
  { key: 'mp3-320', label: 'MP3', sublabel: '320 kbps (mejor)', format: 'mp3', quality: 320 },
  { key: 'mp3-128', label: 'MP3', sublabel: '128 kbps (estándar)', format: 'mp3', quality: 128 },
  { key: 'm4a', label: 'M4A', sublabel: 'AAC alta calidad', format: 'm4a', quality: null },
];

function extFor(format: AudioFormat): string {
  return format;
}

export default function DownloadScreen({ video, onBack, onOpenLibrary }: Props) {
  const { baseUrl } = useSettings();
  const [, requestPermission] = usePermissions({ writeOnly: true });

  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(true);
  const [infoError, setInfoError] = useState<string | null>(null);

  const [selected, setSelected] = useState<FormatOption>(FORMAT_OPTIONS[0]);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<{ bytesWritten: number; totalBytes: number } | null>(null);
  const [doneTrack, setDoneTrack] = useState<Track | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const taskRef = useRef<ReturnType<typeof File.createDownloadTask> | null>(null);

  useEffect(() => {
    let active = true;
    setInfoLoading(true);
    apiInfo(baseUrl, video.url)
      .then((data) => {
        if (active) {
          setInfo(data);
          setInfoError(null);
        }
      })
      .catch((e) => {
        if (active) {
          // Puede fallar si el backend no está disponible; mostramos lo que vino de la búsqueda
          setInfoError(e instanceof Error ? e.message : 'No se pudo cargar la información');
        }
      })
      .finally(() => active && setInfoLoading(false));
    return () => {
      active = false;
    };
  }, [baseUrl, video.url]);

  const title = info?.title || video?.title || 'Sin título';
  const thumb = info?.thumbnail || video?.thumbnail || '';

  const startDownload = async () => {
    setDownloading(true);
    setProgress({ bytesWritten: 0, totalBytes: 0 });
    setDoneTrack(null);

    const url = buildDownloadUrl(baseUrl, {
      url: info?.url || video.url,
      title,
      format: selected.format,
      quality: selected.quality,
    });

    const fileName = uniqueFileName(sanitizeFilename(title), extFor(selected.format));
    const dest = new File(ensureMusicDir(), fileName);

    try {
      const task = File.createDownloadTask(url, dest, {
        onProgress: (p) => {
          setProgress({ bytesWritten: p.bytesWritten, totalBytes: p.totalBytes });
        },
      });
      taskRef.current = task;

      const file = await task.downloadAsync();
      if (!file) throw new Error('Descarga cancelada');

      const track: Track = {
        fileName,
        title,
        channel: info?.channel || video?.channel || '',
        thumbnail: thumb,
        sourceUrl: info?.url || video.url,
        filePath: file.uri,
        ext: extFor(selected.format),
        format: selected.format,
        quality: selected.quality ?? undefined,
        size: file.size,
        createdAt: Date.now(),
      };
      await saveTrack(track);
      setDoneTrack(track);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error durante la descarga';
      if (!message.toLowerCase().includes('cancel')) {
        Alert.alert('Descarga fallida', message);
      }
    } finally {
      taskRef.current = null;
      setDownloading(false);
    }
  };

  const cancelDownload = () => {
    taskRef.current?.cancel();
  };

  const shareFile = async (filePath: string) => {
    setActionBusy('share');
    try {
      const mime = filePath.toLowerCase().endsWith('.m4a') ? 'audio/mp4' : 'audio/mpeg';
      await Sharing.shareAsync(filePath, {
        dialogTitle: 'Compartir audio',
        mimeType: mime,
      });
    } catch (e) {
      Alert.alert('No se pudo compartir', e instanceof Error ? e.message : 'Error');
    } finally {
      setActionBusy(null);
    }
  };

  const saveToDevice = async (filePath: string) => {
    setActionBusy('save');
    try {
      if (Platform.OS === 'ios') {
        // iOS: el audio no se guarda en la fototeca; se comparte (p. ej. a Archivos)
        await Sharing.shareAsync(filePath, {
          dialogTitle: 'Guardar audio',
          mimeType: 'audio/mpeg',
        });
        return;
      }
      const perm = await requestPermission();
      if (!perm?.granted) {
        // Sin permiso: ofrecemos compartir como alternativa
        Alert.alert('Permiso requerido', 'Para guardar en el dispositivo necesitas permiso. Abriendo el menú de compartir…');
        await Sharing.shareAsync(filePath, {
          dialogTitle: 'Guardar audio',
          mimeType: 'audio/mpeg',
        });
        return;
      }
      const album = await Album.get('downMusic');
      if (album) {
        // El álbum ya existe: importamos el archivo directamente en él.
        await Asset.create(filePath, album);
      } else {
        // El álbum no existe: créalo junto con el archivo (ruta file://).
        // NOTA: Album.create NO acepta una lista vacía de assets — rechaza con
        // 'function 'album.create' has been rejected'.
        await Album.create('downMusic', [filePath]);
      }
      Alert.alert('Guardado', 'La canción se guardó en tu biblioteca (carpeta "downMusic").');
    } catch (e) {
      Alert.alert(
        'No se pudo guardar',
        (e instanceof Error ? e.message : 'Error') + '\nPrueba con la opción Compartir.'
      );
    } finally {
      setActionBusy(null);
    }
  };

  const progressValue =
    progress && progress.totalBytes > 0 ? progress.bytesWritten / progress.totalBytes : 0;
  const progressPct = Math.round(progressValue * 100);

  return (
    <View style={styles.container}>
      {/* Barra superior */}
      <View style={styles.topBar}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Descargar</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Info del video */}
        <View style={styles.videoCard}>
          <View style={styles.thumbWrap}>
            {thumb ? (
              <Image source={{ uri: thumb }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]}>
                <Ionicons name="musical-note" size={40} color={colors.textMuted} />
              </View>
            )}
            {infoLoading && (
              <View style={styles.thumbOverlay}>
                <ActivityIndicator color={colors.white} />
              </View>
            )}
          </View>
          <Text style={styles.videoTitle} numberOfLines={2}>
            {title}
          </Text>
          {!!info?.channel && <Text style={styles.channel}>{info.channel}</Text>}
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>
              {info ? (info.durationText || formatDuration(info.duration)) : '—'}
            </Text>
            {!!info?.viewCount && (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Ionicons name="eye-outline" size={14} color={colors.textMuted} />
                <Text style={styles.metaText}>{formatViews(info.viewCount)}</Text>
              </>
            )}
          </View>
          {infoError && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
              <Text style={styles.errorText}>{infoError}</Text>
            </View>
          )}
        </View>

        {/* Elección de formato */}
        <Text style={styles.sectionLabel}>Formato</Text>
        <View style={styles.formatGrid}>
          {FORMAT_OPTIONS.map((opt) => {
            const isActive = selected.key === opt.key;
            return (
              <Pressable
                key={opt.key}
                disabled={downloading}
                onPress={() => setSelected(opt)}
                style={[styles.formatCard, isActive && styles.formatCardActive]}
              >
                <Ionicons
                  name={opt.format === 'mp3' ? 'musical-notes' : 'albums-outline'}
                  size={22}
                  color={isActive ? colors.accent : colors.textMuted}
                />
                <Text style={[styles.formatLabel, isActive && { color: colors.white }]}>
                  {opt.label}
                </Text>
                <Text style={[styles.formatSub, isActive && { color: colors.textMuted }]}>
                  {opt.sublabel}
                </Text>
                {isActive && (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark" size={12} color={colors.white} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Progreso / acciones */}
        {!downloading && !doneTrack && (
          <Pressable
            style={({ pressed }) => [styles.downloadBtn, pressed && styles.downloadBtnPressed]}
            onPress={startDownload}
          >
            <Ionicons name="download" size={20} color={colors.white} />
            <Text style={styles.downloadBtnText}>Descargar audio</Text>
          </Pressable>
        )}

        {downloading && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Descargando…</Text>
              <Text style={styles.progressPct}>
                {progress && progress.totalBytes > 0
                  ? `${progressPct}% (${formatBytes(progress.bytesWritten)} / ${formatBytes(progress.totalBytes)})`
                  : progress && progress.bytesWritten > 0
                    ? formatBytes(progress.bytesWritten)
                    : '· preparando'}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              {progress && progress.totalBytes > 0 ? (
                <View style={[styles.progressFill, { width: `${Math.max(2, progressPct)}%` }]} />
              ) : (
                <ActivityIndicator color={colors.accent} />
              )}
            </View>
            <Pressable style={styles.cancelBtn} onPress={cancelDownload}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
          </View>
        )}

        {doneTrack && (
          <View style={styles.doneCard}>
            <Ionicons name="checkmark-circle" size={44} color={colors.success} />
            <Text style={styles.doneTitle}>¡Listo!</Text>
            <Text style={styles.doneSubtitle}>
              {doneTrack.title} · {doneTrack.format.toUpperCase()} · {formatBytes(doneTrack.size)}
            </Text>
            <View style={styles.doneActions}>
              <Pressable
                disabled={!!actionBusy}
                onPress={() => shareFile(doneTrack.filePath)}
                style={[styles.actionBtn, styles.actionSecondary]}
              >
                {actionBusy === 'share' ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <>
                    <Ionicons name="share-outline" size={18} color={colors.text} />
                    <Text style={styles.actionText}>Compartir</Text>
                  </>
                )}
              </Pressable>
              <Pressable
                disabled={!!actionBusy}
                onPress={() => saveToDevice(doneTrack.filePath)}
                style={[styles.actionBtn, styles.actionSecondary]}
              >
                {actionBusy === 'save' ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color={colors.text} />
                    <Text style={styles.actionText}>Guardar</Text>
                  </>
                )}
              </Pressable>
              <Pressable onPress={onOpenLibrary} style={[styles.actionBtn, styles.actionPrimary]}>
                <Ionicons name="library-outline" size={18} color={colors.white} />
                <Text style={[styles.actionText, { color: colors.white }]}>Biblioteca</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  videoCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  thumbWrap: {
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  channel: {
    color: colors.textMuted,
    fontSize: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  metaDot: {
    color: colors.textMuted,
    marginHorizontal: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255, 176, 32, 0.12)',
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  errorText: {
    color: colors.warning,
    flex: 1,
    fontSize: 12,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  formatGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  formatCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
    position: 'relative',
  },
  formatCardActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(255, 51, 68, 0.08)',
  },
  formatLabel: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '700',
  },
  formatSub: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.accent,
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  downloadBtnPressed: {
    backgroundColor: colors.accentPressed,
  },
  downloadBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  progressCard: {
    marginTop: spacing.xl,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: {
    color: colors.text,
    fontWeight: '600',
  },
  progressPct: {
    color: colors.textMuted,
    fontSize: 12,
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
  },
  cancelBtn: {
    alignSelf: 'center',
    paddingVertical: spacing.xs,
  },
  cancelText: {
    color: colors.warning,
    fontWeight: '600',
  },
  doneCard: {
    marginTop: spacing.xl,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  doneTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  doneSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  doneActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    minHeight: 42,
  },
  actionSecondary: {
    backgroundColor: colors.bgElevated,
  },
  actionPrimary: {
    backgroundColor: colors.accent,
  },
  actionText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
});