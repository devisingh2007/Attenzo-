import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { LoadingIndicator } from '../components';
import { colors } from '../constants/theme';

export default function RootLayout() {
  const segments = useSegments();
  const router = useRouter();
  const { user, status, bootstrap } = useAuthStore();

  useEffect(() => {
    // Bootstrap authentication state on startup
    if (status === 'idle') {
      bootstrap();
    }
  }, [status, bootstrap]);

  useEffect(() => {
    // Avoid routing decisions while bootstrap is in flight
    if (status === 'idle' || status === 'loading') {
      return;
    }

    const firstSegment = segments[0] as string | undefined;
    const inAuthGroup = firstSegment === '(auth)';
    const inTeacherGroup = firstSegment === '(teacher)';
    const inStudentGroup = firstSegment === '(student)';

    if (status === 'unauthenticated' || !user) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login' as any);
      }
    } else if (status === 'authenticated') {
      if (user.role === 'teacher' && !inTeacherGroup) {
        router.replace('/(teacher)/(tabs)' as any);
      } else if (user.role === 'student' && !inStudentGroup) {
        router.replace('/(student)/(tabs)' as any);
      }
    }
  }, [user, status, segments, router]);

  if (status === 'idle' || status === 'loading') {
    return (
      <View style={styles.splashContainer}>
        <LoadingIndicator message="Starting SmartPresence..." />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(teacher)" />
      <Stack.Screen name="(student)" />
      <Stack.Screen name="index" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
