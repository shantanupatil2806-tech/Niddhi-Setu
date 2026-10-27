import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const { login, quickLogin, isLoading, serverUrl, updateServerUrl } = useAuth();
  const [email, setEmail] = useState('registrar@iitd.ac.in');
  const [password, setPassword] = useState('Inst@123');
  const [error, setError] = useState<string | null>(null);

  // Settings modal
  const [showSettings, setShowSettings] = useState(false);
  const [customUrl, setCustomUrl] = useState(serverUrl);

  const handleLogin = async () => {
    setError(null);
    if (!email || !password) {
      setError('Please provide email and password.');
      return;
    }
    const success = await login(email, password);
    if (!success) {
      setError('Unable to authenticate. Ensure your backend server is running and accessible.');
    }
  };

  const handlePreset = async (preset: 'iitd' | 'nitt' | 'bits') => {
    setError(null);
    const success = await quickLogin(preset);
    if (!success) {
      setError('Connection failed. Please check Server URL settings below.');
    }
  };

  const handleSaveUrl = () => {
    updateServerUrl(customUrl);
    setShowSettings(false);
    Alert.alert('Server Configured', `API URL updated to: ${customUrl}`);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Top Emblem */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={38} color="#ffffff" />
          </View>
          <Text style={styles.title}>Niddhi Setu</Text>
          <View style={styles.taglineBadge}>
            <Text style={styles.taglineText}>INSTITUTE COMPANION PORTAL</Text>
          </View>
          <Text style={styles.subtitle}>
            All-India Council for Technical Education (AICTE)
          </Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Institutional Sign In</Text>
          <Text style={styles.cardSubtitle}>
            Authenticate with registered registrar or finance credentials
          </Text>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#e11d48" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Quick presets */}
          <Text style={styles.presetLabel}>Quick Access Staging Presets:</Text>
          <View style={styles.presetRow}>
            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => handlePreset('iitd')}
              disabled={isLoading}
            >
              <Text style={styles.presetBtnText}>IIT Delhi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => handlePreset('nitt')}
              disabled={isLoading}
            >
              <Text style={styles.presetBtnText}>NIT Trichy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => handlePreset('bits')}
              disabled={isLoading}
            >
              <Text style={styles.presetBtnText}>BITS Pilani</Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Registered Official Email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="registrar@iitd.ac.in"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••••••"
                placeholderTextColor="#94a3b8"
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text style={styles.loginBtnText}>Access Institute Portal</Text>
                <Ionicons name="arrow-forward" size={16} color="#ffffff" style={{ marginLeft: 6 }} />
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>
          Synced live with Niddhi Setu AICTE Web Portal
        </Text>
      </ScrollView>

      {/* Settings Modal */}
      <Modal visible={showSettings} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Backend Server Connection</Text>
            <Text style={styles.modalSubtitle}>
              Specify your Express backend host (e.g. for phone on WiFi, enter your PC local IP address like http://192.168.1.5:5000/api)
            </Text>

            <TextInput
              style={styles.modalInput}
              value={customUrl}
              onChangeText={setCustomUrl}
              placeholder="http://localhost:5000/api"
              autoCapitalize="none"
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowSettings(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveUrl}>
                <Text style={styles.modalSaveText}>Save & Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070d1b',
  },
  scrollContent: {
    padding: 20,
    justifyContent: 'center',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#0d9488',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  taglineBadge: {
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.3)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 6,
  },
  taglineText: {
    color: '#2dd4bf',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffe4e6',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#be123c',
    flex: 1,
  },
  presetLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  presetBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0f172a',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: '#0f172a',
  },
  loginBtn: {
    backgroundColor: '#0d9488',
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#0d9488',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  settingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 4,
  },
  settingsLinkText: {
    fontSize: 11,
    color: '#0d9488',
    fontWeight: '500',
  },
  footerNote: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 11,
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 18,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    backgroundColor: '#f8fafc',
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  modalCancelText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 13,
  },
  modalSaveBtn: {
    backgroundColor: '#0d9488',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  modalSaveText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
});
