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

export default function MyClassesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { classes, loading, error, refreshing, refresh, reload } = useClasses();

  const handleJoinClass = () => {
    router.push('/(student)/join-class' as any);
  };

  const handleOpenClass = (classId: string) => {
    router.push(`/(student)/class/${classId}` as any);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Classes</Text>
        <PrimaryButton
          title="Join"
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
            <LoadingIndicator variant="skeleton" message="Loading your enrolled classes..." />
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
              title="No enrolled classes"
              message="You haven't joined any classes yet. Ask your instructor for the class join code."
              actionLabel="Join Class"
              onAction={handleJoinClass}
            />
          </View>
        )}

        {!loading && !error && classes.length > 0 && (
          <View style={styles.classList}>
            <Text style={styles.sectionTitle}>Enrolled Classes ({classes.length})</Text>

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
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  joinButton: {
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
