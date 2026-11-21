import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadows } from '../../constants/theme';
import { InputField, PrimaryButton, SecondaryButton } from '../../components';
import { loginSchema, LoginFormValues } from '../../utils/schemas';
import { useAuthStore } from '../../store/authStore';
import { NormalizedApiError } from '../../services/api';

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isValid },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setLoading(true);
      setServerError(null);
      await login({
        email: data.email.trim(),
        password: data.password,
      });
      // RootLayout observes auth state and redirects automatically
    } catch (err: any) {
      const apiError = err as NormalizedApiError;
      if (apiError.details && apiError.details.length > 0) {
        apiError.details.forEach((d) => {
          setError(d.field as any, { type: 'server', message: d.message });
        });
      }
      setServerError(apiError.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (email: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', 'Passw0rd123', { shouldValidate: true });
    setServerError(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* BRAND LOGO */}
          <View style={styles.brandHeader}>
            <View style={styles.logoCircle}>
              <Ionicons name="school-outline" size={28} color={colors.primary} />
            </View>
            <Text style={styles.appName}>SmartPresence</Text>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Log in to manage and record class attendance</Text>
          </View>

          {/* BACKEND SERVER ERROR BANNER */}
          {serverError && (
            <View style={styles.serverErrorBanner}>
              <Ionicons name="alert-circle" size={20} color={colors.error} />
              <Text style={styles.serverErrorText}>{serverError}</Text>
            </View>
          )}

          {/* FORM */}
          <View style={styles.form}>
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
                  placeholder="Enter your password"
                  secureTextEntry
                  error={errors.password?.message}
                />
              )}
            />

            <PrimaryButton
              title="Log in"
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              disabled={!isValid || loading}
              style={styles.loginButton}
            />

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>New here? </Text>
              <Text style={styles.footerLink} onPress={() => router.push('/(auth)/register' as any)}>
                Create account
              </Text>
            </View>
          </View>

          {/* DEMO ACCOUNTS HELPER */}
          <View style={styles.mockSection}>
            <Text style={styles.mockSectionTitle}>Fill Demo Credentials (Seed Accounts)</Text>
            <View style={styles.mockButtonsRow}>
              <SecondaryButton
                title="Teacher: mehta@example.com"
                onPress={() => handleFillDemo('mehta@example.com')}
                style={styles.mockButton}
              />
              <SecondaryButton
                title="Student: riya@example.com"
                onPress={() => handleFillDemo('riya@example.com')}
                style={styles.mockButton}
              />
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
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  appName: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
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
  form: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  loginButton: {
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
  mockSection: {
    marginTop: spacing.xxl,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mockSectionTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  mockButtonsRow: {
    gap: spacing.sm,
  },
  mockButton: {
    width: '100%',
  },
});
