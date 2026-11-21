import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadows } from '../../constants/theme';
import { InputField, PrimaryButton } from '../../components';
import { registerSchema, RegisterFormValues } from '../../utils/schemas';
import { useAuthStore } from '../../store/authStore';
import { NormalizedApiError } from '../../services/api';

export default function RegisterScreen() {
  const router = useRouter();
  const registerUser = useAuthStore((state) => state.register);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isValid },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'student',
      rollNumber: '',
      enrollmentNo: '',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      setLoading(true);
      setServerError(null);

      await registerUser({
        name: data.name.trim(),
        email: data.email.trim(),
        password: data.password,
        role: data.role,
        rollNumber: data.role === 'student' ? data.rollNumber?.trim() : undefined,
        enrollmentNo: data.role === 'student' ? data.enrollmentNo?.trim() || undefined : undefined,
      });
      // RootLayout will automatically route to role tabs
    } catch (err: any) {
      const apiError = err as NormalizedApiError;
      if (apiError.details && apiError.details.length > 0) {
        apiError.details.forEach((d) => {
          setError(d.field as any, { type: 'server', message: d.message });
        });
      }
      setServerError(apiError.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Get started with smart classroom attendance</Text>
          </View>

          {/* BACKEND SERVER ERROR BANNER */}
          {serverError && (
            <View style={styles.serverErrorBanner}>
              <Ionicons name="alert-circle" size={20} color={colors.error} />
              <Text style={styles.serverErrorText}>{serverError}</Text>
            </View>
          )}

          {/* ROLE SEGMENTED SELECTOR */}
          <View style={styles.roleContainer}>
            <Text style={styles.roleLabel}>I am a:</Text>
            <View style={styles.segmentedControl}>
              <Pressable
                style={[
                  styles.segmentButton,
                  selectedRole === 'teacher' && styles.segmentButtonActive,
                ]}
                onPress={() => {
                  setValue('role', 'teacher', { shouldValidate: true });
                  if (serverError) setServerError(null);
                }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    selectedRole === 'teacher' && styles.segmentTextActive,
                  ]}
                >
                  Teacher
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.segmentButton,
                  selectedRole === 'student' && styles.segmentButtonActive,
                ]}
                onPress={() => {
                  setValue('role', 'student', { shouldValidate: true });
                  if (serverError) setServerError(null);
                }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    selectedRole === 'student' && styles.segmentTextActive,
                  ]}
                >
                  Student
                </Text>
              </Pressable>
            </View>
          </View>

          {/* FORM FIELDS */}
          <View style={styles.form}>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, value } }) => (
                <InputField
                  label="Full Name"
                  value={value}
                  onChangeText={(val) => {
                    onChange(val);
                    if (serverError) setServerError(null);
                  }}
                  placeholder={selectedRole === 'teacher' ? 'e.g. Prof. Mehta' : 'e.g. Riya Patel'}
                  error={errors.name?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <InputField
                  label="Email address"
                  value={value}
                  onChangeText={(val) => {
                    onChange(val);
                    if (serverError) setServerError(null);
                  }}
                  placeholder="name@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <InputField
                  label="Password"
                  value={value}
                  onChangeText={(val) => {
                    onChange(val);
                    if (serverError) setServerError(null);
                  }}
                  placeholder="At least 8 chars (letters + numbers)"
                  secureTextEntry
                  error={errors.password?.message}
                />
              )}
            />

            {/* CONDITIONAL STUDENT FIELDS */}
            {selectedRole === 'student' && (
              <>
                <Controller
                  control={control}
                  name="rollNumber"
                  render={({ field: { onChange, value } }) => (
                    <InputField
                      label="Roll Number"
                      value={value || ''}
                      onChangeText={(val) => {
                        onChange(val);
                        if (serverError) setServerError(null);
                      }}
                      placeholder="e.g. 21CE045"
                      autoCapitalize="characters"
                      error={errors.rollNumber?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="enrollmentNo"
                  render={({ field: { onChange, value } }) => (
                    <InputField
                      label="Enrollment No. (Optional)"
                      value={value || ''}
                      onChangeText={(val) => {
                        onChange(val);
                        if (serverError) setServerError(null);
                      }}
                      placeholder="e.g. 210010107045"
                      error={errors.enrollmentNo?.message}
                    />
                  )}
                />
              </>
            )}

            <PrimaryButton
              title="Create account"
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              disabled={!isValid || loading}
              style={styles.submitButton}
            />

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Text style={styles.footerLink} onPress={() => router.push('/(auth)/login' as any)}>
                Log in
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  serverErrorBanner: {
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
  serverErrorText: {
    ...typography.body,
    color: colors.error,
    flex: 1,
    fontWeight: '600',
  },
  roleContainer: {
    marginBottom: spacing.lg,
  },
  roleLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    ...typography.bodyStrong,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.textOnPrimary,
  },
  form: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  footerLink: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
});
