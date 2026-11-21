import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadows } from '../../../../constants/theme';
import {
  AppHeader,
  PrimaryButton,
  LoadingIndicator,
  ErrorState,
} from '../../../../components';
import { useClassDetails } from '../../../../hooks/useClasses';

export default function StudentClassDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { classDetails: cls, loading, error, refreshing, refresh, reload } = useClassDetails(id);

  const handleMarkAttendance = () => {
    if (!cls) return;
    router.push(`/(student)/class/${cls.id}/mark` as any);
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
        {/* Class Subtitle Info */}
        <View style={styles.teacherHeaderCard}>
          <View style={styles.codePill}>
            <Text style={styles.codeText}>{cls.subjectCode}</Text>
          </View>
          <Text style={styles.teacherNameText}>{cls.teacher?.name || 'Instructor'}</Text>
          <Text style={styles.studentCountText}>{cls.studentCount ?? 0} students enrolled</Text>
          {cls.description ? (
            <Text style={styles.descriptionText}>{cls.description}</Text>
          ) : null}
        </View>

        {/* Live Session Alert Banner (S6 spec: shown when activeSession != null) */}
        {hasActiveSession && (
          <View style={styles.activeSessionCard}>
            <View style={styles.activeHeaderRow}>
              <View style={styles.activeDot} />
              <Text style={styles.activeTitle}>Session may be active</Text>
            </View>
            <Text style={styles.activeSubtitle}>
              An attendance session is currently open for this class. Enter the 6-digit code displayed by your teacher to record your presence.
            </Text>
            <PrimaryButton
              title="Mark attendance"
              icon="checkmark-circle-outline"
              onPress={handleMarkAttendance}
              style={{ backgroundColor: colors.warning }}
            />
          </View>
        )}

        {/* Navigation Rows */}
        <View style={styles.navSection}>
          <Pressable
            style={({ pressed }) => [styles.navRow, pressed && styles.cardPressed]}
            onPress={() => router.push(`/(student)/class/${cls.id}/history` as any)}
          >
            <View style={styles.navIconCircle}>
              <Ionicons name="time-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.navTextCol}>
              <Text style={styles.navRowTitle}>Attendance history</Text>
              <Text style={styles.navRowSubtitle}>Session-by-session records and status</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={({ pressed }) => [styles.navRow, pressed && styles.cardPressed]}
            onPress={() => router.push(`/(student)/class/${cls.id}/percentage` as any)}
          >
            <View style={styles.navIconCircle}>
              <Ionicons name="pie-chart-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.navTextCol}>
              <Text style={styles.navRowTitle}>Attendance percentage</Text>
              <Text style={styles.navRowSubtitle}>Target threshold and detailed breakdown</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      </ScrollView>
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
  teacherHeaderCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  codePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  codeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  teacherNameText: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  studentCountText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  descriptionText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  activeSessionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.warning,
    ...shadows.card,
  },
  activeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.warning,
  },
  activeTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  activeSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
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
  cardPressed: {
    backgroundColor: colors.background,
  },
  navIconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTextCol: {
    flex: 1,
  },
  navRowTitle: {
    ...typography.h3,
    fontSize: 16,
    color: colors.textPrimary,
  },
  navRowSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 68,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
});
