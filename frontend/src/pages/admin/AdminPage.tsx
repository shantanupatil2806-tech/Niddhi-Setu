import React, { useState } from 'react';
import {
  Settings,
  Users,
  UserPlus,
  ShieldCheck,
  CheckCircle,
  XCircle,
  BellRing,
  Database,
  Lock,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Button,
  Tabs,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Modal,
  Input,
  Select,
} from '../../components/ui';
import { MOCK_USERS, MOCK_INSTITUTIONS } from '../../api/mockData';
import { User, UserRole } from '../../types';
import { ROLE_LABELS } from '../../utils/constants';
import toast from 'react-hot-toast';

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'settings'>('users');
  const [users, setUsers] = useState<User[]>(MOCK_USERS);

  // New user modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('officer');
  const [institutionId, setInstitutionId] = useState(MOCK_INSTITUTIONS[0].id);

  // Settings State
  const [threshold30, setThreshold30] = useState(true);
  const [threshold60, setThreshold60] = useState(true);
  const [threshold90, setThreshold90] = useState(false);
  const [maxFileSize, setMaxFileSize] = useState('15');
  const [defaultCurrency, setDefaultCurrency] = useState('INR');
  const [autoOcrEnabled, setAutoOcrEnabled] = useState(true);

  const tabs = [
    { id: 'users', label: 'Authorized Users & Roles', icon: <Users className="w-4 h-4" /> },
    { id: 'settings', label: 'System & Policy Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error('All fields are required.');
      return;
    }

    const newUser: User = {
      id: `usr-${Date.now()}`,
      name,
      email,
      role,
      institutionId: role === 'institution' ? institutionId : undefined,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    setUsers((prev) => [...prev, newUser]);
    toast.success(`User ${name} created successfully!`);
    setIsModalOpen(false);
    setName('');
    setEmail('');
    setPassword('');
  };

  const toggleUserActive = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const updated = { ...u, isActive: !u.isActive };
          toast.success(`User ${u.name} status updated to ${updated.isActive ? 'Active' : 'Inactive'}`);
          return updated;
        }
        return u;
      })
    );
  };

  const handleSaveSettings = () => {
    toast.success('Surveillance policies and threshold configurations updated successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-teal-600" />
          <span>System Administration</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage officer authorizations, institutional access credentials, and notification thresholds
        </p>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={(id) => setActiveTab(id as any)} />

      {/* Users Tab */}
      {activeTab === 'users' && (
        <Card>
          <CardHeader
            title={`Authorized Portal Users (${users.length})`}
            subtitle="Regulatory officers and authorized institutional representatives"
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                leftIcon={<UserPlus className="w-4 h-4" />}
              >
                Register New User
              </Button>
            }
          />
          <CardContent className="p-0">
            <Table>
              <Thead>
                <Tr>
                  <Th>Name & Identification</Th>
                  <Th>Official Email</Th>
                  <Th>Access Role</Th>
                  <Th>Institution Affiliation</Th>
                  <Th>Account Status</Th>
                  <Th>Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {users.map((u) => (
                  <Tr key={u.id}>
                    <Td>
                      <div className="font-semibold text-xs text-slate-900">{u.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{u.id}</div>
                    </Td>
                    <Td>
                      <span className="text-xs text-slate-700">{u.email}</span>
                    </Td>
                    <Td>
                      <Badge
                        variant={u.role === 'admin' ? 'teal' : u.role === 'officer' ? 'info' : 'neutral'}
                        size="sm"
                      >
                        {ROLE_LABELS[u.role]}
                      </Badge>
                    </Td>
                    <Td>
                      <span className="text-xs text-slate-600">
                        {u.institutionId ? 'COEP Technological University' : 'AICTE Central HQ'}
                      </span>
                    </Td>
                    <Td>
                      <Badge variant={u.isActive ? 'success' : 'danger'} dot size="sm">
                        {u.isActive ? 'Active' : 'Suspended'}
                      </Badge>
                    </Td>
                    <Td>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs px-2.5 py-1"
                        onClick={() => toggleUserActive(u.id)}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Threshold Reminders Card */}
          <Card>
            <CardHeader
              title="Automated Maturity Reminder Thresholds"
              subtitle="Configure surveillance notifications dispatched before deposit guarantee lapse"
            />
            <CardContent className="space-y-4">
              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white cursor-pointer hover:bg-slate-50/70">
                <div>
                  <div className="font-semibold text-xs text-slate-900">
                    30-Day Critical Warning Notice
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Dispatches high-priority alert to Institution Nodal Officer & Scrutiny Officer
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={threshold30}
                  onChange={(e) => setThreshold30(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white cursor-pointer hover:bg-slate-50/70">
                <div>
                  <div className="font-semibold text-xs text-slate-900">
                    60-Day Proactive Renewal Reminder
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Sends automated advisory to issuing bank branch and college registrar
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={threshold60}
                  onChange={(e) => setThreshold60(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white cursor-pointer hover:bg-slate-50/70">
                <div>
                  <div className="font-semibold text-xs text-slate-900">
                    90-Day Advance Notification
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Surfaces upcoming rollovers on executive dashboard
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={threshold90}
                  onChange={(e) => setThreshold90(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
              </label>
            </CardContent>
          </Card>

          {/* Engine Parameters Card */}
          <Card>
            <CardHeader
              title="Surveillance Engine Parameters"
              subtitle="Cryptographic hashing and document constraints"
            />
            <CardContent className="space-y-4">
              <Input
                label="Maximum Certificate Upload File Size (MB)"
                type="number"
                value={maxFileSize}
                onChange={(e) => setMaxFileSize(e.target.value)}
                helperText="Maximum allowed file size for PDF / scanned images"
              />

              <Select
                label="Default Deposit Currency"
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
              >
                <option value="INR">INR — Indian Rupee (₹)</option>
                <option value="USD">USD — US Dollar ($)</option>
              </Select>

              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white cursor-pointer hover:bg-slate-50/70">
                <div>
                  <div className="font-semibold text-xs text-slate-900">
                    Automated AI OCR Pipeline
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Automatically extract amount, validity dates, and joint lien endorsements
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoOcrEnabled}
                  onChange={(e) => setAutoOcrEnabled(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
              </label>

              <div className="pt-2">
                <Button variant="primary" size="sm" onClick={handleSaveSettings}>
                  Save Configuration Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register Authorized User"
        subtitle="Grant role-based credentials for AICTE portal access"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateUser}>
              Create User Account
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input
            label="Full Legal Name"
            placeholder="e.g. Dr. Satish Deshmukh"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Official Registered Email"
            type="email"
            placeholder="satish.deshmukh@aicte.gov.in"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Initial Security Password"
            type="password"
            placeholder="••••••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Select
            label="Portal Access Role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            <option value="officer">Scrutiny Officer (AICTE Staff)</option>
            <option value="admin">AICTE Administrator</option>
            <option value="institution">Institution Nodal Officer</option>
          </Select>

          {role === 'institution' && (
            <Select
              label="Assigned Technical Institution"
              value={institutionId}
              onChange={(e) => setInstitutionId(e.target.value)}
            >
              {MOCK_INSTITUTIONS.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </Select>
          )}
        </form>
      </Modal>
    </div>
  );
};
