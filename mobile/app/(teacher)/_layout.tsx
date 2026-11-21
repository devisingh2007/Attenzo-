import React from 'react';
import { Stack } from 'expo-router';

export default function TeacherLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="create-class" />
      <Stack.Screen name="class/[id]/index" />
      <Stack.Screen name="class/[id]/students" />
      <Stack.Screen name="class/[id]/start-attendance" />
      <Stack.Screen name="class/[id]/history" />
      <Stack.Screen name="session/[sessionId]" />
    </Stack>
  );
}
