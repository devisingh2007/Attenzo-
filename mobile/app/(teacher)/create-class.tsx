import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadows } from '../../constants/theme';
import { AppHeader, InputField, PrimaryButton } from '../../components';
import { classService } from '../../services/classService';
import { NormalizedApiError } from '../../services/api';

export default function CreateClassScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdClassId, setCreatedClassId] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const isValid = name.trim().length >= 2 && subjectCode.trim().length >= 2;

  const handleCreate = async () => {
    if (!isValid) return;

    try {
      setLoading(true);
      setServerError(null);
      const newClass = await classService.createClass({
        name: name.trim(),
        subjectCode: subjectCode.trim().toUpperCase(),
        description: description.trim() || undefined,
      });

      setCreatedClassId(newClass.id);
      setCreatedCode(newClass.joinCode || '------');
    } catch (err: any) {
      const apiError = err as NormalizedApiError;
      setServerError(apiError.message || 'Failed to create class. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(createdCode || '');
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoToClass = () => {
    if (createdClassId) {
      router.replace(`/(teacher)/class/${createdClassId}` as any);
    } else {
      router.replace('/(teacher)/(tabs)' as any);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="New Class"
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {serverError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color={colors.error} />
              <Text style={styles.errorBannerText}>{serverError}</Text>
            </View>
          )}

          {createdCode ? (
            /* Success View */
            <View style={styles.successCard}>
              <View style={styles.successIconWrapper}>
                <Ionicons name="checkmark-circle" size={56} color={colors.success} />
              </View>

              <Text style={styles.successTitle}>Class Created!</Text>
              <Text style={styles.successSubtitle}>
                Share this 6-character join code with your students to let them enroll.
              </Text>

              <View style={styles.codeContainer}>
                <Text style={styles.codeLabel}>JOIN CODE</Text>
                <Text style={styles.codeValue}>{createdCode}</Text>
                <Pressable
                  onPress={handleCopyCode}
                  style={[styles.copyButton, copied && styles.copyButtonActive]}
                >
                  <Ionicons
                    name={copied ? 'checkmark' : 'copy-outline'}
                    size={18}
                    color={copied ? colors.success : colors.primary}
                  />
                  <Text style={[styles.copyButtonText, copied && styles.copyButtonTextActive]}>
                    {copied ? 'Copied!' : 'Copy Code'}
                  </Text>
                </Pressable>
              </View>

              <PrimaryButton
                title="Go to Class Details"
                icon="arrow-forward"
                onPress={handleGoToClass}
                style={styles.actionBtn}
              />
            </View>
          ) : (
            /* Form View */
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Class Information</Text>

              <InputField
                label="Class Name"
                placeholder="e.g. Data Structures — A"
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  if (serverError) setServerError(null);
                }}
              />

              <InputField
                label="Subject Code"
                placeholder="e.g. CS301"
                value={subjectCode}
                onChangeText={(val) => {
                  setSubjectCode(val.toUpperCase());
                  if (serverError) setServerError(null);
                }}
                autoCapitalize="characters"
              />

              <View style={styles.multilineFieldContainer}>
                <Text style={styles.fieldLabel}>Description (Optional)</Text>
                <TextInput
                  style={styles.multilineInput}
                  placeholder="Course overview, semester info, or prerequisites..."
                  placeholderTextColor={colors.textMuted}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <PrimaryButton
                title="Create Class"
                icon="checkmark"
                loading={loading}
                disabled={!isValid || loading}
                onPress={handleCreate}
                style={styles.submitButton}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
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
    marginBottom: spacing.lg,
  },
  errorBannerText: {
    ...typography.body,
    color: colors.error,
    flex: 1,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  formTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  multilineFieldContainer: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  multilineInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 80,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  successCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.raised,
  },
  successIconWrapper: {
    marginBottom: spacing.md,
  },
  successTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  successSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  codeContainer: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  codeLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  codeValue: {
    ...typography.display,
    color: colors.primary,
    letterSpacing: 6,
    marginBottom: spacing.md,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  copyButtonActive: {
    borderColor: colors.success,
    backgroundColor: colors.successSoft,
  },
  copyButtonText: {
    ...typography.button,
    color: colors.primary,
    fontSize: 13,
  },
  copyButtonTextActive: {
    color: colors.success,
  },
  actionBtn: {
    width: '100%',
  },
});
