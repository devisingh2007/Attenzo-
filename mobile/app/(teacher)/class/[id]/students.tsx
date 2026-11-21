import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '../../../../constants/theme';
import {
  AppHeader,
  StudentCard,
  ConfirmationModal,
  LoadingIndicator,
  EmptyState,
  ErrorState,
} from '../../../../components';
import { useClassStudents } from '../../../../hooks/useClasses';
import { ClassStudentDto } from '../../../../services/classService';
import { NormalizedApiError } from '../../../../services/api';

export default function StudentListScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [searchQuery, setSearchQuery] = useState('');
  const [studentToRemove, setStudentToRemove] = useState<ClassStudentDto | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const {
    students,
    loading,
    error,
    refreshing,
    refresh,
    reload,
    removeStudent,
  } = useClassStudents(id, searchQuery);

  const handleConfirmRemove = async () => {
    if (!studentToRemove) return;
    try {
      setRemoving(true);
      setRemoveError(null);
      await removeStudent(studentToRemove.id);
      setStudentToRemove(null);
    } catch (err: any) {
      const apiError = err as NormalizedApiError;
      setRemoveError(apiError.message || 'Failed to remove student.');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title={`Students (${students.length})`}
        onBack={() => router.back()}
      />

      {loading && !refreshing && (
        <View style={styles.centerContainer}>
          <LoadingIndicator message="Loading enrolled students..." />
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

      {(!loading || refreshing) && !error && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
          }
        >
          {removeError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorBannerText}>{removeError}</Text>
            </View>
          )}

          {/* Search bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search name or roll no..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          {students.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title={searchQuery ? 'No students found' : 'No students yet'}
              message={
                searchQuery
                  ? `No student matches "${searchQuery}". Try a different search term.`
                  : 'Share your 6-character class join code with students to populate this roster.'
              }
              actionLabel={searchQuery ? 'Clear Search' : undefined}
              onAction={searchQuery ? () => setSearchQuery('') : undefined}
            />
          ) : (
            <View style={styles.studentList}>
              {students.map((student) => (
                <StudentCard
                  key={student.id}
                  name={student.name}
                  rollNumber={student.rollNumber}
                  onRemove={() => setStudentToRemove(student)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Remove Confirmation Modal */}
      <ConfirmationModal
        visible={Boolean(studentToRemove)}
        title="Remove Student?"
        message={`Remove ${studentToRemove?.name} (${studentToRemove?.rollNumber}) from this class? Their membership will be marked as removed.`}
        confirmLabel={removing ? 'Removing...' : 'Remove'}
        destructive
        onConfirm={handleConfirmRemove}
        onCancel={() => setStudentToRemove(null)}
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
    marginBottom: spacing.md,
  },
  errorBannerText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 48,
    marginBottom: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
  },
  studentList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
});
