import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadows } from '../../../../constants/theme';
import {
  AppHeader,
  AttendanceCard,
  SecondaryButton,
  LoadingIndicator,
  EmptyState,
  ErrorState,
} from '../../../../components';
import {
  INITIAL_STUDENT_CLASSES,
  INITIAL_STUDENT_RECORDS,
  MockStudentAttendanceRecord,
} from '../../../../constants/mockStudentData';

export default function StudentAttendanceHistoryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cls = INITIAL_STUDENT_CLASSES.find((c) => c.id === id) || INITIAL_STUDENT_CLASSES[0];

  const [records, setRecords] = useState<MockStudentAttendanceRecord[]>(INITIAL_STUDENT_RECORDS);
  const [demoState, setDemoState] = useState<'default' | 'loading' | 'empty' | 'error'>('default');
  const [page, setPage] = useState(1);

  const presentCount = records.filter((r) => r.status === 'present').length;
  const absentCount = records.filter((r) => r.status === 'absent').length;

  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Attendance History"
        onBack={() => router.back()}
      />

      {/* Dev review state bar */}
      <View style={styles.demoBar}>
        <Text style={styles.demoLabel}>Preview State:</Text>
        {(['default', 'loading', 'empty', 'error'] as const).map((st) => (
          <Pressable
            key={st}
            onPress={() => setDemoState(st)}
            style={[styles.demoPill, demoState === st && styles.demoPillActive]}
          >
            <Text style={[styles.demoPillText, demoState === st && styles.demoPillTextActive]}>
              {st}
            </Text>
          </Pressable>
        ))}
      </View>

      {demoState === 'loading' && (
        <View style={styles.centerContainer}>
          <LoadingIndicator message="Loading your attendance history..." />
        </View>
      )}

      {demoState === 'error' && (
        <View style={styles.centerContainer}>
          <ErrorState
            message="Could not load attendance history records. Please try again."
            onRetry={() => setDemoState('default')}
          />
        </View>
      )}

      {demoState === 'empty' && (
        <View style={styles.centerContainer}>
          <EmptyState
            icon="calendar-outline"
            title="No sessions yet"
            message="Your teacher has not held any attendance sessions for this class yet."
          />
        </View>
      )}

      {demoState === 'default' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Class Summary Bar */}
          <View style={styles.summaryBar}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{records.length}</Text>
              <Text style={styles.summaryLabel}>Total Sessions</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: colors.success }]}>{presentCount}</Text>
              <Text style={styles.summaryLabel}>Present</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: colors.error }]}>{absentCount}</Text>
              <Text style={styles.summaryLabel}>Absent</Text>
            </View>
          </View>

          {/* List of Attendance Cards (Newest first per S8) */}
          <View style={styles.recordsList}>
            <Text style={styles.listHeading}>Past Sessions ({records.length})</Text>

            {records.map((rec) => (
              <AttendanceCard
                key={rec.id}
                title={rec.title}
                date={rec.date}
                status={rec.status}
                method={rec.method}
              />
            ))}

            {page === 1 && (
              <SecondaryButton
                title="Load older sessions"
                icon="arrow-down-outline"
                onPress={handleLoadMore}
                style={styles.loadMoreBtn}
              />
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  demoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  demoLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginRight: spacing.xs,
    fontWeight: '600',
    fontSize: 11,
  },
  demoPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  demoPillText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    textTransform: 'capitalize',
  },
  demoPillTextActive: {
    color: colors.surface,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    ...shadows.card,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNumber: {
    ...typography.h2,
    color: colors.textPrimary,
    fontWeight: '800',
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  recordsList: {
    gap: spacing.sm,
  },
  listHeading: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  loadMoreBtn: {
    marginTop: spacing.md,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
});
