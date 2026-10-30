import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../api/client';
import { DashboardStats, FDR } from '../types';

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, instituteName } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentFdrs, setRecentFdrs] = useState<FDR[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [summaryRes, fdrsRes] = await Promise.all([
        apiService.getDashboardSummary(),
        apiService.getFDRs(),
      ]);
      setStats(summaryRes);
      setRecentFdrs(fdrsRes.slice(0, 5));
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatCurrency = (val?: number) => {
    if (!val) return '₹ 0';
    if (val >= 10000000) return `₹ ${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹ ${(val / 100000).toFixed(2)} L`;
    return `₹ ${val.toLocaleString('en-IN')}`;
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
      default:
        return { label: status, bg: '#f8fafc', text: '#64748b', icon: 'ellipse' };
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0d9488" />
        <Text style={styles.loadingText}>Syncing with AICTE Regulatory Ledger...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0d9488']} />}
    >
      {/* Header Banner */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.headerTextGroup}>
            <Text style={styles.welcomeLabel}>Welcome, {user?.name}</Text>
            <Text style={styles.instituteTitle} numberOfLines={2}>
              {instituteName}
            </Text>
          </View>
          <View style={styles.verifiedBadge}>
            <Ionicons name="shield-checkmark" size={16} color="#2dd4bf" />
            <Text style={styles.verifiedBadgeText}>AICTE Affiliated</Text>
          </View>
        </View>

        <View style={styles.totalValueContainer}>
          <Text style={styles.totalValueLabel}>Total Guarantee Deposit In Custody</Text>
          <Text style={styles.totalValueText}>
            {formatCurrency(stats?.totalDepositValue)}
          </Text>
          {stats?.totalMaturityValue && stats.totalMaturityValue > (stats.totalDepositValue || 0) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Ionicons name="trending-up" size={13} color="#5eead4" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 11, color: '#5eead4', fontWeight: '600' }}>
                Projected Maturity: {formatCurrency(stats.totalMaturityValue)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Quick Action Grid */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Institutional Quick Actions</Text>
      </View>
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#0d9488' }]}
          onPress={() => navigation.navigate('Upload')}
        >
          <Ionicons name="camera" size={20} color="#ffffff" />
          <Text style={styles.actionBtnText}>Scan / Upload FDR</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#1e293b' }]}
          onPress={() => navigation.navigate('FDRs')}
        >
          <Ionicons name="folder-open" size={20} color="#ffffff" />
          <Text style={styles.actionBtnText}>FDR Register</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#0f766e' }]}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Ionicons name="notifications" size={20} color="#ffffff" />
          <Text style={styles.actionBtnText}>Alerts</Text>
        </TouchableOpacity>
      </View>

      {/* Metric Cards */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Deposit Status Overview</Text>
      </View>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: '#ecfdf5' }]}>
            <Ionicons name="checkmark-done" size={18} color="#10b981" />
          </View>
          <Text style={styles.statValue}>{stats?.activeFdrs || 0}</Text>
          <Text style={styles.statLabel}>Active & Verified</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: '#fffbeb' }]}>
            <Ionicons name="warning" size={18} color="#f59e0b" />
          </View>
          <Text style={styles.statValue}>{stats?.approachingMaturity || 0}</Text>
          <Text style={styles.statLabel}>Expiring Soon</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: '#f0f9ff' }]}>
            <Ionicons name="hourglass" size={18} color="#0284c7" />
          </View>
          <Text style={styles.statValue}>{stats?.pendingVerification || 0}</Text>
          <Text style={styles.statLabel}>Under Review</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: '#f8fafc' }]}>
            <Ionicons name="documents" size={18} color="#475569" />
          </View>
          <Text style={styles.statValue}>{stats?.totalFdrs || 0}</Text>
          <Text style={styles.statLabel}>Total FDRs</Text>
        </View>
      </View>

      {/* Recent Instruments */}
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <Text style={styles.sectionTitle}>Recent Deposit Receipts</Text>
        <TouchableOpacity onPress={() => navigation.navigate('FDRs')}>
          <Text style={styles.seeAllText}>View All ({stats?.totalFdrs || 0})</Text>
        </TouchableOpacity>
      </View>

      {recentFdrs.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="receipt-outline" size={32} color="#94a3b8" />
          <Text style={styles.emptyTitle}>No deposit records found</Text>
          <Text style={styles.emptyDesc}>Tap 'Scan / Upload' above to submit your first receipt.</Text>
        </View>
      ) : (
        recentFdrs.map((fdr) => {
          const badge = getStatusBadge(fdr.status);
          return (
            <TouchableOpacity
              key={fdr.id}
              style={styles.fdrCard}
              onPress={() => navigation.navigate('FDRs', { highlightId: fdr.id })}
            >
              <View style={styles.fdrCardLeft}>
                <View style={styles.bankIcon}>
                  <Ionicons name="business" size={18} color="#0d9488" />
                </View>
                <View style={styles.fdrInfo}>
                  <Text style={styles.fdrRef}>{fdr.refNumber}</Text>
                  <Text style={styles.fdrBank}>
                    {fdr.bankName} {fdr.branch ? `• ${fdr.branch}` : ''}
                  </Text>
                  <Text style={styles.fdrDate}>
                    Matures: {new Date(fdr.maturityDate).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              <View style={styles.fdrCardRight}>
                <Text style={styles.fdrAmount}>{formatCurrency(fdr.amount)}</Text>
                <View style={[styles.statusPill, { backgroundColor: badge.bg }]}>
                  <Ionicons name={badge.icon as any} size={11} color={badge.text} />
                  <Text style={[styles.statusPillText, { color: badge.text }]}>
                    {badge.label}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}

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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  headerCard: {
    backgroundColor: '#070d1b',
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 14,
  },
  headerTextGroup: {
    flex: 1,
    marginRight: 12,
  },
  welcomeLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  instituteTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 148, 136, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.4)',
    gap: 4,
  },
  verifiedBadgeText: {
    color: '#2dd4bf',
    fontSize: 10,
    fontWeight: '700',
  },
  totalValueContainer: {
    marginTop: 14,
  },
  totalValueLabel: {
    color: '#94a3b8',
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  totalValueText: {
    color: '#2dd4bf',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seeAllText: {
    fontSize: 12,
    color: '#0d9488',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
  },
  fdrCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  fdrCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  bankIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#ccfbf1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  fdrInfo: {
    flex: 1,
  },
  fdrRef: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  fdrBank: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  fdrDate: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  fdrCardRight: {
    alignItems: 'flex-end',
  },
  fdrAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
    gap: 3,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
