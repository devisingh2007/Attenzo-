import React from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../../../constants/theme';
import {
  ClassCard,
  PrimaryButton,
  LoadingIndicator,
  EmptyState,
  ErrorState,
} from '../../../components';
import { useClasses } from '../../../hooks/useClasses';
import { useAuthStore } from '../../../store/authStore';

export default function StudentDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { classes, loading, error, refreshing, refresh, reload } = useClasses();

  const handleJoinClass = () => {
    router.push('/(student)/join-class' as any);
  };

  const handleOpenClass = (classId: string) => {
    router.push(`/(student)/class/${classId}` as any);
  };

  const firstName = user?.name ? user.name.split(' ')[0] : 'Student';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.greeting}>Hi,</Text>
          <Text style={styles.studentName}>{firstName}</Text>
        </View>

        <PrimaryButton
          title="Join class"
          icon="add"
          onPress={handleJoinClass}
          style={styles.joinButton}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        {loading && !refreshing && (
          <View style={styles.centerContainer}>
            <LoadingIndicator variant="skeleton" message="Loading your classes..." />
          </View>
        )}

        {!loading && error && (
          <View style={styles.centerContainer}>
            <ErrorState
              message={error}
              onRetry={reload}
            />
          </View>
        )}

        {!loading && !error && classes.length === 0 && (
          <View style={styles.centerContainer}>
            <EmptyState
              icon="book-outline"
              title="No classes yet"
              message="Join your first class using the 6-character code given by your teacher."
              actionLabel="Join Class"
              onAction={handleJoinClass}
            />
          </View>
        )}

        {!loading && !error && classes.length > 0 && (
          <View style={styles.classList}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Attendance Overview</Text>
              <Text style={styles.sectionSubtitle}>Tap a class to view details and mark attendance</Text>
            </View>

            {classes.map((cls) => (
              <ClassCard
                key={cls.id}
                name={cls.name}
                subjectCode={cls.subjectCode}
                subtitle={cls.teacher?.name ? `${cls.teacher.name} · ${cls.studentCount ?? 0} students` : `${cls.studentCount ?? 0} students`}
                activeSession={Boolean(cls.activeSession)}
                onPress={() => handleOpenClass(cls.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTextGroup: {
    flex: 1,
  },
  greeting: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  studentName: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  joinButton: {
    minWidth: 110,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  classList: {
    gap: spacing.xs,
  },
  centerContainer: {
    paddingVertical: spacing.xxl,
  },
});
