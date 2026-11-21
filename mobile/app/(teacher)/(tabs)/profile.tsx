import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, radius, shadows } from '../../../constants/theme';
import { SecondaryButton, ConfirmationModal, StatusBadge } from '../../../components';
import { useAuthStore } from '../../../store/authStore';

export default function TeacherProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenTitle}>Teacher Profile</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name ? getInitials(user.name) : 'PM'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'Prof. Mehta'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'mehta@example.com'}</Text>
          <View style={styles.badgeWrapper}>
            <StatusBadge status="active" label="Role: Teacher" />
          </View>
        </View>

        <View style={styles.actionsCard}>
          <SecondaryButton
            title="Settings"
            icon="settings-outline"
            variant="outline"
            onPress={() => router.push('/(teacher)/settings' as any)}
            style={styles.actionBtn}
          />
          <SecondaryButton
            title="Log out"
            icon="log-out-outline"
            variant="danger"
            onPress={() => setShowLogoutModal(true)}
            style={styles.actionBtn}
          />
        </View>

        <ConfirmationModal
          visible={showLogoutModal}
          title="Log out?"
          message="Are you sure you want to log out of SmartPresence?"
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
    paddingVertical: spacing.lg,
  },
  screenTitle: {
    ...typography.h1,
    marginBottom: spacing.lg,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    ...typography.h1,
    color: colors.primary,
  },
  userName: {
    ...typography.h2,
    marginBottom: 4,
  },
  userEmail: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  badgeWrapper: {
    marginTop: spacing.xs,
  },
  actionsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadows.card,
  },
  actionBtn: {
    width: '100%',
  },
});
