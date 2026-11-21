import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LoadingIndicator } from '../components';
import { colors } from '../constants/theme';

export default function IndexScreen() {
  return (
    <View style={styles.container}>
      <LoadingIndicator message="Connecting..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
