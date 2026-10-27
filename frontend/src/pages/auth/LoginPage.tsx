import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowRight, CheckCircle2, Sparkles, Building, UserCheck } from 'lucide-react';
import { Button, Input, Card, CardContent } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState('admin@fdrsentinel.gov.in');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState<string | null>(null);
  const [selectedRoleTab, setSelectedRoleTab] = useState<'admin' | 'officer' | 'institution'>('admin');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please provide both official email and password.');
      return;
    }

    const success = await login(email, password);
    if (success) {
      navigate('/dashboard');
    } else {
      setError('Invalid authorization credentials. Please verify your access.');
    }
  };

  const handleRoleSelect = (role: 'admin' | 'officer' | 'institution') => {
    setSelectedRoleTab(role);
    if (role === 'admin') {
      setEmail('admin@fdrsentinel.gov.in');
      setPassword('Admin@123');
    } else if (role === 'officer') {
      setEmail('officer.sharma@fdrsentinel.gov.in');
      setPassword('Officer@123');
    } else {
      setEmail('registrar@iitd.ac.in');
      setPassword('Inst@123');
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden selection:bg-teal-500/20 selection:text-teal-900">
      {/* Background ambient mesh and glow effects */}
      <div className="absolute top-1/4 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-grid-dark opacity-30 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Portal Emblem & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-600 via-teal-500 to-emerald-400 text-white shadow-xl shadow-teal-500/30 mb-4 ring-4 ring-teal-500/20">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Niddhi Setu
          </h1>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-semibold uppercase tracking-wider mt-2">
            <Sparkles className="w-3 h-3 text-teal-300" />
            AICTE Regulatory Deposit Portal
          </div>
          <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
            Official financial deposit repository and institutional guarantee management
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden">
          {/* Quick Role Switcher Tabs */}
          <div className="grid grid-cols-3 bg-slate-100/80 p-1.5 border-b border-slate-200/80">
            <button
              type="button"
              onClick={() => handleRoleSelect('admin')}
              className={`py-2 text-xs font-semibold rounded-xl transition-all ${
                selectedRoleTab === 'admin'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Admin Mode
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect('officer')}
              className={`py-2 text-xs font-semibold rounded-xl transition-all ${
                selectedRoleTab === 'officer'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Officer Mode
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect('institution')}
              className={`py-2 text-xs font-semibold rounded-xl transition-all ${
                selectedRoleTab === 'institution'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Institution
            </button>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-5">
              <h2 className="text-base font-bold text-slate-900">Sign in to your account</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Authorized regulatory clearance protocol
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Registered Official Email"
                type="email"
                placeholder="name@fdrsentinel.gov.in"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
              />

              <Input
                label="Security Password"
                type="password"
                placeholder="••••••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
              />

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>Remember session</span>
                </label>
                <a
                  href="#support"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Contact AICTE Regulatory Helpdesk at support@fdrsentinel.gov.in');
                  }}
                  className="text-teal-600 hover:text-teal-700 font-semibold"
                >
                  Forgot password?
                </a>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2 font-bold"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Enter Portal
              </Button>
            </form>

            <div className="mt-5 pt-5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-slate-500">
                <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                Active Preset: <strong className="text-slate-800 capitalize font-semibold">{selectedRoleTab}</strong>
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Authorized Access</span>
            </div>
          </div>
        </div>

        {/* Security watermark footer */}
        <div className="mt-6 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
          <span>Government of India • Ministry of Education Regulatory Security</span>
        </div>
      </div>
    </div>
  );
};
