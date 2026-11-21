import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, radius, shadows } from '../../constants/theme';
import { AppHeader, SecondaryButton, ConfirmationModal } from '../../components';
import { useAuthStore } from '../../store/authStore';

export default function StudentSettingsScreen() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Settings" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.cardHeader}>About Application</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Name</Text>
            <Text style={styles.infoValue}>SmartPresence</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0 (Expo SDK 58)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Architecture</Text>
            <Text style={styles.infoValue}>REST API Client</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeader}>Account</Text>
          <SecondaryButton
            title="Log out"
            variant="danger"
            icon="log-out-outline"
            onPress={() => setShowLogoutModal(true)}
          />
        </View>

        <ConfirmationModal
          visible={showLogoutModal}
          title="Log out?"
          message="Are you sure you want to log out?"
          confirmLabel="Log out"
          destructive
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutModal(false)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.screenHorizontal,
    paddingTop: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardHeader: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.bodyStrong,
  },
});
