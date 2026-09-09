import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchResult } from '../types';
import { apiSearch } from '../api';
import { useSettings } from '../settings';
import { colors, spacing, radius } from '../theme';
import { formatViews, isYouTubeUrl } from '../utils';

type Props = {
  onOpenVideo: (video: SearchResult) => void;
};

export default function SearchScreen({ onOpenVideo }: Props) {
  const { baseUrl } = useSettings();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doSearch = async (rawQuery?: string) => {
    const term = (rawQuery ?? query).trim();
    if (!term) return;
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    try {
      // Si el usuario pega una URL de YouTube, vamos directo a descargar.
      if (isYouTubeUrl(term)) {
        onOpenVideo({
          id: 'paste',
          title: term,
          duration: 0,
          durationText: null,
          channel: '',
          views: 0,
          thumbnail: '',
          url: term,
        });
        return;
      }
      const found = await apiSearch(baseUrl, term);
      setResults(found);
      if (found.length === 0) {
        setError('Sin resultados. Prueba con otra búsqueda o pega la URL exacta del video.');
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No se pudo conectar con el backend. Revisa la URL en Ajustes.'
      );
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: SearchResult }) => (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onOpenVideo(item)}
    >
      <View style={styles.thumbWrap}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Ionicons name="musical-notes" size={28} color={colors.textMuted} />
          </View>
        )}
        {!!item.durationText && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{item.durationText}</Text>
          </View>
        )}
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>
          {item.channel}
          {item.views > 0 ? ` · ${formatViews(item.views)} vistas` : ''}
        </Text>
      </View>
      <Ionicons name="download-outline" size={20} color={colors.accent} />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>down<Text style={styles.logoAccent}>Music</Text></Text>
        <Text style={styles.tagline}>Busca y descarga audio de YouTube</Text>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Canción, artista o URL de YouTube…"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => doSearch()}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [styles.searchBtn, pressed && styles.searchBtnPressed]}
        onPress={() => doSearch()}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.searchBtnText}>Buscar</Text>
        )}
      </Pressable>

      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {results !== null && results.length > 0 && !loading && (
        <Text style={styles.resultsLabel}>{results.length} resultado{results.length === 1 ? '' : 's'}</Text>
      )}

      <FlatList
        data={loading ? [] : results || []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading && results !== null && results.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>Busca tu música favorita</Text>
            </View>
          ) : null
        }
      />
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
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  logoAccent: {
    color: colors.accent,
  },
  tagline: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    height: 48,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  searchBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnPressed: {
    backgroundColor: colors.accentPressed,
  },
  searchBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    backgroundColor: 'rgba(255, 176, 32, 0.12)',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: {
    color: colors.warning,
    fontSize: 13,
    flex: 1,
  },
  resultsLabel: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  list: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    rowGap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.md,
  },
  rowPressed: {
    backgroundColor: colors.cardPressed,
  },
  thumbWrap: {
    position: 'relative',
  },
  thumb: {
    width: 96,
    height: 54,
    borderRadius: radius.sm,
    backgroundColor: colors.bgElevated,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  durationText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '600',
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
  empty: {
    alignItems: 'center',
    marginTop: 48,
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});