import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SettingsProvider } from './src/settings';
import { SearchResult } from './src/types';
import { colors, spacing } from './src/theme';
import SearchScreen from './src/screens/SearchScreen';
import DownloadScreen from './src/screens/DownloadScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import SettingsScreen from './src/screens/SettingsScreen';

type Tab = 'search' | 'library' | 'settings';

const TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'search', label: 'Buscar', icon: 'search' },
  { key: 'library', label: 'Biblioteca', icon: 'library' },
  { key: 'settings', label: 'Ajustes', icon: 'settings-outline' },
];

function RootNavigator() {
  const [tab, setTab] = useState<Tab>('search');
  const [downloadTarget, setDownloadTarget] = useState<SearchResult | null>(null);

  // Si hay una descarga activa, esa pantalla ocupa todo (incluida la barra de pestañas).
  if (downloadTarget) {
    return (
      <DownloadScreen
        video={downloadTarget}
        onBack={() => setDownloadTarget(null)}
        onOpenLibrary={() => {
          setDownloadTarget(null);
          setTab('library');
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.screen}>
        {tab === 'search' && <SearchScreen onOpenVideo={setDownloadTarget} />}
        {tab === 'library' && <LibraryScreen />}
        {tab === 'settings' && <SettingsScreen />}
      </View>

      <View style={styles.tabBar}>
        {TABS.map(({ key, label, icon }) => {
          const active = tab === key;
          return (
            <Pressable
              key={key}
              style={styles.tabItem}
              onPress={() => setTab(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Ionicons
                name={active ? (key === 'settings' ? 'settings' : icon) : icon}
                size={22}
                color={active ? colors.accent : colors.textMuted}
              />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  screen: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.bgElevated,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.md,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: colors.accent,
  },
});