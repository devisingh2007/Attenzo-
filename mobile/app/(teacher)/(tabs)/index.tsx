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

export default function TeacherDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { classes, loading, error, refreshing, refresh, reload } = useClasses();

  const handleCreateClass = () => {
    router.push('/(teacher)/create-class' as any);
  };

  const handleOpenClass = (classId: string) => {
    router.push(`/(teacher)/class/${classId}` as any);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.teacherName}>{user?.name || 'Instructor'}</Text>
        </View>

        <PrimaryButton
          title="New"
          icon="add"
          onPress={handleCreateClass}
          style={styles.newButton}
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
              message="Create your first class to share the join code and start taking attendance."
              actionLabel="Create Class"
              onAction={handleCreateClass}
            />
          </View>
        )}

        {!loading && !error && classes.length > 0 && (
          <View style={styles.classList}>
            <Text style={styles.sectionTitle}>Your Classes ({classes.length})</Text>

            {classes.map((cls) => (
              <ClassCard
                key={cls.id}
                name={cls.name}
                subjectCode={cls.subjectCode}
                studentCount={cls.studentCount ?? 0}
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
  teacherName: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  newButton: {
    minWidth: 84,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  classList: {
    gap: spacing.xs,
  },
  centerContainer: {
    paddingVertical: spacing.xxl,
  },
});
