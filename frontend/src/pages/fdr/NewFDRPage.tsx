import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  UploadCloud,
  CheckCircle2,
  Building2,
  FileText,
  ShieldCheck,
  Check,
  File,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Button,
  Input,
  Select,
} from '../../components/ui';
import { fdrsApi } from '../../api/fdrs';
import { institutionsApi } from '../../api/institutions';
import { Institution } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { INDIAN_BANKS } from '../../utils/constants';
import { formatCurrency, formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

export const NewFDRPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isInstitution } = useAuth();

  const [step, setStep] = useState(1);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(false);

  // Step 1: Institution Details
  const initialInst = typeof user?.institutionId === 'object' ? (user.institutionId as any) : null;
  const initialInstId = typeof user?.institutionId === 'string'
    ? user.institutionId
    : initialInst?._id || initialInst?.id || '';
  const [institutionId, setInstitutionId] = useState(initialInstId);
  const [institutionName, setInstitutionName] = useState(initialInst?.name || '');
  const [aicteCode, setAicteCode] = useState(initialInst?.code || '');

  // Step 2: FDR Details
  const [refNumber, setRefNumber] = useState('');
  const [bankName, setBankName] = useState(INDIAN_BANKS[0]);
  const [branch, setBranch] = useState('');
  const [amount, setAmount] = useState('5000000');
  const [currency] = useState('INR');
  const [issueDate, setIssueDate] = useState('2026-03-01');
  const [maturityDate, setMaturityDate] = useState('2029-03-01');
  const [jointWithAICTE, setJointWithAICTE] = useState(true);
  const [interestRate, setInterestRate] = useState('7.1');
  const [compoundingFrequency, setCompoundingFrequency] = useState<'quarterly' | 'monthly' | 'half_yearly' | 'annual' | 'simple'>('quarterly');
  const [interestPayoutType, setInterestPayoutType] = useState<'cumulative' | 'periodic_payout'>('cumulative');

  // Step 3: Statutory Documents
  const [file, setFile] = useState<File | null>(null); // FDR Copy
  const [requestLetterFile, setRequestLetterFile] = useState<File | null>(null);
  const [affidavit6File, setAffidavit6File] = useState<File | null>(null);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [eoaLoaFile, setEoaLoaFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Load institutions list
  useEffect(() => {
    const fetchInsts = async () => {
      try {
        const res = await institutionsApi.getInstitutions({ limit: 100 });
        setInstitutions(res.items);

        if (isInstitution && user?.institutionId) {
          const instObj = typeof user.institutionId === 'object' ? (user.institutionId as any) : null;
          const instId = typeof user.institutionId === 'string'
            ? user.institutionId
            : instObj?._id || instObj?.id;

          const userInst = res.items.find((i) => (i._id || i.id) === instId) || instObj;
          if (userInst) {
            const resolvedId = (userInst as any)._id || (userInst as any).id || instId;
            setInstitutionId(resolvedId);
            setInstitutionName((userInst as any).name || 'Authenticated Institution');
            setAicteCode((userInst as any).code || 'AICTE-CODE');
          }
        } else if (res.items && res.items.length > 0 && !institutionId) {
          const first = res.items[0];
          setInstitutionId((first as any)._id || first.id);
          setInstitutionName(first.name);
          setAicteCode(first.code);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchInsts();
  }, [isInstitution, user, institutionId]);

  const handleInstitutionSelect = (id: string) => {
    setInstitutionId(id);
    const inst = institutions.find((i) => i.id === id || (i as any)._id === id);
    if (inst) {
      setInstitutionName(inst.name);
      setAicteCode(inst.code);
    }
  };

  // Step navigation validations
  const validateStep1 = () => {
    let targetId = institutionId;
    if (!targetId && isInstitution && user?.institutionId) {
      const instObj = typeof user.institutionId === 'object' ? (user.institutionId as any) : null;
      targetId = typeof user.institutionId === 'string' ? user.institutionId : instObj?._id || instObj?.id;
      if (targetId) {
        setInstitutionId(targetId);
        setInstitutionName(instObj?.name || 'Authenticated Institution');
        setAicteCode(instObj?.code || 'AICTE-CODE');
        return true;
      }
    }
    if (!targetId) {
      toast.error('Please select an institution.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!refNumber.trim()) {
      toast.error('FDR Reference Number is mandatory.');
      return false;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid deposit amount.');
      return false;
    }
    if (!issueDate || !maturityDate) {
      toast.error('Both issue date and maturity date are required.');
      return false;
    }
    if (new Date(issueDate) >= new Date(maturityDate)) {
      toast.error('Maturity date must strictly succeed the issue date.');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!file) {
      toast.error('Please upload the scanned FDR certificate PDF or image.');
      return false;
    }
    return true;
  };

  const nextStep = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    setStep((s) => s + 1);
  };

  const prevStep = () => {
    setStep((s) => s - 1);
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('institutionId', institutionId);
      formData.append('refNumber', refNumber);
      formData.append('bankName', bankName);
      formData.append('branch', branch);
      formData.append('amount', amount);
      formData.append('currency', currency);
      formData.append('issueDate', issueDate);
      formData.append('maturityDate', maturityDate);
      formData.append('interestRate', interestRate);
      formData.append('compoundingFrequency', compoundingFrequency);
      formData.append('interestPayoutType', interestPayoutType);
      formData.append('jointWithAICTE', String(jointWithAICTE));
      if (file) {
        formData.append('document', file);
        formData.append('fdr_copy', file);
      }
      if (requestLetterFile) formData.append('request_letter', requestLetterFile);
      if (affidavit6File) formData.append('affidavit_6', affidavit6File);
      if (paymentProofFile) formData.append('payment_proof', paymentProofFile);
      if (eoaLoaFile) formData.append('eoa_loa', eoaLoaFile);

      await fdrsApi.createFDR(formData);
      toast.success('FDR submitted successfully into scrutiny ledger!');
      navigate('/fdrs');
    } catch {
      toast.error('Failed to submit FDR. Please verify fields and try again.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, label: 'Institution Details' },
    { num: 2, label: 'FDR Deposit Details' },
    { num: 3, label: 'Certificate Upload' },
    { num: 4, label: 'Review & Submit' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/fdrs')}
        leftIcon={<ArrowLeft className="w-4 h-4" />}
      >
        Back to Register
      </Button>

      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Submit Institutional Financial Deposit Receipt
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Register official security deposit guarantee with AICTE Member Secretary endorsement
        </p>
      </div>

      {/* Step Indicator */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
        <div className="grid grid-cols-4 gap-2">
          {steps.map((st) => {
            const isCompleted = step > st.num;
            const isCurrent = step === st.num;

            return (
              <div
                key={st.num}
                className="flex items-center gap-3"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                    isCompleted
                      ? 'bg-teal-600 text-white'
                      : isCurrent
                      ? 'bg-teal-100 text-teal-800 ring-2 ring-teal-600'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : st.num}
                </div>
                <div className="hidden sm:block min-w-0">
                  <div
                    className={`text-xs font-semibold truncate ${
                      isCurrent ? 'text-teal-900' : 'text-slate-600'
                    }`}
                  >
                    {st.label}
                  </div>
                  <div className="text-[10px] text-slate-400">Step 0{st.num}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Wizard Card */}
      <Card>
        {step === 1 && (
          <>
            <CardHeader
              title="Step 1: Institutional Verification"
              subtitle="Identify the technical institution providing this security deposit"
            />
            <CardContent className="space-y-4">
              {isInstitution ? (
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-teal-900 font-semibold text-sm">
                    <Building2 className="w-4 h-4 text-teal-600" />
                    <span>{institutionName}</span>
                  </div>
                  <div className="text-xs text-teal-700">
                    AICTE Permanent Institute ID: <span className="font-mono">{aicteCode}</span>
                  </div>
                  <div className="text-[11px] text-teal-600">
                    * Authenticated as Institution Nodal Officer. Institution bound automatically.
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Select
                    label="Select Institution"
                    value={institutionId}
                    onChange={(e) => handleInstitutionSelect(e.target.value)}
                    required
                  >
                    {institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.code})
                      </option>
                    ))}
                  </Select>

                  <Input
                    label="AICTE Institute Identification Number"
                    value={aicteCode}
                    disabled
                  />
                </div>
              )}
            </CardContent>
          </>
        )}

        {step === 2 && (
          <>
            <CardHeader
              title="Step 2: Deposit Instrument Parameters"
              subtitle="Enter deposit receipt terms as per issuing bank certificate"
            />
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="FDR Reference / Certificate Serial #"
                  placeholder="e.g. SBI-FDR-2026-98124"
                  required
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                />
                <Select
                  label="Issuing Scheduled Commercial Bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  required
                >
                  {INDIAN_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Branch Name & Location"
                  placeholder="e.g. Shivajinagar Branch, Pune"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                />
                <Input
                  label="Principal Deposit Amount (INR)"
                  type="number"
                  placeholder="5000000"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  helperText={formatCurrency(Number(amount))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Date of Issue"
                  type="date"
                  required
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
                <Input
                  label="Date of Maturity"
                  type="date"
                  required
                  value={maturityDate}
                  onChange={(e) => setMaturityDate(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Contracted Interest Rate (% p.a.)"
                  type="number"
                  step="0.05"
                  placeholder="7.1"
                  required
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                />
                <Select
                  label="Compounding Frequency"
                  value={compoundingFrequency}
                  onChange={(e) => setCompoundingFrequency(e.target.value as any)}
                >
                  <option value="quarterly">Quarterly Compounding (RBI Standard)</option>
                  <option value="monthly">Monthly Compounding</option>
                  <option value="half_yearly">Half-Yearly</option>
                  <option value="annual">Annual Compounding</option>
                  <option value="simple">Simple Interest</option>
                </Select>
                <Select
                  label="Interest Payout Model"
                  value={interestPayoutType}
                  onChange={(e) => setInterestPayoutType(e.target.value as any)}
                >
                  <option value="cumulative">Cumulative (Reinvestment at Maturity)</option>
                  <option value="periodic_payout">Periodic Payout to Registered Trust A/c</option>
                </Select>
              </div>

              {/* Live Yield & Maturity Preview Card */}
              {(() => {
                const previewTenureMonths = Math.max(1, Math.round((new Date(maturityDate).getTime() - new Date(issueDate).getTime()) / (1000 * 60 * 60 * 24 * 30.4375)));
                const p = Number(amount) || 0;
                const r = (Number(interestRate) || 7.1) / 100;
                const t = previewTenureMonths / 12;
                const n = compoundingFrequency === 'simple' ? 0 : compoundingFrequency === 'monthly' ? 12 : compoundingFrequency === 'half_yearly' ? 2 : compoundingFrequency === 'annual' ? 1 : 4;
                const previewMaturity = compoundingFrequency === 'simple' ? Math.round(p + p * r * t) : Math.round(p * Math.pow(1 + r / n, n * t));
                const previewInterest = Math.max(0, previewMaturity - p);
                const yieldPct = t > 0 ? ((previewInterest / p / t) * 100).toFixed(2) : (r * 100).toFixed(2);

                return (
                  <div className="rounded-xl border border-teal-200/80 bg-gradient-to-br from-teal-50/60 to-slate-50 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-teal-800">
                        Financial Valuation & Statutory Yield Preview
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-100 font-medium text-teal-800">
                        {previewTenureMonths} Months ({t.toFixed(1)} Yrs)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="bg-white/90 p-2.5 rounded-lg border border-slate-200/70">
                        <div className="text-[11px] text-slate-500 font-medium">Principal Under Lien</div>
                        <div className="text-sm font-bold text-slate-900 mt-0.5">{formatCurrency(p)}</div>
                      </div>
                      <div className="bg-white/90 p-2.5 rounded-lg border border-slate-200/70">
                        <div className="text-[11px] text-slate-500 font-medium">Projected Accrued Interest</div>
                        <div className="text-sm font-bold text-emerald-700 mt-0.5">+{formatCurrency(previewInterest)}</div>
                        <div className="text-[10px] text-slate-400">Effective Yield: {yieldPct}% p.a.</div>
                      </div>
                      <div className="bg-white/90 p-2.5 rounded-lg border border-teal-300/80 bg-teal-50/30">
                        <div className="text-[11px] text-teal-700 font-semibold">Total Projected Maturity Value</div>
                        <div className="text-sm font-extrabold text-teal-900 mt-0.5">{formatCurrency(previewMaturity)}</div>
                        <div className="text-[10px] text-teal-600">Discharged on Maturity</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-2">
                <label className="flex items-start gap-3 p-3 rounded-lg border border-teal-200 bg-teal-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={jointWithAICTE}
                    onChange={(e) => setJointWithAICTE(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-teal-900 block">
                      Mandatory Joint Lien Marking to AICTE Member Secretary
                    </span>
                    <span className="text-teal-700 text-[11px]">
                      I confirm that the fixed deposit certificate explicitly contains the endorsement
                      marking lien in favor of Member Secretary, AICTE.
                    </span>
                  </div>
                </label>
              </div>
            </CardContent>
          </>
        )}

        {step === 3 && (
          <>
            <CardHeader
              title="Step 3: Statutory Documents & Certificate Upload"
              subtitle="Upload the official FDR certificate and mandatory statutory documents for institutional deposit custody and clearance"
            />
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Doc 1: Official FDR Certificate (Mandatory) */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                    dragActive
                      ? 'border-teal-500 bg-teal-50/50'
                      : file
                      ? 'border-emerald-300 bg-emerald-50/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-900">
                        1. Official FDR Certificate
                      </div>
                      <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full tracking-wide uppercase">
                        Mandatory
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                      Scanned copy of official Fixed Deposit Receipt with AICTE joint-lien endorsement
                    </div>
                  </div>

                  <div className="mt-4">
                    {file ? (
                      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <File className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="truncate text-emerald-950 font-medium text-xs">{file.name}</span>
                          <span className="text-[11px] text-slate-500 shrink-0">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFile(null)}
                          className="text-rose-600 hover:text-rose-700 text-xs font-semibold ml-2 shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label className="block">
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setFile(e.target.files[0]);
                            }
                          }}
                        />
                        <span className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium py-2.5 cursor-pointer shadow-xs transition-colors">
                          <UploadCloud className="w-4 h-4" />
                          Upload FDR Certificate *
                        </span>
                      </label>
                    )}
                  </div>
                </div>

                {/* Doc 2: Institution Request Letter */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs flex flex-col justify-between transition-all">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      2. Institution Request Letter
                    </div>
                    <div className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                      Formal application on official institutional letterhead signed by authorized trustee
                    </div>
                  </div>

                  <div className="mt-4">
                    {requestLetterFile ? (
                      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <File className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="truncate text-emerald-950 font-medium text-xs">{requestLetterFile.name}</span>
                          <span className="text-[11px] text-slate-500 shrink-0">({(requestLetterFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setRequestLetterFile(null)}
                          className="text-rose-600 hover:text-rose-700 text-xs font-semibold ml-2 shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label className="block">
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={(e) => setRequestLetterFile(e.target.files?.[0] || null)}
                        />
                        <span className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium py-2.5 cursor-pointer text-slate-700 shadow-2xs transition-colors">
                          <UploadCloud className="w-4 h-4 text-slate-500" />
                          Upload Request Letter
                        </span>
                      </label>
                    )}
                  </div>
                </div>

                {/* Doc 3: Affidavit 6 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs flex flex-col justify-between transition-all">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      3. Affidavit 6 (Prescribed Format)
                    </div>
                    <div className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                      Sworn affidavit with Trust declarations and indemnity clauses on non-judicial stamp paper
                    </div>
                  </div>

                  <div className="mt-4">
                    {affidavit6File ? (
                      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <File className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="truncate text-emerald-950 font-medium text-xs">{affidavit6File.name}</span>
                          <span className="text-[11px] text-slate-500 shrink-0">({(affidavit6File.size / (1024 * 1024)).toFixed(2)} MB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAffidavit6File(null)}
                          className="text-rose-600 hover:text-rose-700 text-xs font-semibold ml-2 shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label className="block">
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={(e) => setAffidavit6File(e.target.files?.[0] || null)}
                        />
                        <span className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium py-2.5 cursor-pointer text-slate-700 shadow-2xs transition-colors">
                          <UploadCloud className="w-4 h-4 text-slate-500" />
                          Upload Affidavit 6
                        </span>
                      </label>
                    )}
                  </div>
                </div>

                {/* Doc 4: RPGF Payment Proof */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs flex flex-col justify-between transition-all">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      4. RPGF / Security Deposit Payment Proof
                    </div>
                    <div className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                      Demand draft copies or electronic payment transaction receipts remitted to AICTE
                    </div>
                  </div>

                  <div className="mt-4">
                    {paymentProofFile ? (
                      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <File className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="truncate text-emerald-950 font-medium text-xs">{paymentProofFile.name}</span>
                          <span className="text-[11px] text-slate-500 shrink-0">({(paymentProofFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPaymentProofFile(null)}
                          className="text-rose-600 hover:text-rose-700 text-xs font-semibold ml-2 shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label className="block">
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)}
                        />
                        <span className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium py-2.5 cursor-pointer text-slate-700 shadow-2xs transition-colors">
                          <UploadCloud className="w-4 h-4 text-slate-500" />
                          Upload Payment Proof
                        </span>
                      </label>
                    )}
                  </div>
                </div>

                {/* Doc 5: Latest LoA / EoA */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs flex flex-col justify-between transition-all sm:col-span-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      5. Latest Letter of Approval (LoA / EoA)
                    </div>
                    <div className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                      Official AICTE approval letter confirming sanctioned intake and program tenure completion
                    </div>
                  </div>

                  <div className="mt-4">
                    {eoaLoaFile ? (
                      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <File className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="truncate text-emerald-950 font-medium text-xs">{eoaLoaFile.name}</span>
                          <span className="text-[11px] text-slate-500 shrink-0">({(eoaLoaFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEoaLoaFile(null)}
                          className="text-rose-600 hover:text-rose-700 text-xs font-semibold ml-2 shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label className="block">
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={(e) => setEoaLoaFile(e.target.files?.[0] || null)}
                        />
                        <span className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium py-2.5 cursor-pointer text-slate-700 shadow-2xs transition-colors">
                          <UploadCloud className="w-4 h-4 text-slate-500" />
                          Upload LoA / EoA
                        </span>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </>
        )}

        {step === 4 && (
          <>
            <CardHeader
              title="Step 4: Final Regulatory Review"
              subtitle="Please verify all parameters before submitting to the immutable AICTE ledger"
            />
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">
                    Institution
                  </span>
                  <div className="font-bold text-slate-900 mt-0.5">{institutionName}</div>
                  <div className="text-slate-500 font-mono">{aicteCode}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">
                    Reference Number
                  </span>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">{refNumber}</div>
                  <div className="text-slate-500">{bankName}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">
                    Deposit Amount
                  </span>
                  <div className="text-lg font-bold text-teal-700 mt-0.5">
                    {formatCurrency(Number(amount))}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">
                    Tenure Term
                  </span>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {formatDate(issueDate)} to {formatDate(maturityDate)}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">
                    Contracted Interest Rate
                  </span>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {interestRate}% p.a. ({compoundingFrequency})
                  </div>
                  <div className="text-slate-500 text-[11px] capitalize">{interestPayoutType.replace('_', ' ')}</div>
                </div>

                <div className="p-3 bg-teal-50/70 border border-teal-200/80 rounded-lg">
                  <span className="text-teal-700 font-semibold uppercase text-[10px]">
                    Projected Value on Maturity
                  </span>
                  {(() => {
                    const previewTenureMonths = Math.max(1, Math.round((new Date(maturityDate).getTime() - new Date(issueDate).getTime()) / (1000 * 60 * 60 * 24 * 30.4375)));
                    const p = Number(amount) || 0;
                    const r = (Number(interestRate) || 7.1) / 100;
                    const t = previewTenureMonths / 12;
                    const n = compoundingFrequency === 'simple' ? 0 : compoundingFrequency === 'monthly' ? 12 : compoundingFrequency === 'half_yearly' ? 2 : compoundingFrequency === 'annual' ? 1 : 4;
                    const previewMaturity = compoundingFrequency === 'simple' ? Math.round(p + p * r * t) : Math.round(p * Math.pow(1 + r / n, n * t));
                    return (
                      <div className="text-base font-extrabold text-teal-900 mt-0.5">
                        {formatCurrency(previewMaturity)}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/60 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0" />
                <div className="text-xs text-teal-900">
                  Document attached: <span className="font-semibold">{file?.name}</span>. Upon
                  submission, the document will be securely stored and recorded in the official AICTE audit register.
                </div>
              </div>
            </CardContent>
          </>
        )}

        <CardFooter className="flex items-center justify-between">
          {step > 1 ? (
            <Button variant="outline" size="sm" onClick={prevStep}>
              Previous
            </Button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <Button
              variant="primary"
              size="sm"
              onClick={nextStep}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Continue to Step {step + 1}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              isLoading={loading}
              onClick={handleSubmit}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Confirm & Submit FDR
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};
