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
  StatusBadge,
  StudentCard,
  LoadingIndicator,
  EmptyState,
  ErrorState,
} from '../../../../components';
import {
  INITIAL_MOCK_HISTORY,
  INITIAL_MOCK_STUDENTS,
  MockHistorySession,
  MockStudent,
} from '../../../../constants/mockTeacherData';

export default function AttendanceHistoryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [activeTab, setActiveTab] = useState<'sessions' | 'students'>('sessions');
  const [sessions] = useState<MockHistorySession[]>(INITIAL_MOCK_HISTORY);
  const [students] = useState<MockStudent[]>(INITIAL_MOCK_STUDENTS);
  const [demoState, setDemoState] = useState<'default' | 'loading' | 'empty' | 'error'>('default');

  const handleOpenSession = (sessionId: string) => {
    router.push(`/(teacher)/session/${sessionId}` as any);
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

      {/* Segmented Tab Switcher */}
      <View style={styles.tabsContainer}>
        <Pressable
          onPress={() => setActiveTab('sessions')}
          style={[styles.tabButton, activeTab === 'sessions' && styles.tabButtonActive]}
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={activeTab === 'sessions' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[styles.tabButtonText, activeTab === 'sessions' && styles.tabButtonTextActive]}
          >
            Sessions ({sessions.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('students')}
          style={[styles.tabButton, activeTab === 'students' && styles.tabButtonActive]}
        >
          <Ionicons
            name="people-outline"
            size={18}
            color={activeTab === 'students' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[styles.tabButtonText, activeTab === 'students' && styles.tabButtonTextActive]}
          >
            Students ({students.length})
          </Text>
        </Pressable>
      </View>

      {demoState === 'loading' && (
        <View style={styles.centerContainer}>
          <LoadingIndicator message="Loading history records..." />
        </View>
      )}

      {demoState === 'error' && (
        <View style={styles.centerContainer}>
          <ErrorState
            message="Could not load attendance records. Please try again."
            onRetry={() => setDemoState('default')}
          />
        </View>
      )}

      {demoState === 'empty' && (
        <View style={styles.centerContainer}>
          <EmptyState
            icon="calendar-outline"
            title="No records yet"
            message="Start taking attendance sessions to see reports and history here."
          />
        </View>
      )}

      {demoState === 'default' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {activeTab === 'sessions' ? (
            /* Sessions Tab Content */
            <View style={styles.sessionsList}>
              {sessions.map((sess) => (
                <Pressable
                  key={sess.id}
                  style={({ pressed }) => [styles.sessionCard, pressed && styles.sessionCardPressed]}
                  onPress={() => handleOpenSession(sess.id)}
                >
                  <View style={styles.sessionLeft}>
                    <View style={styles.sessionHeaderRow}>
                      <Text style={styles.sessionDate}>{sess.date}</Text>
                      <StatusBadge status={sess.status} />
                    </View>
                    <Text style={styles.sessionTitle} numberOfLines={1}>
                      {sess.title}
                    </Text>
                  </View>

                  <View style={styles.sessionRight}>
                    <View style={styles.countBadge}>
                      <Text style={styles.countText}>
                        {sess.presentCount}/{sess.totalCount}
                      </Text>
                      <Text style={styles.countLabel}>Present</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            /* Students Tab Content */
            <View style={styles.studentsList}>
              <View style={styles.studentsNotice}>
                <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.studentsNoticeText}>
                  Students below the 75% required threshold are flagged with a warning.
                </Text>
              </View>

              {students.map((std) => (
                <StudentCard
                  key={std.id}
                  name={std.name}
                  rollNumber={std.rollNumber}
                  percentage={std.percentage}
                />
              ))}
            </View>
          )}
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: colors.primary,
  },
  tabButtonText: {
    ...typography.button,
    color: colors.textMuted,
    fontSize: 14,
  },
  tabButtonTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sessionsList: {
    gap: spacing.md,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    ...shadows.card,
  },
  sessionCardPressed: {
    backgroundColor: colors.background,
  },
  sessionLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  sessionDate: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  sessionTitle: {
    ...typography.h3,
    fontSize: 15,
    color: colors.textPrimary,
  },
  sessionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  countBadge: {
    alignItems: 'flex-end',
  },
  countText: {
    ...typography.h3,
    color: colors.primary,
    fontSize: 15,
  },
  countLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
  },
  studentsList: {
    gap: spacing.sm,
  },
  studentsNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  studentsNoticeText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
});
