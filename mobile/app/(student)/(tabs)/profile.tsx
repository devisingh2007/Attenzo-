import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, radius, shadows } from '../../../constants/theme';
import { SecondaryButton, ConfirmationModal, StatusBadge } from '../../../components';
import { useAuthStore } from '../../../store/authStore';

export default function StudentProfileScreen() {
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
        <Text style={styles.screenTitle}>Student Profile</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name ? getInitials(user.name) : 'RP'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'Riya Patel'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'riya@example.com'}</Text>
          <View style={styles.badgeWrapper}>
            <StatusBadge status="present" label="Role: Student" />
          </View>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.cardHeader}>Academic Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Roll Number</Text>
            <Text style={styles.detailValue}>{user?.rollNumber || '21CE045'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Enrollment No.</Text>
            <Text style={styles.detailValue}>{user?.enrollmentNo || '210010107045'}</Text>
          </View>
        </View>

        <View style={styles.actionsCard}>
          <SecondaryButton
            title="Settings"
            icon="settings-outline"
            variant="outline"
            onPress={() => router.push('/(student)/settings' as any)}
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
  detailsCard: {
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
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  detailValue: {
    ...typography.bodyStrong,
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
