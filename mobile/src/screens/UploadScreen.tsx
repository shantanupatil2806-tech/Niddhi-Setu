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
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../api/client';

type UploadFile = {
  uri: string;
  name: string;
  type: string;
  size?: number;
};

export const UploadScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();

  // Form Fields
  const [refNumber, setRefNumber] = useState('');
  const [bankName, setBankName] = useState('State Bank of India');
  const [branch, setBranch] = useState('');
  const [amount, setAmount] = useState('5000000');
  const [issueDate, setIssueDate] = useState('2026-11-01');
  const [maturityDate, setMaturityDate] = useState('2031-11-01');
  const [interestRate, setInterestRate] = useState('7.1');
  const [compoundingFrequency, setCompoundingFrequency] = useState('quarterly');
  const [interestPayoutType, setInterestPayoutType] = useState('cumulative');

  // Statutory 5-Document State
  const [fdrFile, setFdrFile] = useState<UploadFile | null>(null);
  const [requestLetterFile, setRequestLetterFile] = useState<UploadFile | null>(null);
  const [affidavit6File, setAffidavit6File] = useState<UploadFile | null>(null);
  const [paymentProofFile, setPaymentProofFile] = useState<UploadFile | null>(null);
  const [eoaLoaFile, setEoaLoaFile] = useState<UploadFile | null>(null);

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
  const pickDoc = async (setter: (file: UploadFile | null) => void) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setter({
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
  const capturePhoto = async (setter: (file: UploadFile | null) => void) => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera Permission', 'Camera permission is required to capture documents.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const photo = result.assets[0];
        const fileName = `Scan_${Date.now()}.jpg`;
        setter({
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
    if (!fdrFile) {
      Alert.alert('Document Required', 'Please attach Document 1 (Official FDR Certificate).');
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
      formData.append('interestRate', interestRate.trim());
      formData.append('compoundingFrequency', compoundingFrequency);
      formData.append('interestPayoutType', interestPayoutType);

      const instId = typeof user?.institutionId === 'object'
        ? user.institutionId._id || user.institutionId.id
        : user?.institutionId || 'inst-001';
      formData.append('institutionId', instId);

      const appendFile = async (field: string, file: UploadFile) => {
        if (Platform.OS === 'web') {
          const res = await fetch(file.uri);
          const blob = await res.blob();
          formData.append(field, blob, file.name);
        } else {
          formData.append(field, {
            uri: file.uri,
            name: file.name,
            type: file.type,
          } as any);
        }
      };

      // Primary FDR Document
      await appendFile('document', fdrFile);

      // Statutory Supporting Documents
      if (requestLetterFile) await appendFile('request_letter', requestLetterFile);
      if (affidavit6File) await appendFile('affidavit_6', affidavit6File);
      if (paymentProofFile) await appendFile('payment_proof', paymentProofFile);
      if (eoaLoaFile) await appendFile('eoa_loa', eoaLoaFile);

      await apiService.submitFDR(formData);

      setCreatedFdrRef(refNumber.trim());
      setSuccessModal(true);

      // Reset form
      setRefNumber('');
      setBranch('');
      setFdrFile(null);
      setRequestLetterFile(null);
      setAffidavit6File(null);
      setPaymentProofFile(null);
      setEoaLoaFile(null);
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

  const renderDocCard = (
    title: string,
    desc: string,
    isMandatory: boolean,
    file: UploadFile | null,
    setter: (f: UploadFile | null) => void
  ) => (
    <View style={styles.docCard}>
      <View style={styles.docHeaderRow}>
        <Text style={styles.docCardTitle}>{title}</Text>
        {isMandatory && (
          <View style={styles.mandatoryBadge}>
            <Text style={styles.mandatoryBadgeText}>MANDATORY</Text>
          </View>
        )}
      </View>
      <Text style={styles.docCardSubtitle}>{desc}</Text>

      {file ? (
        <View style={styles.fileSelectedBox}>
          <View style={styles.fileIconBox}>
            <Ionicons
              name={file.type.includes('image') ? 'image' : 'document-text'}
              size={20}
              color="#0d9488"
            />
          </View>
          <View style={styles.fileDetails}>
            <Text style={styles.fileName} numberOfLines={1}>
              {file.name}
            </Text>
            <Text style={styles.fileMeta}>
              {file.size ? `${(file.size / 1024).toFixed(1)} KB • ` : ''}Ready for Upload
            </Text>
          </View>
          <TouchableOpacity onPress={() => setter(null)}>
            <Ionicons name="close-circle" size={22} color="#e11d48" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.pickButtonsRow}>
          <TouchableOpacity style={styles.pickBtn} onPress={() => capturePhoto(setter)}>
            <Ionicons name="camera" size={16} color="#0d9488" />
            <Text style={styles.pickBtnText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pickBtn} onPress={() => pickDoc(setter)}>
            <Ionicons name="document-attach" size={16} color="#0d9488" />
            <Text style={styles.pickBtnText}>Select File</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

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
          Upload scanned FDR certificate and statutory documents for AICTE custody
        </Text>
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

        {/* Contracted Interest Rate & Yield Preview */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Annual Interest Rate (% p.a.)</Text>
          <TextInput
            style={styles.input}
            value={interestRate}
            onChangeText={setInterestRate}
            placeholder="7.1"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
          />
        </View>

        {(() => {
          const p = Number(amount) || 0;
          const r = (Number(interestRate) || 7.1) / 100;
          const diffMs = Math.max(0, new Date(maturityDate).getTime() - new Date(issueDate).getTime());
          const t = Math.max(0.5, diffMs / (1000 * 60 * 60 * 24 * 365.25));
          const maturityEst = Math.round(p * Math.pow(1 + r / 4, 4 * t));
          const interestEst = Math.max(0, maturityEst - p);
          return (
            <View style={{ backgroundColor: '#f0fdfa', borderRadius: 8, padding: 12, marginTop: 10, borderWidth: 1, borderColor: '#ccfbf1' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#0f766e', textTransform: 'uppercase' }}>
                Financial Yield Valuation
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={{ fontSize: 12, color: '#334155' }}>Est. Maturity Value:</Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#0d9488' }}>
                  ₹ {maturityEst.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                <Text style={{ fontSize: 11, color: '#64748b' }}>Projected Accrued Interest:</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#059669' }}>
                  +₹ {interestEst.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          );
        })()}
      </View>

      {/* UNIFIED STATUTORY DOCUMENTS SECTION (DOCUMENTS 1 TO 5 TOGETHER) */}
      <View style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="shield-checkmark" size={18} color="#0d9488" />
          <Text style={styles.cardTitle}>Mandatory Statutory Documents</Text>
        </View>
        <Text style={styles.cardSubtitle}>
          Upload the 5 mandatory statutory documents prescribed for regulatory scrutiny
        </Text>

        {/* Doc 1: Official FDR Certificate (Mandatory) */}
        {renderDocCard(
          '1. Official FDR Certificate',
          'Scanned copy of official Fixed Deposit Receipt with AICTE joint-lien endorsement',
          true,
          fdrFile,
          setFdrFile
        )}

        {/* Doc 2: Institution Request Letter */}
        {renderDocCard(
          '2. Institution Request Letter',
          'Formal application on official institutional letterhead signed by authorized trustee',
          false,
          requestLetterFile,
          setRequestLetterFile
        )}

        {/* Doc 3: Affidavit 6 */}
        {renderDocCard(
          '3. Affidavit 6 (Prescribed Format)',
          'Sworn affidavit with Trust declarations and indemnity clauses on non-judicial stamp paper',
          false,
          affidavit6File,
          setAffidavit6File
        )}

        {/* Doc 4: RPGF Payment Proof */}
        {renderDocCard(
          '4. RPGF / Security Deposit Payment Proof',
          'Demand draft copies or electronic payment transaction receipts remitted to AICTE',
          false,
          paymentProofFile,
          setPaymentProofFile
        )}

        {/* Doc 5: Latest LoA / EoA */}
        {renderDocCard(
          '5. Latest Letter of Approval (LoA / EoA)',
          'Official AICTE approval letter confirming sanctioned intake and program tenure completion',
          false,
          eoaLoaFile,
          setEoaLoaFile
        )}

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
              <Text style={styles.submitBtnText}>Submit Deposit & Documents to AICTE</Text>
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
              Reference <Text style={{ fontWeight: '700', color: '#0f172a' }}>{createdFdrRef}</Text> and its statutory documents have been registered in the AICTE deposit repository and queued for officer scrutiny.
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
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccfbf1',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0d9488',
    marginLeft: 4,
  },
  autoFillBtn: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0d9488',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 12,
  },
  docCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  docHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  docCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  docCardSubtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 8,
  },
  mandatoryBadge: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mandatoryBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#e11d48',
  },
  fileSelectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 8,
    padding: 8,
  },
  fileIconBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065f46',
  },
  fileMeta: {
    fontSize: 9,
    color: '#047857',
    marginTop: 1,
  },
  pickButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingVertical: 8,
    gap: 4,
  },
  pickBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
  },
  bankChipsRow: {
    marginTop: 8,
    flexDirection: 'row',
  },
  bankChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bankChipActive: {
    backgroundColor: '#0d9488',
    borderColor: '#0d9488',
  },
  bankChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  bankChipTextActive: {
    color: '#ffffff',
  },
  dateRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  submitBtn: {
    backgroundColor: '#0d9488',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  modalIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  modalDoneBtn: {
    backgroundColor: '#0d9488',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
  },
  modalDoneText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
