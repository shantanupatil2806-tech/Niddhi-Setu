import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../api/client';

export const UploadScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();

  // Form Fields
  const [refNumber, setRefNumber] = useState('');
  const [bankName, setBankName] = useState('State Bank of India');
  const [branch, setBranch] = useState('');
  const [amount, setAmount] = useState('5000000');
  const [issueDate, setIssueDate] = useState('2026-11-01');
  const [maturityDate, setMaturityDate] = useState('2031-11-01');

  // Selected file state
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    type: string;
    size?: number;
  } | null>(null);

  const [uploading, setUploading] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [createdFdrRef, setCreatedFdrRef] = useState('');

  // Quick Preset Banks
  const popularBanks = [
    'State Bank of India',
    'Punjab National Bank',
    'Canara Bank',
    'Bank of Baroda',
    'HDFC Bank',
    'ICICI Bank',
  ];

  // Pick Document (PDF/Doc)
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile({
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/pdf',
          size: file.size,
        });
      }
    } catch (err) {
      console.error('Document picker error:', err);
      Alert.alert('Selection Error', 'Unable to open file picker.');
    }
  };

  // Capture with Camera
  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera Permission', 'Camera permission is required to capture FDR receipts.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const photo = result.assets[0];
        const fileName = `Receipt_${Date.now()}.jpg`;
        setSelectedFile({
          uri: photo.uri,
          name: fileName,
          type: 'image/jpeg',
          size: photo.fileSize,
        });
      }
    } catch (err) {
      console.error('Camera error:', err);
      Alert.alert('Camera Error', 'Unable to capture photo.');
    }
  };

  const handleQuickFill = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setRefNumber(`SBI-FDR-2026-${randomNum}`);
    setBankName('State Bank of India');
    setBranch('Main Institutional Campus Branch');
    setAmount('5000000');
    setIssueDate('2026-11-01');
    setMaturityDate('2031-11-01');
  };

  const handleSubmit = async () => {
    if (!refNumber.trim()) {
      Alert.alert('Validation', 'Please enter the FDR Reference Number.');
      return;
    }
    if (!bankName.trim() || !amount.trim()) {
      Alert.alert('Validation', 'Please specify issuing bank and deposit amount.');
      return;
    }
    if (!selectedFile) {
      Alert.alert('Document Required', 'Please capture or attach the FDR deposit certificate file.');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('refNumber', refNumber.trim());
      formData.append('bankName', bankName.trim());
      formData.append('branch', branch.trim() || 'Main Branch');
      formData.append('amount', amount.trim());
      formData.append('issueDate', issueDate);
      formData.append('maturityDate', maturityDate);

      const instId = typeof user?.institutionId === 'object'
        ? user.institutionId._id || user.institutionId.id
        : user?.institutionId || 'inst-001';
      formData.append('institutionId', instId);

      // Append file
      if (Platform.OS === 'web') {
        const res = await fetch(selectedFile.uri);
        const blob = await res.blob();
        formData.append('document', blob, selectedFile.name);
      } else {
        formData.append('document', {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.type,
        } as any);
      }

      await apiService.submitFDR(formData);

      setCreatedFdrRef(refNumber.trim());
      setSuccessModal(true);

      // Reset form
      setRefNumber('');
      setBranch('');
      setSelectedFile(null);
    } catch (err: any) {
      console.error('FDR submission error:', err?.response?.data || err.message);
      Alert.alert(
        'Submission Failed',
        err?.response?.data?.error || 'Unable to upload FDR. Please verify connection and try again.'
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.topInfo}>
        <View style={styles.badgeRow}>
          <View style={styles.statusBadge}>
            <Ionicons name="cloud-upload" size={14} color="#0d9488" />
            <Text style={styles.statusBadgeText}>AICTE Deposit Intake</Text>
          </View>
          <TouchableOpacity onPress={handleQuickFill}>
            <Text style={styles.autoFillBtn}>Auto-Fill Demo</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Submit Fixed Deposit Receipt</Text>
        <Text style={styles.subtitle}>
          Upload scanned FDR certificate and register security guarantee with AICTE Council
        </Text>
      </View>

      {/* Document Picker Box */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>FDR Document Certificate *</Text>
        <Text style={styles.cardSubtitle}>
          Upload bank-stamped deposit receipt (PDF or Photo)
        </Text>

        {selectedFile ? (
          <View style={styles.fileSelectedBox}>
            <View style={styles.fileIconBox}>
              <Ionicons
                name={selectedFile.type.includes('image') ? 'image' : 'document-text'}
                size={24}
                color="#0d9488"
              />
            </View>
            <View style={styles.fileDetails}>
              <Text style={styles.fileName} numberOfLines={1}>
                {selectedFile.name}
              </Text>
              <Text style={styles.fileMeta}>
                {selectedFile.size ? `${(selectedFile.size / 1024).toFixed(1)} KB • ` : ''}
                Ready for Verification
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedFile(null)}>
              <Ionicons name="close-circle" size={22} color="#e11d48" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.pickButtonsRow}>
            <TouchableOpacity style={styles.pickBtn} onPress={takePhoto}>
              <Ionicons name="camera" size={22} color="#0d9488" />
              <Text style={styles.pickBtnText}>Scan with Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.pickBtn} onPress={pickDocument}>
              <Ionicons name="document-attach" size={22} color="#0d9488" />
              <Text style={styles.pickBtnText}>Select PDF / Image</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Form Fields Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Deposit Instrument Particulars</Text>

        {/* Ref Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>FDR Reference Number *</Text>
          <TextInput
            style={styles.input}
            value={refNumber}
            onChangeText={setRefNumber}
            placeholder="e.g. SBI-FDR-2026-8812"
            placeholderTextColor="#94a3b8"
            autoCapitalize="characters"
          />
        </View>

        {/* Bank Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Issuing Scheduled Commercial Bank *</Text>
          <TextInput
            style={styles.input}
            value={bankName}
            onChangeText={setBankName}
            placeholder="Enter Bank Name"
            placeholderTextColor="#94a3b8"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bankChipsRow}>
            {popularBanks.map((b) => (
              <TouchableOpacity
                key={b}
                style={[styles.bankChip, bankName === b && styles.bankChipActive]}
                onPress={() => setBankName(b)}
              >
                <Text style={[styles.bankChipText, bankName === b && styles.bankChipTextActive]}>
                  {b}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Branch Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Issuing Branch Name</Text>
          <TextInput
            style={styles.input}
            value={branch}
            onChangeText={setBranch}
            placeholder="e.g. Institutional Area Branch"
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* Principal Amount */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Principal Deposit Amount (INR) *</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="5000000"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
          />
        </View>

        {/* Issue & Maturity Date */}
        <View style={styles.dateRow}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.inputLabel}>Issue Date</Text>
            <TextInput
              style={styles.input}
              value={issueDate}
              onChangeText={setIssueDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94a3b8"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.inputLabel}>Maturity Date *</Text>
            <TextInput
              style={styles.input}
              value={maturityDate}
              onChangeText={setMaturityDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, uploading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="checkmark-done" size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>Submit Deposit to AICTE</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />

      {/* Success Modal */}
      <Modal visible={successModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconBox}>
              <Ionicons name="checkmark-circle" size={48} color="#10b981" />
            </View>
            <Text style={styles.modalTitle}>Deposit Submitted Successfully!</Text>
            <Text style={styles.modalDesc}>
              Reference <Text style={{ fontWeight: '700', color: '#0f172a' }}>{createdFdrRef}</Text> has
              been registered in the AICTE deposit repository and queued for officer scrutiny.
            </Text>
            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => {
                setSuccessModal(false);
                navigation.navigate('FDRs');
              }}
            >
              <Text style={styles.modalDoneText}>View in FDR Register</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  topInfo: {
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccfbf1',
    gap: 4,
  },
  statusBadgeText: {
    color: '#0d9488',
    fontSize: 11,
    fontWeight: '700',
  },
  autoFillBtn: {
    fontSize: 11,
    color: '#0284c7',
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 14,
  },
  pickButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pickBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#0d9488',
    backgroundColor: '#f0fdfa',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pickBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0d9488',
  },
  fileSelectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
  },
  fileIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#e6fffa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  fileMeta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0f172a',
  },
  bankChipsRow: {
    marginTop: 8,
  },
  bankChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bankChipActive: {
    backgroundColor: '#0d9488',
    borderColor: '#0d9488',
  },
  bankChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  bankChipTextActive: {
    color: '#ffffff',
  },
  dateRow: {
    flexDirection: 'row',
  },
  submitBtn: {
    backgroundColor: '#0d9488',
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#0d9488',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
  },
  modalIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  modalDesc: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    marginBottom: 20,
  },
  modalDoneBtn: {
    backgroundColor: '#0d9488',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  modalDoneText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
});
