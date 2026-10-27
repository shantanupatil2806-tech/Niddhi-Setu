import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building2, Plus, Filter, MapPin, Mail, Phone } from 'lucide-react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Input,
  Select,
  Card,
  CardHeader,
  CardContent,
  Pagination,
  Badge,
  Spinner,
  EmptyState,
  Modal,
} from '../../components/ui';
import { institutionsApi } from '../../api/institutions';
import { Institution } from '../../types';
import { usePagination } from '../../hooks/usePagination';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { INSTITUTION_TYPES, INDIAN_STATES } from '../../utils/constants';
import toast from 'react-hot-toast';

export const InstitutionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { page, limit, total, totalPages, setPage, setTotal } = usePagination();

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');

  // Modal for new institution
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newType, setNewType] = useState(INSTITUTION_TYPES[0]);
  const [newCity, setNewCity] = useState('Pune');
  const [newState, setNewState] = useState(INDIAN_STATES[11]);
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchInstitutions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await institutionsApi.getInstitutions({
        search,
        type: selectedType,
        status: selectedStatus,
        city: selectedCity,
        page,
        limit,
      });
      setInstitutions(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error('Error fetching institutions:', err);
      toast.error('Failed to load institutions');
    } finally {
      setLoading(false);
    }
  }, [search, selectedType, selectedStatus, selectedCity, page, limit, setTotal]);

  useEffect(() => {
    fetchInstitutions();
  }, [fetchInstitutions]);

  const handleCreateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) {
      toast.error('Institution name and contact email are required.');
      return;
    }
    try {
      setSubmitting(true);
      await institutionsApi.createInstitution({
        name: newName,
        code: newCode || `AICTE-RO-1-${Math.floor(1000000 + Math.random() * 9000000)}`,
        type: newType,
        address: {
          city: newCity,
          state: newState,
        },
        contactEmail: newEmail,
        contactPhone: newPhone,
      });
      toast.success('Institution created successfully!');
      setIsModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      fetchInstitutions();
    } catch {
      toast.error('Failed to create institution');
    } finally {
      setSubmitting(false);
    }
  };

  const getCity = (inst: Institution) => {
    if (typeof inst.address === 'object' && inst.address.city) return inst.address.city;
    return inst.city || '—';
  };

  const getState = (inst: Institution) => {
    if (typeof inst.address === 'object' && inst.address.state) return inst.address.state;
    return inst.state || '—';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Institutional Registry
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Registered technical universities, colleges, and polytechnics under AICTE jurisdiction
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Institution
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="lg:col-span-2">
              <Input
                placeholder="Search by name, AICTE code, email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>

            {/* Type Filter */}
            <div>
              <Select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Types</option>
                {INSTITUTION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <Select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </Select>
            </div>

            {/* City Filter */}
            <div>
              <Select
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Cities</option>
                <option value="pune">Pune</option>
                <option value="delhi">Delhi</option>
                <option value="bengaluru">Bengaluru</option>
                <option value="mumbai">Mumbai</option>
                <option value="coimbatore">Coimbatore</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Institutions Data Table */}
      <Card>
        <CardHeader
          title={`Approved Institutions (${total})`}
          subtitle="Click on any institution record to inspect linked FDR instruments and audit history"
        />
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16">
              <Spinner label="Loading institutions data..." />
            </div>
          ) : institutions.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No institutions found"
              description="No institution matched your filter criteria. Try adjusting your search query."
              actionLabel="Clear Filters"
              onAction={() => {
                setSearch('');
                setSelectedType('all');
                setSelectedStatus('all');
                setSelectedCity('all');
              }}
            />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Institution Name & Code</Th>
                  <Th>Discipline Type</Th>
                  <Th>Location</Th>
                  <Th>FDR Guarantees</Th>
                  <Th>Total Deposit Value</Th>
                  <Th>Approval Date</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {institutions.map((inst) => (
                  <Tr
                    key={inst.id}
                    isClickable
                    onClick={() => navigate(`/institutions/${inst.id}`)}
                  >
                    <Td>
                      <div className="font-semibold text-slate-900 leading-tight">
                        {inst.name}
                      </div>
                      <div className="text-xs font-mono text-slate-400 mt-0.5">
                        {inst.code}
                      </div>
                    </Td>
                    <Td>
                      <span className="text-xs text-slate-600">{inst.type}</span>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1.5 text-xs text-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {getCity(inst)}, {getState(inst)}
                        </span>
                      </div>
                    </Td>
                    <Td>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                        {inst.totalFDRs ?? 3} Active FDRs
                      </span>
                    </Td>
                    <Td>
                      <span className="font-semibold text-slate-900 text-xs">
                        {formatCurrency(inst.totalAmount || 18500000)}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-xs text-slate-500">
                        {formatDate(inst.approvalDate)}
                      </span>
                    </Td>
                    <Td>
                      <Badge
                        variant={inst.status === 'active' ? 'success' : 'warning'}
                        dot
                      >
                        {inst.status === 'active' ? 'Active' : 'Pending'}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}

          {/* Pagination Controls */}
          {!loading && institutions.length > 0 && (
            <div className="p-4 border-t border-slate-100">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={total}
                pageSize={limit}
                onPageChange={(p) => setPage(p)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Institution Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register New Institution"
        subtitle="Add an AICTE approved technical college or university to the surveillance network"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={submitting}
              onClick={handleCreateInstitution}
            >
              Save Institution
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateInstitution} className="space-y-4">
          <Input
            label="Institution Full Legal Name"
            placeholder="e.g. Veermata Jijabai Technological Institute (VJTI)"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="AICTE Permanent Institute ID"
              placeholder="e.g. AICTE-WRO-1-7362910"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
            />
            <Select
              label="Primary Academic Category"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
            >
              {INSTITUTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Campus City"
              placeholder="e.g. Mumbai"
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
            />
            <Select
              label="State / Union Territory"
              value={newState}
              onChange={(e) => setNewState(e.target.value)}
            >
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nodal Officer Email"
              type="email"
              placeholder="registrar@college.edu.in"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
            />
            <Input
              label="Contact Landline / Phone"
              placeholder="+91 22 2419 8100"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              leftIcon={<Phone className="w-4 h-4" />}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
