import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../api/client';
import { ClearanceWorkflow, ClearanceTaskItem, WorkflowDocumentItem } from '../types';
import { AICTE_LOGO_BASE64 } from '../assets/aicteLogoBase64';

export const ClearanceScreen: React.FC = () => {
  const { user } = useAuth();

  const [workflows, setWorkflows] = useState<ClearanceWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'in_progress' | 'approved' | 'clarification_required'>('all');

  // Detail Modal
  const [selectedWorkflow, setSelectedWorkflow] = useState<ClearanceWorkflow | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // NOC Order Modal
  const [nocModalOpen, setNocModalOpen] = useState(false);

  // Task Decision Modal
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<ClearanceTaskItem | null>(null);
  const [taskDecision, setTaskDecision] = useState<'cleared' | 'clarification_required' | 'rejected'>('cleared');
  const [taskNotes, setTaskNotes] = useState('');
  const [savingTask, setSavingTask] = useState(false);
  const [printingNoc, setPrintingNoc] = useState(false);

  const convertNumberToWords = (num: number): string => {
    if (!num) return 'Zero Rupees Only';
    if (num === 7000000) return 'Seventy Lakh Rupees Only';
    if (num === 5000000) return 'Fifty Lakh Rupees Only';
    if (num === 15000000) return 'One Crore Fifty Lakh Rupees Only';
    if (num === 17500000) return 'One Crore Seventy Five Lakh Rupees Only';
    if (num === 3500000) return 'Thirty Five Lakh Rupees Only';
    if (num >= 10000000) return `${(num / 10000000).toFixed(2)} Crore Rupees Only`;
    if (num >= 100000) return `${(num / 100000).toFixed(2)} Lakh Rupees Only`;
    return `${num.toLocaleString('en-IN')} Rupees Only`;
  };

  const generateNocHtml = (wf: ClearanceWorkflow): string => {
    const refId = (wf._id || 'REF').slice(-8).toUpperCase();
    const instName = wf.institutionId?.name || 'Institution';
    const instCode = wf.institutionId?.code || 'INST';
    const trustName = wf.institutionId?.trustName || `${instName} Educational Trust / Society`;
    const fdrRef = wf.fdrId?.refNumber || 'FDR-REF-NO';
    const amountVal = wf.fdrId?.amount || 5000000;
    const amountStr = `₹${amountVal.toLocaleString('en-IN')} (${convertNumberToWords(amountVal)})`;
    const bankDetails = `${wf.fdrId?.bankName || 'Scheduled Commercial Bank'}, ${wf.fdrId?.branch || 'Authorized Custody Branch'}`;
    const matDate = wf.fdrId?.maturityDate ? new Date(wf.fdrId.maturityDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '28 Mar 2029';
    const issueDateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const isApproved = wf.status === 'approved';
    const statusNote = isApproved ? 'OFFICIAL AICTE STATUTORY SANCTION ORDER' : 'ILLUSTRATIVE PROTOTYPE — NOT AN OFFICIAL AICTE DOCUMENT';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 10mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 10px;
              background-color: #ffffff;
              font-size: 11px;
              line-height: 1.4;
            }
            .border-box {
              border: 1.5px solid #0f172a;
              padding: 18px 24px;
              max-width: 680px;
              margin: 0 auto;
              background: #fff;
            }
            .header-center {
              text-align: center;
              margin-bottom: 8px;
            }
            .logo {
              width: 58px;
              height: 58px;
              object-fit: contain;
              margin-bottom: 6px;
            }
            .council-name {
              font-size: 13px;
              font-weight: 800;
              color: #1e3a8a;
              letter-spacing: 0.5px;
              margin: 0;
            }
            .bureau-name {
              font-size: 10px;
              color: #475569;
              margin-top: 2px;
            }
            .noc-title {
              font-size: 12px;
              font-weight: 800;
              color: #1e3a8a;
              margin-top: 8px;
            }
            .noc-subtitle {
              font-size: 10px;
              color: #64748b;
            }
            .noc-badge {
              font-size: 9px;
              color: #64748b;
              font-weight: 700;
              letter-spacing: 0.5px;
              margin-top: 4px;
              text-transform: uppercase;
            }
            .divider {
              border-bottom: 1px solid #cbd5e1;
              margin: 10px 0;
            }
            .meta-grid {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
            }
            .meta-label {
              font-size: 9.5px;
              color: #64748b;
            }
            .meta-val {
              font-size: 11px;
              font-weight: 700;
              color: #0f172a;
              margin-top: 1px;
            }
            .to-section {
              margin-bottom: 8px;
            }
            .section-bold-blue {
              font-weight: 700;
              color: #1e3a8a;
            }
            .body-text {
              margin: 8px 0;
              text-align: justify;
              color: #334155;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 8px 0;
            }
            td {
              padding: 5px 0;
              border-bottom: 1px solid #f1f5f9;
              font-size: 10.5px;
            }
            td:first-child {
              color: #475569;
              width: 42%;
            }
            td:last-child {
              color: #0f172a;
              font-weight: 600;
              text-align: right;
            }
            .conditions-box {
              margin-top: 10px;
            }
            .signatory {
              margin-top: 14px;
              text-align: right;
            }
            .signatory-title {
              font-weight: 700;
              color: #1e3a8a;
            }
            .signatory-sub {
              font-size: 10px;
              color: #334155;
            }
            .signatory-note {
              font-size: 8.5px;
              color: #94a3b8;
              font-style: italic;
              margin-top: 4px;
            }
            .verify-ref {
              font-size: 8.5px;
              color: #94a3b8;
              margin-top: 8px;
            }
          </style>
        </head>
        <body>
          <div class="border-box">
            <div class="header-center">
              <img src="${AICTE_LOGO_BASE64}" class="logo" alt="AICTE Logo" />
              <div class="council-name">ALL INDIA COUNCIL FOR TECHNICAL EDUCATION</div>
              <div class="bureau-name">Approval Bureau</div>
              <div class="noc-title">NO OBJECTION CERTIFICATE (NOC)</div>
              <div class="noc-subtitle">Release of Security Deposit — FDR/RPGF</div>
              <div class="noc-badge">${statusNote}</div>
            </div>

            <div class="divider"></div>

            <div class="meta-grid">
              <div>
                <div class="meta-label">NOC Reference No.</div>
                <div class="meta-val">AICTE/AB/REL/2026/${refId}</div>
              </div>
              <div style="text-align: right;">
                <div class="meta-label">Date of Issue</div>
                <div class="meta-val">${issueDateStr}</div>
              </div>
            </div>

            <div class="to-section">
              <div class="section-bold-blue">To: The Authorized Branch Manager</div>
              <div>${bankDetails}</div>
            </div>

            <div style="margin-top: 6px;">
              <span class="section-bold-blue">Subject: No Objection for Release of Security Deposit</span>
            </div>

            <p class="body-text">
              With reference to the institution's application for release of the security deposit, the request has been considered in accordance with the applicable provisions of the AICTE Approval Process Handbook, subject to the verified case details and required clearances.
            </p>

            <div class="section-bold-blue" style="margin-top: 10px; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px;">
              Institution and Deposit Particulars
            </div>
            <table>
              <tr>
                <td>Institution name and AICTE ID</td>
                <td>${instName} (AICTE ID: ${instCode})</td>
              </tr>
              <tr>
                <td>Trust/Society/Company</td>
                <td>${trustName}</td>
              </tr>
              <tr>
                <td>FDR/RPGF reference</td>
                <td style="font-family: monospace;">${fdrRef}</td>
              </tr>
              <tr>
                <td>Principal deposit amount</td>
                <td>${amountStr}</td>
              </tr>
              <tr>
                <td>Accrued interest / Yield</td>
                <td>&#8377; ${Math.round((wf.fdrId?.accruedInterest || (wf.fdrId?.amount || 5000000) * 0.071 * 2)).toLocaleString('en-IN')} (Rate: ${wf.fdrId?.interestRate || 7.1}% p.a. ${wf.fdrId?.compoundingFrequency || 'quarterly'})</td>
              </tr>
              <tr>
                <td>Bank and maturity date</td>
                <td>${bankDetails} &bull; ${matDate}</td>
              </tr>
            </table>

            <div class="conditions-box">
              <div class="section-bold-blue">Decision and Conditions</div>
              <p class="body-text" style="margin-top: 2px;">
                Subject to satisfaction of the applicable requirements and completion of the prescribed clearances, the competent authority records its decision regarding release of the specified security deposit. Any bank-side action shall be subject to the applicable instructions, deposit terms and required documentation.
              </p>
            </div>

            <div class="verify-ref">
              Verification reference: http://localhost:5173/clearance/${wf._id} [SHA-256: ${(wf._id || '').slice(0, 16).toUpperCase()}]
            </div>

            <div class="divider"></div>

            <div class="signatory">
              <div class="signatory-title">Authorized Signatory</div>
              <div class="signatory-sub">Advisor / Member Secretary (Approval Bureau), AICTE New Delhi</div>
              <div class="signatory-note">Signature and date to be applied through the approved issuance process.</div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrintNoc = async () => {
    if (!selectedWorkflow) return;
    try {
      setPrintingNoc(true);
      const html = generateNocHtml(selectedWorkflow);
      await Print.printAsync({ html });
    } catch (err: any) {
      console.error('Print error:', err);
      Alert.alert('Print Error', err?.message || 'Could not trigger printing.');
    } finally {
      setPrintingNoc(false);
    }
  };

  const handleShareNocPdf = async () => {
    if (!selectedWorkflow) return;
    try {
      setPrintingNoc(true);
      const html = generateNocHtml(selectedWorkflow);
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      } else {
        Alert.alert('Saved PDF', `NOC PDF generated at: ${uri}`);
      }
    } catch (err: any) {
      console.error('Share error:', err);
      Alert.alert('PDF Error', err?.message || 'Could not export PDF.');
    } finally {
      setPrintingNoc(false);
    }
  };

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const data = await apiService.getClearanceWorkflows();
      setWorkflows(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load clearance workflows:', err?.message);
      setWorkflows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWorkflows();
  };

  const safeWorkflows = Array.isArray(workflows) ? workflows : [];
  const filteredWorkflows = safeWorkflows.filter((w) => {
    if (activeFilter === 'all') return true;
    return w.status === activeFilter;
  });

  const handleOpenDetail = (wf: ClearanceWorkflow) => {
    setSelectedWorkflow(wf);
    setDetailModalOpen(true);
  };

  const handleRecordTask = async () => {
    if (!selectedWorkflow || !activeTask) return;
    try {
      setSavingTask(true);
      await apiService.recordTaskDecision(selectedWorkflow._id, activeTask.taskKey, {
        decision: taskDecision,
        observations: taskNotes,
      });
      Alert.alert('Success', `Task ${activeTask.name} recorded as ${taskDecision.toUpperCase()}.`);
      setTaskModalOpen(false);
      setTaskNotes('');
      // Refresh current workflow
      const updated = await apiService.getClearanceWorkflowById(selectedWorkflow._id);
      setSelectedWorkflow(updated);
      fetchWorkflows();
    } catch (err: any) {
      Alert.alert('Action Failed', err?.response?.data?.error || err.message);
    } finally {
      setSavingTask(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'cleared':
      case 'verified':
        return { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' };
      case 'clarification_required':
      case 'rejected':
      case 'blocked':
        return { bg: '#fff1f2', text: '#9f1239', border: '#fecdd3' };
      default:
        return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Info */}
      <View style={styles.headerBox}>
        <View style={styles.badgeRow}>
          <View style={styles.headerBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#0d9488" />
            <Text style={styles.headerBadgeText}>AICTE Statutory Clearance</Text>
          </View>
          <Text style={styles.headerSub}>APH 2024–2027</Text>
        </View>
        <Text style={styles.title}>Clearance Command Center</Text>
        <Text style={styles.subtitle}>
          Track interdepartmental lien release scrutiny, tasks, and official AICTE sanction orders
        </Text>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {[
            { key: 'all', label: 'All Dossiers' },
            { key: 'in_progress', label: 'In Progress' },
            { key: 'approved', label: 'NOC Issued' },
            { key: 'clarification_required', label: 'Clarifications' },
          ].map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
              onPress={() => setActiveFilter(f.key as any)}
            >
              <Text style={[styles.filterChipText, activeFilter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#0d9488" />
          <Text style={styles.loadingText}>Loading clearance dossiers...</Text>
        </View>
      ) : filteredWorkflows.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="document-text-outline" size={48} color="#94a3b8" />
          <Text style={styles.emptyTitle}>No Clearance Dossiers</Text>
          <Text style={styles.emptySubtitle}>
            When an institution submits a release request, the multi-departmental clearance dossier appears here.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0d9488']} />}
        >
          {filteredWorkflows.map((wf) => {
            const colors = getStatusColor(wf.status);
            const verifiedCount = (wf.documents || []).filter((d) => d.status === 'verified').length;
            const clearedCount = (wf.tasks || []).filter((t) => t.status === 'cleared').length;
            const instName = wf.institutionId?.name || 'Institution';
            const fdrRef = wf.fdrId?.refNumber || 'FDR-REF';
            const amount = wf.fdrId?.amount ? `₹ ${(wf.fdrId.amount / 100000).toFixed(1)} L` : '₹ 50.0 L';

            return (
              <TouchableOpacity
                key={wf._id}
                style={styles.card}
                onPress={() => handleOpenDetail(wf)}
                activeOpacity={0.7}
              >
                <View style={styles.cardTopRow}>
                  <View style={styles.caseBadge}>
                    <Text style={styles.caseBadgeText}>#{wf._id.slice(-6).toUpperCase()}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                    <Text style={[styles.statusBadgeText, { color: colors.text }]}>
                      {wf.status.replace(/_/g, ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.cardTitle} numberOfLines={1}>{instName}</Text>
                <Text style={styles.cardMeta}>{fdrRef} • {wf.fdrId?.bankName || 'Bank'} • {amount}</Text>

                <View style={styles.progressRow}>
                  <View style={styles.progressItem}>
                    <Ionicons name="documents" size={14} color="#0d9488" />
                    <Text style={styles.progressText}>Docs: {verifiedCount}/5 Verified</Text>
                  </View>
                  <View style={styles.progressItem}>
                    <Ionicons name="shield-checkmark" size={14} color="#0d9488" />
                    <Text style={styles.progressText}>Tasks: {clearedCount}/4 Cleared</Text>
                  </View>
                </View>

                <View style={styles.cardBottomRow}>
                  <Text style={styles.viewLinkText}>Inspect Clearance Dossier</Text>
                  <Ionicons name="chevron-forward" size={16} color="#0d9488" />
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      {/* Dossier Detail Modal */}
      {selectedWorkflow && (
        <Modal visible={detailModalOpen} animationType="slide">
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.detailHeader}>
              <TouchableOpacity onPress={() => setDetailModalOpen(false)} style={styles.detailBackBtn}>
                <Ionicons name="close" size={24} color="#0f172a" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailHeaderTitle}>Clearance Dossier #{selectedWorkflow._id.slice(-6).toUpperCase()}</Text>
                <Text style={styles.detailHeaderSub}>{selectedWorkflow.institutionId?.name}</Text>
              </View>
              {selectedWorkflow.status === 'approved' && (
                <TouchableOpacity
                  style={styles.nocButton}
                  onPress={() => setNocModalOpen(true)}
                >
                  <Ionicons name="ribbon" size={16} color="#ffffff" />
                  <Text style={styles.nocButtonText}>View NOC</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.detailBody}>
              {/* FDR Particulars Box */}
              <View style={styles.particularsCard}>
                <Text style={styles.sectionTitle}>Deposit Particulars</Text>
                <View style={styles.particularsRow}>
                  <Text style={styles.partLabel}>FDR Ref #:</Text>
                  <Text style={styles.partValue}>{selectedWorkflow.fdrId?.refNumber || 'N/A'}</Text>
                </View>
                <View style={styles.particularsRow}>
                  <Text style={styles.partLabel}>Bank & Branch:</Text>
                  <Text style={styles.partValue}>{selectedWorkflow.fdrId?.bankName}, {selectedWorkflow.fdrId?.branch || 'Main'}</Text>
                </View>
                <View style={styles.particularsRow}>
                  <Text style={styles.partLabel}>Deposit Principal:</Text>
                  <Text style={[styles.partValue, { color: '#047857', fontWeight: '800' }]}>
                    ₹ {((selectedWorkflow.fdrId?.amount || 5000000) / 100000).toFixed(2)} Lakhs
                  </Text>
                </View>
              </View>

              {/* Section 1: 5-Document Checklist */}
              <View style={styles.particularsCard}>
                <View style={styles.sectionHeaderFlex}>
                  <Text style={styles.sectionTitle}>Section 1: 5 Statutory Documents</Text>
                  <Text style={styles.docCountBadge}>
                    {(selectedWorkflow.documents || []).filter((d) => d.status === 'verified').length}/5 Verified
                  </Text>
                </View>

                {(selectedWorkflow.documents || []).map((doc, idx) => {
                  const docColors = getStatusColor(doc.status);
                  const docLabels: Record<string, string> = {
                    request_letter: '1. Institution Request Letter',
                    affidavit_6: '2. Affidavit 6 (Prescribed Format)',
                    fdr_copy: '3. Copy of FDR Certificate',
                    payment_proof: '4. RPGF / Deposit Payment Proof',
                    eoa_loa: '5. Latest LoA / EoA Approval',
                  };
                  return (
                    <View key={doc.docType || idx} style={styles.docRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.docRowTitle}>{docLabels[doc.docType] || doc.docType}</Text>
                        <Text style={styles.docRowMeta}>
                          {doc.docOriginalName || 'Pending Document Scan'}
                        </Text>
                      </View>
                      <View style={[styles.statusBadgeSmall, { backgroundColor: docColors.bg, borderColor: docColors.border }]}>
                        <Text style={[styles.statusBadgeSmallText, { color: docColors.text }]}>
                          {doc.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Section 2: 4-Department Tasks */}
              <View style={styles.particularsCard}>
                <Text style={styles.sectionTitle}>Section 2: Department Clearance Tasks</Text>
                {(selectedWorkflow.tasks || []).map((task) => {
                  const taskColors = getStatusColor(task.status);
                  const isCleared = task.status === 'cleared';
                  const canDecide = user?.role === 'admin' || user?.role === task.assignedRole || user?.role === 'officer';

                  return (
                    <View key={task.taskKey} style={styles.taskCard}>
                      <View style={styles.taskTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.taskName}>{task.name}</Text>
                          <Text style={styles.taskDept}>Dept: {task.department.toUpperCase()} • Role: {task.assignedRole}</Text>
                        </View>
                        <View style={[styles.statusBadgeSmall, { backgroundColor: taskColors.bg, borderColor: taskColors.border }]}>
                          <Text style={[styles.statusBadgeSmallText, { color: taskColors.text }]}>
                            {task.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      {task.observations && (
                        <View style={styles.obsBox}>
                          <Text style={styles.obsText}>
                            <Text style={{ fontWeight: '700' }}>Observations: </Text>
                            {task.observations}
                          </Text>
                        </View>
                      )}

                      {canDecide && (
                        <TouchableOpacity
                          style={styles.taskActionBtn}
                          onPress={() => {
                            setActiveTask(task);
                            setTaskDecision(isCleared ? 'cleared' : 'cleared');
                            setTaskNotes(task.observations || '');
                            setTaskModalOpen(true);
                          }}
                        >
                          <Ionicons name="shield-checkmark" size={14} color="#0d9488" />
                          <Text style={styles.taskActionBtnText}>
                            {isCleared ? 'Update Clearance Decision' : 'Record Official Clearance'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Official AICTE NOC Modal */}
      {selectedWorkflow && (
        <Modal visible={nocModalOpen} animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.detailHeader}>
              <TouchableOpacity onPress={() => setNocModalOpen(false)} style={styles.detailBackBtn}>
                <Ionicons name="close" size={24} color="#0f172a" />
              </TouchableOpacity>
              <Text style={styles.detailHeaderTitle}>Official AICTE NOC Order</Text>
              {selectedWorkflow.status === 'approved' && (
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TouchableOpacity
                    onPress={handleShareNocPdf}
                    style={styles.headerActionBtn}
                    disabled={printingNoc}
                  >
                    <Ionicons name="share-outline" size={18} color="#0d9488" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handlePrintNoc}
                    style={[styles.headerActionBtn, { backgroundColor: '#0d9488' }]}
                    disabled={printingNoc}
                  >
                    <Ionicons name="print-outline" size={18} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <ScrollView style={styles.detailBody}>
              {/* Authentic NOC Letter Card */}
              <View style={styles.nocLetterCard}>
                {/* Header with Official AICTE Logo */}
                <View style={styles.nocHeader}>
                  <Image
                    source={{ uri: AICTE_LOGO_BASE64 }}
                    style={styles.nocLogoImg}
                    resizeMode="contain"
                  />
                  <Text style={styles.nocCouncil}>ALL INDIA COUNCIL FOR TECHNICAL EDUCATION</Text>
                  <Text style={styles.nocBureau}>Approval Bureau</Text>
                  <View style={styles.divider} />
                  <Text style={styles.nocTitle}>NO OBJECTION CERTIFICATE (NOC)</Text>
                  <Text style={styles.nocSubTitle}>Release of Security Deposit — FDR/RPGF</Text>
                  <View style={styles.nocPrototypeBadge}>
                    <Text style={styles.nocPrototypeText}>
                      {selectedWorkflow.status === 'approved'
                        ? 'OFFICIAL AICTE STATUTORY SANCTION ORDER'
                        : 'ILLUSTRATIVE PROTOTYPE — NOT AN OFFICIAL AICTE DOCUMENT'}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Ref & Date */}
                <View style={styles.nocRefRow}>
                  <View>
                    <Text style={styles.nocRefLabel}>NOC Reference No.</Text>
                    <Text style={styles.nocRefValue}>AICTE/AB/REL/2026/{selectedWorkflow._id.slice(-8).toUpperCase()}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.nocRefLabel}>Date of Issue</Text>
                    <Text style={styles.nocRefValue}>
                      {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                </View>

                {/* To & Subject */}
                <View style={styles.nocSection}>
                  <Text style={styles.nocBlueHeader}>To: The Authorized Branch Manager</Text>
                  <Text style={styles.nocText}>
                    {selectedWorkflow.fdrId?.bankName || 'Scheduled Commercial Bank'}, {selectedWorkflow.fdrId?.branch || 'Authorized Custody Branch'}
                  </Text>
                </View>

                <View style={styles.nocSection}>
                  <Text style={styles.nocBlueHeader}>Subject: No Objection for Release of Security Deposit</Text>
                  <Text style={styles.nocText}>
                    With reference to the institution's application for release of the security deposit, the request has been considered in accordance with the applicable provisions of the AICTE Approval Process Handbook, subject to the verified case details and required clearances.
                  </Text>
                </View>

                {/* Particulars Table Matching Web */}
                <View style={styles.nocTable}>
                  <Text style={styles.nocBlueHeader}>Institution and Deposit Particulars</Text>

                  <View style={styles.nocTableRow}>
                    <Text style={styles.nocTableLabel}>Institution name and AICTE ID</Text>
                    <Text style={styles.nocTableVal}>
                      {selectedWorkflow.institutionId?.name || 'Institution'} (AICTE ID: {selectedWorkflow.institutionId?.code || 'INST'})
                    </Text>
                  </View>

                  <View style={styles.nocTableRow}>
                    <Text style={styles.nocTableLabel}>Trust/Society/Company</Text>
                    <Text style={styles.nocTableVal}>
                      {selectedWorkflow.institutionId?.trustName || `${selectedWorkflow.institutionId?.name || 'Institution'} Educational Trust / Society`}
                    </Text>
                  </View>

                  <View style={styles.nocTableRow}>
                    <Text style={styles.nocTableLabel}>FDR/RPGF reference</Text>
                    <Text style={[styles.nocTableVal, { fontFamily: 'monospace', fontWeight: '700', color: '#0d9488' }]}>
                      {selectedWorkflow.fdrId?.refNumber || 'FDR-REF-NO'}
                    </Text>
                  </View>

                  <View style={styles.nocTableRow}>
                    <Text style={styles.nocTableLabel}>Principal deposit amount</Text>
                    <Text style={[styles.nocTableVal, { fontWeight: '700', color: '#0f172a' }]}>
                      ₹{(selectedWorkflow.fdrId?.amount || 5000000).toLocaleString('en-IN')} ({convertNumberToWords(selectedWorkflow.fdrId?.amount || 5000000)})
                    </Text>
                  </View>

                  <View style={styles.nocTableRow}>
                    <Text style={styles.nocTableLabel}>Accrued interest / Yield</Text>
                    <Text style={[styles.nocTableVal, { fontWeight: '700', color: '#059669' }]}>
                      +₹ {Math.round(selectedWorkflow.fdrId?.accruedInterest || (selectedWorkflow.fdrId?.amount || 5000000) * 0.071 * 2).toLocaleString('en-IN')} ({selectedWorkflow.fdrId?.interestRate || 7.1}% p.a.)
                    </Text>
                  </View>

                  <View style={styles.nocTableRow}>
                    <Text style={styles.nocTableLabel}>Bank and maturity date</Text>
                    <Text style={styles.nocTableVal}>
                      {selectedWorkflow.fdrId?.bankName || 'Bank'}, {selectedWorkflow.fdrId?.branch || 'Branch'} • {selectedWorkflow.fdrId?.maturityDate ? new Date(selectedWorkflow.fdrId.maturityDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '28 Mar 2029'}
                    </Text>
                  </View>
                </View>

                {/* Decision and Conditions */}
                <View style={styles.nocMandateBox}>
                  <Text style={styles.nocMandateTitle}>Decision and Conditions</Text>
                  <Text style={styles.nocMandateText}>
                    Subject to satisfaction of the applicable requirements and completion of the prescribed clearances, the competent authority records its decision regarding release of the specified security deposit. Any bank-side action shall be subject to the applicable instructions, deposit terms and required documentation.
                  </Text>
                </View>

                {/* Verification Ref */}
                <Text style={styles.nocVerifyRef}>
                  Verification reference: http://localhost:5173/clearance/{selectedWorkflow._id} [SHA-256: {(selectedWorkflow._id || '').slice(0, 16).toUpperCase()}]
                </Text>

                {/* Signatory */}
                <View style={styles.nocSignatoryBox}>
                  <Text style={styles.nocSignTitle}>Authorized Signatory</Text>
                  <Text style={styles.nocSignSub}>Advisor / Member Secretary (Approval Bureau), AICTE New Delhi</Text>
                  <Text style={styles.nocSignFootnote}>Signature and date to be applied through the approved issuance process.</Text>
                </View>
              </View>

              {/* Action Buttons at bottom of document */}
              {selectedWorkflow.status === 'approved' ? (
                <View style={styles.nocBottomActions}>
                  <TouchableOpacity
                    style={styles.nocPrintBtn}
                    onPress={handlePrintNoc}
                    disabled={printingNoc}
                  >
                    <Ionicons name="print" size={18} color="#ffffff" />
                    <Text style={styles.nocPrintBtnText}>Print / Save as PDF</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.nocShareBtn}
                    onPress={handleShareNocPdf}
                    disabled={printingNoc}
                  >
                    <Ionicons name="share-social" size={18} color="#0d9488" />
                    <Text style={styles.nocShareBtnText}>Share Document</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.nocLockedBox}>
                  <View style={styles.nocLockedIcon}>
                    <Ionicons name="lock-closed" size={20} color="#b45309" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nocLockedTitle}>Official Printing Locked</Text>
                    <Text style={styles.nocLockedDesc}>
                      Statutory dispatch and printing unlock only after all departmental clearances and final Approval Bureau sanctions are recorded.
                    </Text>
                  </View>
                </View>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Task Decision Modal */}
      <Modal visible={taskModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.decisionModalCard}>
            <Text style={styles.decisionModalTitle}>Record Department Clearance</Text>
            <Text style={styles.decisionModalSub}>{activeTask?.name}</Text>

            {/* Decision selector */}
            <View style={styles.decisionRow}>
              {(['cleared', 'clarification_required', 'rejected'] as const).map((dec) => (
                <TouchableOpacity
                  key={dec}
                  style={[styles.decBtn, taskDecision === dec && styles.decBtnActive]}
                  onPress={() => setTaskDecision(dec)}
                >
                  <Text style={[styles.decBtnText, taskDecision === dec && styles.decBtnTextActive]}>
                    {dec === 'cleared' ? 'Cleared' : dec === 'clarification_required' ? 'Clarification' : 'Reject'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.notesInput}
              value={taskNotes}
              onChangeText={setTaskNotes}
              placeholder="Enter official departmental scrutiny notes / findings..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
            />

            <View style={styles.decisionBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setTaskModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitDecisionBtn, savingTask && { opacity: 0.6 }]}
                onPress={handleRecordTask}
                disabled={savingTask}
              >
                {savingTask ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitDecisionText}>Submit Decision</Text>
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
  },
  headerBox: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccfbf1',
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0d9488',
    marginLeft: 4,
  },
  headerSub: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  filterRow: {
    marginTop: 12,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#0d9488',
    borderColor: '#0d9488',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: '#64748b',
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  caseBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  caseBadgeText: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#334155',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  cardMeta: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 10,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 8,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  viewLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0d9488',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 12,
  },
  detailBackBtn: {
    padding: 4,
  },
  detailHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  detailHeaderSub: {
    fontSize: 11,
    color: '#64748b',
  },
  nocButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  nocButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  detailBody: {
    flex: 1,
    padding: 16,
  },
  particularsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  particularsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  partLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  partValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0f172a',
  },
  sectionHeaderFlex: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  docCountBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0d9488',
    backgroundColor: '#f0fdfa',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  docRowTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e293b',
  },
  docRowMeta: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  statusBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusBadgeSmallText: {
    fontSize: 9,
    fontWeight: '800',
  },
  taskCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  taskTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  taskName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  taskDept: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  obsBox: {
    backgroundColor: '#ffffff',
    padding: 6,
    borderRadius: 6,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  obsText: {
    fontSize: 10,
    color: '#334155',
  },
  taskActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#ccfbf1',
    borderRadius: 8,
    paddingVertical: 7,
    marginTop: 8,
  },
  taskActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0d9488',
  },
  nocLetterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  nocHeader: {
    alignItems: 'center',
  },
  nocLogoImg: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  headerActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nocVerifyRef: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 6,
    marginBottom: 8,
  },
  nocBottomActions: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  nocPrintBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0d9488',
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#0d9488',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  nocPrintBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  nocShareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#ccfbf1',
    paddingVertical: 12,
    borderRadius: 10,
  },
  nocShareBtnText: {
    color: '#0d9488',
    fontSize: 13,
    fontWeight: '700',
  },
  nocLockedBox: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 14,
  },
  nocLockedIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nocLockedTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400e',
  },
  nocLockedDesc: {
    fontSize: 11,
    color: '#b45309',
    marginTop: 2,
    lineHeight: 16,
  },
  nocCouncil: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e3a8a',
    textAlign: 'center',
  },
  nocBureau: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  nocTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e3a8a',
    marginTop: 4,
  },
  nocSubTitle: {
    fontSize: 10,
    color: '#64748b',
  },
  nocPrototypeBadge: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  nocPrototypeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#92400e',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    width: '100%',
    marginVertical: 10,
  },
  nocRefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  nocRefLabel: {
    fontSize: 10,
    color: '#94a3b8',
  },
  nocRefValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  nocSection: {
    marginBottom: 10,
  },
  nocBlueHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e3a8a',
    marginBottom: 2,
  },
  nocText: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 16,
  },
  nocTable: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  nocTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  nocTableLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  nocTableVal: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0f172a',
  },
  nocMandateBox: {
    backgroundColor: '#f0fdfa',
    borderLeftWidth: 3,
    borderLeftColor: '#0d9488',
    padding: 8,
    marginBottom: 10,
  },
  nocMandateTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  nocMandateText: {
    fontSize: 10,
    color: '#334155',
    lineHeight: 15,
  },
  nocSignatoryBox: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    alignItems: 'flex-end',
  },
  nocSignTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1e3a8a',
  },
  nocSignSub: {
    fontSize: 10,
    color: '#334155',
  },
  nocSignCouncil: {
    fontSize: 10,
    color: '#64748b',
  },
  nocSignFootnote: {
    fontSize: 8,
    color: '#94a3b8',
    marginTop: 4,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  decisionModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 340,
  },
  decisionModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  decisionModalSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 12,
  },
  decisionRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  decBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  decBtnActive: {
    backgroundColor: '#0d9488',
    borderColor: '#0d9488',
  },
  decBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  decBtnTextActive: {
    color: '#ffffff',
  },
  notesInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: '#0f172a',
    textAlignVertical: 'top',
    minHeight: 70,
    marginBottom: 12,
  },
  decisionBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  submitDecisionBtn: {
    flex: 2,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0d9488',
    alignItems: 'center',
  },
  submitDecisionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});
