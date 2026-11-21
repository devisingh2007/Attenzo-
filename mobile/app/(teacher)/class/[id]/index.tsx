import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadows } from '../../../../constants/theme';
import {
  AppHeader,
  PrimaryButton,
  SecondaryButton,
  ConfirmationModal,
  LoadingIndicator,
  ErrorState,
} from '../../../../components';
import { useClassDetails } from '../../../../hooks/useClasses';
import { classService } from '../../../../services/classService';
import { NormalizedApiError } from '../../../../services/api';

export default function ClassDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { classDetails: cls, loading, error, refreshing, refresh, reload } = useClassDetails(id);

  const [copied, setCopied] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleCopyCode = () => {
    if (cls?.joinCode) {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(cls.joinCode);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrimaryAction = () => {
    if (!cls) return;
    if (cls.activeSession) {
      router.push(`/(teacher)/session/${cls.activeSession.id}` as any);
    } else {
      router.push(`/(teacher)/class/${cls.id}/start-attendance` as any);
    }
  };

  const handleDeleteClass = async () => {
    if (!cls) return;
    try {
      setDeleteLoading(true);
      setDeleteError(null);
      await classService.deleteClass(cls.id);
      setShowDeleteModal(false);
      router.replace('/(teacher)/(tabs)' as any);
    } catch (err: any) {
      const apiError = err as NormalizedApiError;
      setDeleteError(apiError.message || 'Failed to delete class.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <AppHeader title="Class Details" onBack={() => router.back()} />
        <View style={styles.centerContainer}>
          <LoadingIndicator message="Loading class details..." />
        </View>
      </View>
    );
  }

  if (error || !cls) {
    return (
      <View style={styles.container}>
        <AppHeader title="Class Details" onBack={() => router.back()} />
        <View style={styles.centerContainer}>
          <ErrorState
            message={error || 'Class not found.'}
            onRetry={reload}
          />
        </View>
      </View>
    );
  }

  const hasActiveSession = Boolean(cls.activeSession);

  return (
    <View style={styles.container}>
      <AppHeader
        title={cls.name}
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        {deleteError && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={colors.error} />
            <Text style={styles.errorBannerText}>{deleteError}</Text>
          </View>
        )}

        {/* Join Code Banner Card */}
        {cls.joinCode ? (
          <View style={styles.joinCodeCard}>
            <View style={styles.joinCodeLeft}>
              <Text style={styles.joinCodeCaption}>CLASS JOIN CODE</Text>
              <Text style={styles.joinCodeText}>{cls.joinCode}</Text>
            </View>

            <Pressable
              onPress={handleCopyCode}
              style={[styles.copyBtn, copied && styles.copyBtnCopied]}
              accessibilityRole="button"
            >
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={18}
                color={copied ? colors.success : colors.primary}
              />
              <Text style={[styles.copyBtnText, copied && styles.copyBtnTextCopied]}>
                {copied ? 'Copied' : 'Copy'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Overview Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.codeBadge}>
              <Text style={styles.codeBadgeText}>{cls.subjectCode}</Text>
            </View>
            <Text style={styles.studentsCountText}>{cls.studentCount ?? 0} Students Enrolled</Text>
          </View>

          {cls.description ? (
            <Text style={styles.descriptionText}>{cls.description}</Text>
          ) : null}

          {hasActiveSession && cls.activeSession ? (
            <View style={styles.activeBanner}>
              <View style={styles.activeDot} />
              <View style={styles.activeBannerTextCol}>
                <Text style={styles.activeBannerTitle}>Attendance Session Active</Text>
                <Text style={styles.activeBannerSub}>
                  Expires at {new Date(cls.activeSession.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {cls.activeSession.sessionCode ? ` · Code: ${cls.activeSession.sessionCode}` : ''}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Primary Action Button */}
          <PrimaryButton
            title={hasActiveSession ? 'View Live Session' : 'Start Attendance'}
            icon={hasActiveSession ? 'radio-button-on' : 'timer-outline'}
            onPress={handlePrimaryAction}
            style={hasActiveSession ? { ...styles.primaryActionBtn, backgroundColor: colors.warning } : styles.primaryActionBtn}
          />
        </View>

        {/* Navigation Sections */}
        <View style={styles.navSection}>
          <Pressable
            style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]}
            onPress={() => router.push(`/(teacher)/class/${cls.id}/students` as any)}
          >
            <View style={styles.navRowIconWrapper}>
              <Ionicons name="people-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.navRowInfo}>
              <Text style={styles.navRowTitle}>Students</Text>
              <Text style={styles.navRowSubtitle}>View roster ({cls.studentCount ?? 0} students), search & remove</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]}
            onPress={() => router.push(`/(teacher)/class/${cls.id}/history` as any)}
          >
            <View style={styles.navRowIconWrapper}>
              <Ionicons name="calendar-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.navRowInfo}>
              <Text style={styles.navRowTitle}>Attendance History</Text>
              <Text style={styles.navRowSubtitle}>View past sessions and student percentages</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Danger Zone: Delete Class */}
        <View style={styles.dangerCard}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          <SecondaryButton
            title="Delete Class"
            icon="trash-outline"
            variant="danger"
            onPress={() => setShowDeleteModal(true)}
            style={styles.deleteBtn}
          />
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Class?"
        message={`Are you sure you want to delete "${cls.name}"? Active attendance sessions will be closed.`}
        confirmLabel={deleteLoading ? 'Deleting...' : 'Delete Class'}
        destructive
        onConfirm={handleDeleteClass}
        onCancel={() => setShowDeleteModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.errorSoft,
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorBannerText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
    flex: 1,
  },
  joinCodeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  joinCodeLeft: {
    flex: 1,
  },
  joinCodeCaption: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 2,
  },
  joinCodeText: {
    ...typography.h2,
    color: colors.primary,
    letterSpacing: 4,
    fontWeight: '800',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  copyBtnCopied: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  copyBtnText: {
    ...typography.button,
    color: colors.primary,
    fontSize: 13,
  },
  copyBtnTextCopied: {
    color: colors.success,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  codeBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  codeBadgeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  studentsCountText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  descriptionText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.warning,
  },
  activeBannerTextCol: {
    flex: 1,
  },
  activeBannerTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  activeBannerSub: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  primaryActionBtn: {
    marginTop: spacing.xs,
  },
  navSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.card,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  navRowPressed: {
    backgroundColor: colors.background,
  },
  navRowIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRowInfo: {
    flex: 1,
  },
  navRowTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontSize: 16,
    marginBottom: 2,
  },
  navRowSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 68,
  },
  dangerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.errorSoft,
  },
  dangerTitle: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  deleteBtn: {
    width: '100%',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
});
