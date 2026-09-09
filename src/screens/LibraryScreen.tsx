import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import * as Sharing from 'expo-sharing';
import { Track } from '../types';
import { loadTracks, removeTrack } from '../storage';
import { colors, spacing, radius } from '../theme';
import { formatBytes, formatDate, formatDuration } from '../utils';

export default function LibraryScreen() {
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [current, setCurrent] = useState<Track | null>(null);
  const [sharing, setSharing] = useState(false);

  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  // Configura la sesión de audio (sonido en modo silencio).
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  const refresh = useCallback(async () => {
    setTracks(await loadTracks());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const playTrack = (track: Track) => {
    if (current?.fileName === track.fileName) {
      // toggle play/pause si ya está cargada
      if (status.playing) player.pause();
      else player.play();
      return;
    }
    setCurrent(track);
    player.replace({ uri: track.filePath });
    player.play();
  };

  const shareTrack = async (track: Track) => {
    setSharing(true);
    try {
      const mime = track.format === 'm4a' ? 'audio/mp4' : 'audio/mpeg';
      await Sharing.shareAsync(track.filePath, {
        dialogTitle: 'Compartir audio',
        mimeType: mime,
      });
    } finally {
      setSharing(false);
    }
  };

  const deleteTrack = (track: Track) => {
    Alert.alert(
      'Eliminar canción',
      `¿Seguro que quieres eliminar "${track.title}" del dispositivo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (current?.fileName === track.fileName) {
              player.pause();
              setCurrent(null);
            }
            await removeTrack(track.filePath);
            refresh();
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Track }) => {
    const isCurrent = current?.fileName === item.fileName;
    const isPlaying = isCurrent && status.playing;
    return (
      <Pressable
        onPress={() => playTrack(item)}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <View style={styles.iconWrap}>
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={20}
            color={isCurrent ? colors.accent : colors.text}
          />
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {item.format.toUpperCase()}
            {item.quality ? ` ${item.quality} kbps` : ''} · {formatBytes(item.size)} ·{' '}
            {formatDate(item.createdAt)}
          </Text>
        </View>
        <Pressable onPress={() => shareTrack(item)} hitSlop={10} style={styles.rowBtn}>
          {sharing ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : (
            <Ionicons name="share-outline" size={20} color={colors.textMuted} />
          )}
        </Pressable>
        <Pressable onPress={() => deleteTrack(item)} hitSlop={10} style={styles.rowBtn}>
          <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
        </Pressable>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>
          Mi <Text style={styles.logoAccent}>Biblioteca</Text>
        </Text>
        <Text style={styles.tagline}>
          {tracks ? `${tracks.length} audio${tracks.length === 1 ? '' : 's'} descargado${tracks.length === 1 ? '' : 's'}` : 'Cargando…'}
        </Text>
      </View>

      <FlatList
        data={tracks || []}
        keyExtractor={(item) => item.fileName}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshing={tracks === null}
        onRefresh={refresh}
        ListEmptyComponent={
          tracks && tracks.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="musical-notes-outline" size={44} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Aún no hay música</Text>
              <Text style={styles.emptyText}>
                Descarga audio desde la pestaña Buscar y aparecerá aquí.
              </Text>
            </View>
          ) : null
        }
      />

      {/* Mini reproductor */}
      {current && (
        <View style={styles.playerBar}>
          <View style={styles.playerInfo}>
            <Text style={styles.playerTitle} numberOfLines={1}>
              {current.title}
            </Text>
            <Text style={styles.playerTime}>
              {formatDuration(status.currentTime)} / {formatDuration(status.duration)}
            </Text>
          </View>
          <View style={styles.progressTrackMini}>
            <View
              style={[
                styles.progressFillMini,
                {
                  width: `${
                    status.duration > 0
                      ? Math.min(100, (status.currentTime / status.duration) * 100)
                      : 0
                  }%`,
                },
              ]}
            />
          </View>
          <Pressable
            onPress={() => (status.playing ? player.pause() : player.play())}
            style={styles.playBtn}
            hitSlop={8}
          >
            <Ionicons
              name={status.playing ? 'pause-circle' : 'play-circle'}
              size={48}
              color={colors.accent}
            />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
  },
  header: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  logo: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
  },
  logoAccent: {
    color: colors.accent,
  },
  tagline: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  list: {
    paddingBottom: 120,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  rowPressed: {
    backgroundColor: colors.cardPressed,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 22,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
  },
  rowBtn: {
    padding: 4,
  },
  empty: {
    alignItems: 'center',
    marginTop: 72,
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  playerBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: colors.black,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  playerInfo: {
    flex: 1,
    gap: 2,
  },
  playerTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  playerTime: {
    color: colors.textMuted,
    fontSize: 12,
  },
  progressTrackMini: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 0,
    height: 3,
    backgroundColor: colors.border,
  },
  progressFillMini: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  playBtn: {
    marginLeft: 'auto',
  },
});