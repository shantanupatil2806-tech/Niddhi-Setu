import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../api/client';

export const ProfileScreen: React.FC = () => {
  const { user, instituteName, logout, serverUrl, updateServerUrl } = useAuth();
  const [editingUrl, setEditingUrl] = useState(serverUrl);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'online' | 'offline'>('idle');

  const handleTestConnection = async () => {
    setTestingConnection(true);
    const ok = await apiService.checkHealth();
    setConnectionStatus(ok ? 'online' : 'offline');
    setTestingConnection(false);
  };

  const handleSaveUrl = () => {
    updateServerUrl(editingUrl);
    Alert.alert('Server Configured', `Updated base URL to: ${editingUrl}`);
    handleTestConnection();
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of Niddhi Setu?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name ? user.name[0].toUpperCase() : 'I'}</Text>
        </View>
        <Text style={styles.nameText}>{user?.name}</Text>
        <Text style={styles.instituteText}>{instituteName}</Text>
        <View style={styles.roleTag}>
          <Text style={styles.roleTagText}>AICTE Affiliated Institution</Text>
        </View>
      </View>

      {/* Account Info */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Account Details</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Official Email:</Text>
          <Text style={styles.infoVal}>{user?.email}</Text>
        </View>

        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.infoLabel}>Institutional Role:</Text>
          <Text style={[styles.infoVal, { textTransform: 'capitalize' }]}>
            {user?.role || 'Institution'}
          </Text>
        </View>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color="#e11d48" style={{ marginRight: 6 }} />
        <Text style={styles.logoutBtnText}>Sign Out from Mobile App</Text>
      </TouchableOpacity>

      <Text style={styles.versionNote}>
        Niddhi Setu Mobile Companion • Ministry of Education / AICTE
      </Text>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#070d1b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#0d9488',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2dd4bf',
  },
  nameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  instituteText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    textAlign: 'center',
  },
  roleTag: {
    backgroundColor: '#f0fdfa',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#ccfbf1',
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0d9488',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  serverHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  pingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  urlInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 12,
    color: '#0f172a',
    marginBottom: 12,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0fdfa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccfbf1',
  },
  testBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0d9488',
  },
  saveBtn: {
    backgroundColor: '#0d9488',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
  },
  logoutBtnText: {
    color: '#e11d48',
    fontSize: 13,
    fontWeight: '700',
  },
  versionNote: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 18,
  },
});
