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

  // Step 3: Document
  const [file, setFile] = useState<File | null>(null);
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
      formData.append('jointWithAICTE', String(jointWithAICTE));
      if (file) {
        formData.append('document', file);
      }

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
              title="Step 3: Cryptographic Certificate Upload"
              subtitle="Upload scanned color copy of FDR certificate (PDF / JPEG / PNG, max 15MB)"
            />
            <CardContent>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                  dragActive
                    ? 'border-teal-500 bg-teal-50/50'
                    : file
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/40'
                }`}
              >
                {file ? (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                      <File className="w-6 h-6" />
                    </div>
                    <div className="font-semibold text-slate-900 text-sm">{file.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for Submission
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-4 text-rose-600"
                      onClick={() => setFile(null)}
                    >
                      Remove File
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div className="font-semibold text-slate-900 text-sm">
                      Drag and drop the official FDR scan here
                    </div>
                    <div className="text-xs text-slate-500 mt-1 mb-4">
                      or click the button below to browse from your device
                    </div>
                    <label>
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
                      <span className="inline-flex items-center justify-center font-medium rounded-lg text-sm px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white cursor-pointer shadow-xs">
                        Browse Files
                      </span>
                    </label>
                  </div>
                )}
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
