import React from 'react';
import { Stack } from 'expo-router';

export default function StudentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="join-class" />
      <Stack.Screen name="class/[id]/index" />
      <Stack.Screen name="class/[id]/mark" />
      <Stack.Screen name="class/[id]/history" />
      <Stack.Screen name="class/[id]/percentage" />
    </Stack>
  );
}
