import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../settings';
import { detectBaseUrl, apiHealth } from '../api';
import { colors, spacing, radius } from '../theme';

export default function SettingsScreen() {
  const { baseUrl, setBaseUrl, loading } = useSettings();
  const [draft, setDraft] = useState(baseUrl);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | 'ok' | 'error'>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setBaseUrl(draft);
      Alert.alert('Guardado', 'La URL del servidor se actualizó correctamente.');
    } catch {
      Alert.alert('Error', 'No se pudo guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await apiHealth(draft.trim().replace(/\/+$/, ''));
      setTestResult('ok');
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>
          A<Text style={styles.logoAccent}>justes</Text>
        </Text>
        <Text style={styles.tagline}>Servidor de extracción de audio</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>URL del backend</Text>
        <Text style={styles.cardHint}>
          La IP del ordenador que ejecuta {`\u201Cnode backend/server.js\u201D`} (puerto{' '}
          {4000}).
        </Text>
        <View style={styles.inputWrap}>
          <Ionicons name="server-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={(t) => {
              setDraft(t);
              setTestResult(null);
            }}
            placeholder={detectBaseUrl()}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>

        <View style={styles.actions}>
          <Pressable
            disabled={testing || saving}
            onPress={handleTest}
            style={[styles.btn, styles.btnSecondary]}
          >
            {testing ? (
              <ActivityIndicator color={colors.text} size="small" />
            ) : (
              <>
                <Ionicons name="pulse-outline" size={16} color={colors.text} />
                <Text style={styles.btnText}>Probar conexión</Text>
              </>
            )}
          </Pressable>
          <Pressable
            disabled={saving || testing}
            onPress={handleSave}
            style={[styles.btn, styles.btnPrimary]}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <>
                <Ionicons name="save-outline" size={16} color={colors.white} />
                <Text style={[styles.btnText, { color: colors.white }]}>Guardar</Text>
              </>
            )}
          </Pressable>
        </View>

        {testResult === 'ok' && (
          <View style={[styles.testBox, styles.testOk]}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.testOkText}>Conexión correcta con el backend.</Text>
          </View>
        )}
        {testResult === 'error' && (
          <View style={[styles.testBox, styles.testErr]}>
            <Ionicons name="alert-circle" size={16} color={colors.warning} />
            <Text style={styles.testErrText}>
              No se pudo conectar. ¿Está el backend en marcha y el teléfono en la misma red?
            </Text>
          </View>
        )}
      </View>

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.accent} size="small" />
          <Text style={styles.loadingText}>Cargando configuración…</Text>
        </View>
      )}

      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
        <Text style={styles.infoText}>
          Esta app usa un servidor propio para extraer audio de YouTube. Úsala únicamente con
          contenido cuyo uso tengas permitido (dominio público, licencias libres o bajo tu
          propiedad/permiso del autor). La descarga de material con copyright puede violar los
          términos de servicio de YouTube y la legislación de tu país.
        </Text>
      </View>
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
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  cardHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: radius.md,
  },
  btnSecondary: {
    backgroundColor: colors.bgElevated,
  },
  btnPrimary: {
    backgroundColor: colors.accent,
  },
  btnText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
  testBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  testOk: {
    backgroundColor: 'rgba(47, 213, 115, 0.12)',
  },
  testErr: {
    backgroundColor: 'rgba(255, 176, 32, 0.12)',
  },
  testOkText: {
    color: colors.success,
    fontSize: 12,
  },
  testErrText: {
    color: colors.warning,
    fontSize: 12,
    flex: 1,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  infoCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  infoText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
});