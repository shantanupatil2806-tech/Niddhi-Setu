import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../api/client';
import { FDR } from '../types';

export const FDRListScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const [fdrs, setFdrs] = useState<FDR[]>([]);
  const [filteredFdrs, setFilteredFdrs] = useState<FDR[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Detail Modal
  const [selectedFdr, setSelectedFdr] = useState<FDR | null>(null);
  const [releaseModal, setReleaseModal] = useState(false);
  const [releaseReason, setReleaseReason] = useState('');
  const [submittingRelease, setSubmittingRelease] = useState(false);

  const loadFDRs = useCallback(async () => {
    try {
      const items = await apiService.getFDRs();
      setFdrs(items);
    } catch (err) {
      console.error('Error fetching FDRs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFDRs();
  }, [loadFDRs]);

  // Handle route params highlight if any
  useEffect(() => {
    if (route.params?.highlightId && fdrs.length > 0) {
      const match = fdrs.find((f) => f.id === route.params.highlightId);
      if (match) {
        setSelectedFdr(match);
      }
    }
  }, [route.params, fdrs]);

  // Filtering
  useEffect(() => {
    let result = [...fdrs];
    if (statusFilter !== 'all') {
      result = result.filter((f) => f.status.toLowerCase() === statusFilter.toLowerCase());
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (f) =>
          f.refNumber.toLowerCase().includes(q) ||
          f.bankName.toLowerCase().includes(q) ||
          (f.branch && f.branch.toLowerCase().includes(q))
      );
    }
    setFilteredFdrs(result);
  }, [fdrs, search, statusFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFDRs();
  };

  const formatCurrency = (val: number) => {
    return `₹ ${Number(val).toLocaleString('en-IN')}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return { label: 'Verified', bg: '#ecfdf5', text: '#059669', icon: 'checkmark-circle' };
      case 'under_review':
        return { label: 'In Review', bg: '#f0f9ff', text: '#0284c7', icon: 'time' };
      case 'clarification_required':
        return { label: 'Clarification', bg: '#fffbeb', text: '#d97706', icon: 'alert-circle' };
      case 'released':
        return { label: 'Released', bg: '#f1f5f9', text: '#475569', icon: 'lock-open' };
      case 'matured':
        return { label: 'Matured', bg: '#fef2f2', text: '#e11d48', icon: 'calendar' };
      default:
        return { label: status, bg: '#f8fafc', text: '#64748b', icon: 'ellipse' };
    }
  };

  const handleApplyRelease = async () => {
    if (!selectedFdr || !releaseReason.trim()) {
      Alert.alert('Required', 'Please provide justification for deposit release/refund.');
      return;
    }

    try {
      setSubmittingRelease(true);
      await apiService.createReleaseRequest(selectedFdr.id, releaseReason.trim());
      Alert.alert('Application Submitted', 'Release request has been lodged with AICTE Council.');
      setReleaseModal(false);
      setSelectedFdr(null);
      setReleaseReason('');
      loadFDRs();
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err?.response?.data?.error || 'Failed to submit release application.');
    } finally {
      setSubmittingRelease(false);
    }
  };

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'verified', label: 'Verified' },
    { id: 'under_review', label: 'In Review' },
    { id: 'clarification_required', label: 'Clarification' },
    { id: 'released', label: 'Released' },
  ];

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search Reference #, Bank, Branch..."
          placeholderTextColor="#94a3b8"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filters}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterPill, statusFilter === item.id && styles.filterPillActive]}
              onPress={() => setStatusFilter(item.id)}
            >
              <Text
                style={[styles.filterPillText, statusFilter === item.id && styles.filterPillTextActive]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* List */}
      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#0d9488" />
          <Text style={styles.centerText}>Loading institutional deposits...</Text>
        </View>
      ) : filteredFdrs.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="documents-outline" size={44} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No matching deposit receipts</Text>
          <Text style={styles.emptyDesc}>Try adjusting your search terms or filter tab.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredFdrs}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0d9488']} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const badge = getStatusBadge(item.status);
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => setSelectedFdr(item)}
                activeOpacity={0.7}
              >
                <View style={styles.cardTop}>
                  <View style={styles.bankTag}>
                    <Ionicons name="business" size={14} color="#0d9488" style={{ marginRight: 4 }} />
                    <Text style={styles.bankName}>{item.bankName}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: badge.bg }]}>
                    <Ionicons name={badge.icon as any} size={11} color={badge.text} />
                    <Text style={[styles.statusPillText, { color: badge.text }]}>
                      {badge.label}
                    </Text>
                  </View>
                </View>

                <Text style={styles.refNumber}>{item.refNumber}</Text>
                {item.branch ? <Text style={styles.branchText}>Branch: {item.branch}</Text> : null}

                <View style={styles.cardBottom}>
                  <View>
                    <Text style={styles.dateLabel}>Maturity Date</Text>
                    <Text style={styles.dateValue}>
                      {new Date(item.maturityDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.amountLabel}>Principal Guarantee</Text>
                    <Text style={styles.amountValue}>{formatCurrency(item.amount)}</Text>
                    {item.maturityAmount ? (
                      <Text style={{ fontSize: 10, color: '#0d9488', fontWeight: '600', marginTop: 1 }}>
                        Mat: {formatCurrency(item.maturityAmount)}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* FDR Detail Dossier Modal */}
      <Modal visible={!!selectedFdr} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.dossierModal}>
            <View style={styles.dossierHeader}>
              <View>
                <Text style={styles.dossierTitle}>Deposit Receipt Dossier</Text>
                <Text style={styles.dossierSubtitle}>{selectedFdr?.refNumber}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedFdr(null)}>
                <Ionicons name="close-circle" size={26} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {selectedFdr && (
              <View style={styles.dossierBody}>
                <View style={styles.dossierRow}>
                  <Text style={styles.dossierLabel}>Issuing Bank:</Text>
                  <Text style={styles.dossierVal}>{selectedFdr.bankName}</Text>
                </View>
                <View style={styles.dossierRow}>
                  <Text style={styles.dossierLabel}>Branch Location:</Text>
                  <Text style={styles.dossierVal}>{selectedFdr.branch || 'Main Branch'}</Text>
                </View>
                <View style={styles.dossierRow}>
                  <Text style={styles.dossierLabel}>Deposit Amount:</Text>
                  <Text style={[styles.dossierVal, { color: '#0d9488', fontWeight: '800' }]}>
                    {formatCurrency(selectedFdr.amount)}
                  </Text>
                </View>
                <View style={styles.dossierRow}>
                  <Text style={styles.dossierLabel}>Annual Interest Rate:</Text>
                  <Text style={styles.dossierVal}>
                    {selectedFdr.interestRate || 7.1}% p.a. ({selectedFdr.compoundingFrequency || 'quarterly'})
                  </Text>
                </View>
                <View style={styles.dossierRow}>
                  <Text style={styles.dossierLabel}>Accrued Interest:</Text>
                  <Text style={[styles.dossierVal, { color: '#059669', fontWeight: '700' }]}>
                    +{formatCurrency(selectedFdr.accruedInterest || Math.round(selectedFdr.amount * 0.071 * 1.5))}
                  </Text>
                </View>
                <View style={styles.dossierRow}>
                  <Text style={styles.dossierLabel}>Projected Maturity:</Text>
                  <Text style={[styles.dossierVal, { color: '#0f766e', fontWeight: '800' }]}>
                    {formatCurrency(selectedFdr.maturityAmount || Math.round(selectedFdr.amount * 1.15))}
                  </Text>
                </View>
                <View style={styles.dossierRow}>
                  <Text style={styles.dossierLabel}>Maturity Expiry:</Text>
                  <Text style={styles.dossierVal}>
                    {new Date(selectedFdr.maturityDate).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.dossierRow}>
                  <Text style={styles.dossierLabel}>Regulatory Status:</Text>
                  <Text style={[styles.dossierVal, { textTransform: 'capitalize' }]}>
                    {selectedFdr.status.replace(/_/g, ' ')}
                  </Text>
                </View>

                {selectedFdr.docHash && (
                  <View style={styles.hashBox}>
                    <Text style={styles.hashLabel}>Document Checksum (SHA-256):</Text>
                    <Text style={styles.hashVal} numberOfLines={1}>
                      {selectedFdr.docHash}
                    </Text>
                  </View>
                )}

                {/* Release Request Action (only for verified or active FDRs) */}
                {selectedFdr.status === 'verified' && (
                  <TouchableOpacity
                    style={styles.requestReleaseBtn}
                    onPress={() => setReleaseModal(true)}
                  >
                    <Ionicons name="lock-open-outline" size={16} color="#ffffff" />
                    <Text style={styles.requestReleaseText}>Apply for Release / Lien Discharge</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Release Form Modal */}
      <Modal visible={releaseModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.releaseModalCard}>
            <Text style={styles.dossierTitle}>Request Deposit Release</Text>
            <Text style={styles.modalSub}>
              Apply to AICTE Council for lien discharge upon completion of course tenure or statutory requirement.
            </Text>

            <TextInput
              style={styles.reasonInput}
              value={releaseReason}
              onChangeText={setReleaseReason}
              placeholder="State regulatory justification / council approval reference..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={4}
            />

            <View style={styles.releaseBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setReleaseModal(false)}
                disabled={submittingRelease}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmReleaseBtn}
                onPress={handleApplyRelease}
                disabled={submittingRelease}
              >
                {submittingRelease ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.confirmReleaseText}>Submit Application</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  filterRow: {
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 6,
  },
  filterPillActive: {
    backgroundColor: '#0d9488',
    borderColor: '#0d9488',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  centerText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748b',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bankTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10,
    gap: 3,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  refNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  branchText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  dateLabel: {
    fontSize: 10,
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  dateValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginTop: 1,
  },
  amountLabel: {
    fontSize: 10,
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dossierModal: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  dossierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 14,
  },
  dossierTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  dossierSubtitle: {
    fontSize: 12,
    color: '#0d9488',
    fontWeight: '700',
    marginTop: 2,
  },
  dossierBody: {
    paddingVertical: 14,
    gap: 10,
  },
  dossierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  dossierLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  dossierVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  hashBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  hashLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  hashVal: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#334155',
    marginTop: 2,
  },
  requestReleaseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14,
    gap: 6,
  },
  requestReleaseText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  releaseModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    alignSelf: 'center',
    width: '90%',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 18,
  },
  reasonInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    height: 90,
    textAlignVertical: 'top',
    fontSize: 13,
    color: '#0f172a',
    marginBottom: 16,
  },
  releaseBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  cancelBtnText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  confirmReleaseBtn: {
    backgroundColor: '#0d9488',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  confirmReleaseText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
});
