import React, { useState, useEffect } from 'react';
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
import { colors, typography, spacing, radius, shadows } from '../../../constants/theme';
import {
  AppHeader,
  StatusBadge,
  SecondaryButton,
  ConfirmationModal,
  LoadingIndicator,
  ErrorState,
} from '../../../components';
import {
  INITIAL_MOCK_ROSTER,
  MockRosterEntry,
} from '../../../constants/mockTeacherData';

export default function AttendanceSessionScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  // 10-minute session starting 2 mins ago (8 mins = 480 seconds left)
  const [sessionCode] = useState('482913');
  const [sessionTitle] = useState('Lecture 14 — Binary Search Trees');
  const [status, setStatus] = useState<'active' | 'ended'>('active');
  const [totalStudents] = useState(42);
  const [roster, setRoster] = useState<MockRosterEntry[]>(INITIAL_MOCK_ROSTER);

  // Local countdown
  const [remainingSeconds, setRemainingSeconds] = useState(480);
  const [showEndModal, setShowEndModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [demoState, setDemoState] = useState<'default' | 'loading' | 'error'>('default');

  // Compute present count dynamically from roster
  const presentCount = roster.filter((r) => r.status === 'present').length;

  useEffect(() => {
    if (status !== 'active') return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus('ended');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  const formatCountdown = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleManualToggle = (studentId: string) => {
    if (status === 'ended') return;

    setRoster((prev) =>
      prev.map((student) => {
        if (student.studentId === studentId) {
          const newStatus = student.status === 'present' ? 'absent' : 'present';
          return {
            ...student,
            status: newStatus,
            method: newStatus === 'present' ? 'manual' : null,
            markedAt: newStatus === 'present' ? 'Just now' : null,
          };
        }
        return student;
      })
    );
  };

  const handleEndSession = () => {
    setShowEndModal(false);
    setStatus('ended');
    setRemainingSeconds(0);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  };

  if (demoState === 'loading') {
    return (
      <View style={styles.container}>
        <AppHeader title="Session Details" onBack={() => router.back()} />
        <View style={styles.centerContainer}>
          <LoadingIndicator message="Loading live session..." />
          <SecondaryButton
            title="Return to preview"
            onPress={() => setDemoState('default')}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      </View>
    );
  }

  if (demoState === 'error') {
    return (
      <View style={styles.container}>
        <AppHeader title="Session Details" onBack={() => router.back()} />
        <View style={styles.centerContainer}>
          <ErrorState
            message="Could not load session details or session was deleted."
            onRetry={() => setDemoState('default')}
          />
        </View>
      </View>
    );
  }

  const isLowTime = remainingSeconds > 0 && remainingSeconds <= 60;

  return (
    <View style={styles.container}>
      <AppHeader
        title={sessionTitle}
        onBack={() => router.back()}
      />

      {/* Dev helper bar to test timer states */}
      <View style={styles.demoBar}>
        <Text style={styles.demoLabel}>Dev Timer Controls:</Text>
        <Pressable
          onPress={() => {
            setStatus('active');
            setRemainingSeconds(45);
          }}
          style={styles.demoPill}
        >
          <Text style={styles.demoPillText}>Set to 45s (Warning)</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setStatus('ended');
            setRemainingSeconds(0);
          }}
          style={styles.demoPill}
        >
          <Text style={styles.demoPillText}>Expire Now (Ended)</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setStatus('active');
            setRemainingSeconds(480);
          }}
          style={styles.demoPill}
        >
          <Text style={styles.demoPillText}>Reset (8m)</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Status & Code Display Card */}
        <View style={styles.codeCard}>
          <View style={styles.statusRow}>
            <StatusBadge
              status={status === 'active' ? 'active' : 'ended'}
              label={status === 'active' ? '● Session Active' : 'Session Ended'}
            />
            {status === 'active' && (
              <View style={[styles.timerBadge, isLowTime && styles.timerBadgeWarning]}>
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={isLowTime ? colors.error : colors.textSecondary}
                />
                <Text style={[styles.timerText, isLowTime && styles.timerTextWarning]}>
                  Expires in {formatCountdown(remainingSeconds)}
                </Text>
              </View>
            )}
          </View>

          {/* Big Session Code Display */}
          <View style={styles.bigCodeWrapper}>
            <Text style={styles.codeLabel}>ATTENDANCE CODE</Text>
            <Text style={styles.bigCodeText}>
              {sessionCode.split('').join(' ')}
            </Text>
            <Text style={styles.codeInstructions}>
              Students enter this 6-digit code on their phones to check in.
            </Text>
          </View>

          {/* Counters & Refresh */}
          <View style={styles.countsRow}>
            <View style={styles.countTextGroup}>
              <Text style={styles.presentCountBig}>{presentCount}</Text>
              <Text style={styles.presentCountTotal}>/ {totalStudents} Present</Text>
            </View>

            <Pressable
              onPress={handleRefresh}
              style={({ pressed }) => [styles.refreshBtn, pressed && styles.refreshBtnPressed]}
            >
              <Ionicons name="refresh" size={18} color={colors.primary} />
              <Text style={styles.refreshBtnText}>Refresh</Text>
            </Pressable>
          </View>

          {/* End Session Button */}
          {status === 'active' ? (
            <SecondaryButton
              title="End Session"
              icon="stop-circle-outline"
              variant="danger"
              onPress={() => setShowEndModal(true)}
              style={styles.endSessionBtn}
            />
          ) : (
            <View style={styles.endedBanner}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.endedBannerText}>This session has ended. Roster is read-only.</Text>
            </View>
          )}
        </View>

        {/* Live Roster Section */}
        <View style={styles.rosterSection}>
          <View style={styles.rosterHeader}>
            <Text style={styles.rosterTitle}>Class Roster</Text>
            <Text style={styles.rosterSubtitle}>Tap to mark present or absent manually</Text>
          </View>

          <View style={styles.rosterList}>
            {roster.map((student) => {
              const isPresent = student.status === 'present';
              return (
                <View key={student.studentId} style={styles.rosterRow}>
                  <View style={styles.rosterStudentInfo}>
                    <Text style={styles.studentName} numberOfLines={1}>
                      {student.name}
                    </Text>
                    <View style={styles.studentSubRow}>
                      <Text style={styles.studentRoll}>{student.rollNumber}</Text>
                      {student.method && (
                        <Text style={styles.studentMethod}>via {student.method}</Text>
                      )}
                      {student.markedAt && (
                        <Text style={styles.studentTime}>· {student.markedAt}</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.rosterActions}>
                    <StatusBadge status={isPresent ? 'present' : 'absent'} />

                    {status === 'active' && (
                      <Pressable
                        onPress={() => handleManualToggle(student.studentId)}
                        style={[
                          styles.toggleActionBtn,
                          isPresent ? styles.toggleActionAbsent : styles.toggleActionPresent,
                        ]}
                      >
                        <Text
                          style={[
                            styles.toggleActionText,
                            isPresent ? styles.toggleActionTextAbsent : styles.toggleActionTextPresent,
                          ]}
                        >
                          {isPresent ? 'Mark absent' : 'Mark present'}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* End Session Confirmation Modal */}
      <ConfirmationModal
        visible={showEndModal}
        title="End Attendance Session?"
        message="Are you sure you want to end this session early? Students will no longer be able to mark attendance with this code."
        confirmLabel="End Session"
        destructive
        onConfirm={handleEndSession}
        onCancel={() => setShowEndModal(false)}
      />
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
  demoPillText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  codeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.raised,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  timerBadgeWarning: {
    backgroundColor: colors.errorSoft,
  },
  timerText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  timerTextWarning: {
    color: colors.error,
    fontWeight: '700',
  },
  bigCodeWrapper: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 4,
  },
  bigCodeText: {
    ...typography.display,
    color: colors.primary,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 8,
    marginVertical: spacing.xs,
  },
  codeInstructions: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  countsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  countTextGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  presentCountBig: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  presentCountTotal: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  refreshBtnPressed: {
    opacity: 0.7,
  },
  refreshBtnText: {
    ...typography.button,
    color: colors.primary,
    fontSize: 13,
  },
  endSessionBtn: {
    marginTop: spacing.lg,
  },
  endedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  endedBannerText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  rosterSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  rosterHeader: {
    marginBottom: spacing.md,
  },
  rosterTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  rosterSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  rosterList: {
    gap: spacing.md,
  },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rosterStudentInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  studentName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  studentSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  studentRoll: {
    ...typography.caption,
    color: colors.textMuted,
  },
  studentMethod: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 11,
    textTransform: 'capitalize',
  },
  studentTime: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  rosterActions: {
    alignItems: 'flex-end',
    gap: 4,
  },
  toggleActionBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  toggleActionAbsent: {
    backgroundColor: colors.errorSoft,
  },
  toggleActionPresent: {
    backgroundColor: colors.successSoft,
  },
  toggleActionText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  toggleActionTextAbsent: {
    color: colors.error,
  },
  toggleActionTextPresent: {
    color: colors.success,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
});
