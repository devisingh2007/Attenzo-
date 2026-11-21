import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { SERVER_BASE_URL } from '../constants/config';

// TODO: Temporary server connectivity test. Remove in Part 7.1.
export default function HomeScreen() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const testServer = async () => {
    setLoading(true);
    setStatus(null);
    setIsError(false);
    try {
      const response = await axios.get(`${SERVER_BASE_URL}/health`, { timeout: 5000 });
      setStatus(`Success: ${JSON.stringify(response.data)}`);
      setIsError(false);
    } catch (err: unknown) {
      setIsError(true);
      if (axios.isAxiosError(err)) {
        setStatus(`Error: ${err.message} (${err.code ?? 'unknown'})`);
      } else if (err instanceof Error) {
        setStatus(`Error: ${err.message}`);
      } else {
        setStatus('Error: Unable to connect to server');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Teacher–Student Attendance App</Text>
      <Text style={styles.subtitle}>Mobile App Initialized (SDK 58)</Text>

      <View style={styles.card}>
        <Text style={styles.cardHeader}>Server Connectivity Test</Text>
        <Text style={styles.serverUrl}>Target: {SERVER_BASE_URL}/health</Text>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={testServer}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Test server</Text>
          )}
        </TouchableOpacity>

        {status && (
          <View style={[styles.statusBox, isError ? styles.statusError : styles.statusSuccess]}>
            <Text style={isError ? styles.statusErrorText : styles.statusSuccessText}>
              {status}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  serverUrl: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  statusBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 8,
  },
  statusSuccess: {
    backgroundColor: '#DCFCE7',
  },
  statusSuccessText: {
    color: '#166534',
    fontSize: 13,
  },
  statusError: {
    backgroundColor: '#FEE2E2',
  },
  statusErrorText: {
    color: '#991B1B',
    fontSize: 13,
  },
});
