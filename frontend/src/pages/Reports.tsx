import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReports, submitReport, verifyReport, dismissReport, Report } from '../services/api';
import { useAuth } from '../App';
import { t, getCurrentLanguage } from '../i18n/translations';
import {
  FileText, MapPin, CheckCircle2, Clock, Send, XCircle,
  AlertTriangle, ShieldCheck, Filter, Search, Plus, X,
  Compass, User, Phone, Check, RefreshCw, Layers, Radio,
  ExternalLink, Sparkles, Building2, Eye, ShieldAlert
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';

const REPORT_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  crack: { label: 'Tension Cracks', icon: '🔍', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  slope_movement: { label: 'Slope Movement / Slip', icon: '⛰️', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
  blocked_road: { label: 'Highway / Road Blocked', icon: '🛣️', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  flooding: { label: 'Waterlogging & Runoff', icon: '🌊', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  other: { label: 'General Hazard Observation', icon: '📌', color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
};

const REPORTER_ROLES = [
  { value: 'Local Resident', label: 'Local Resident', icon: '👤' },
  { value: 'Field Officer', label: 'Field Officer', icon: '🛡️' },
  { value: 'PWD Worker', label: 'PWD Maintenance', icon: '🚧' },
  { value: 'Village Head', label: 'Village Council Head', icon: '🏛️' },
];

const QUICK_LOCATIONS = [
  { name: 'Gangtok, Sikkim', lat: 27.3389, lng: 88.6065 },
  { name: 'Cherrapunji, Meghalaya', lat: 25.2700, lng: 91.7300 },
  { name: 'Aizawl, Mizoram', lat: 23.7271, lng: 92.7176 },
  { name: 'Kohima, Nagaland', lat: 25.6700, lng: 94.1100 },
  { name: 'Tawang, Arunachal', lat: 27.5860, lng: 91.8800 },
  { name: 'Namchi, Sikkim', lat: 27.1684, lng: 88.5510 },
];

export default function Reports() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canVerify = user?.role === 'admin' || user?.role === 'district_admin';
  const canDismiss = user && ['admin', 'field_officer', 'district_admin'].includes(user.role);

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'dismissed'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [actionFeedback, setActionFeedback] = useState<{ id: number; type: 'success' | 'error'; message: string } | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form State
  const [formType, setFormType] = useState('crack');
  const [formDesc, setFormDesc] = useState('');
  const [formLat, setFormLat] = useState('27.3389');
  const [formLng, setFormLng] = useState('88.6065');
  const [formRole, setFormRole] = useState('Local Resident');
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  useEffect(() => {
    if (actionFeedback) {
      const t = setTimeout(() => setActionFeedback(null), 3500);
      return () => clearTimeout(t);
    }
  }, [actionFeedback]);

  const fetchReports = useCallback(async () => {
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const res = await getReports(params);
      setReports(res.data);
    } catch (e) {
      console.error('Reports fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, 25000);
    return () => clearInterval(interval);
  }, [fetchReports]);

  const handleVerify = async (id: number) => {
    try {
      await verifyReport(id);
      setActionFeedback({ id, type: 'success', message: 'Report verified and promoted to ground-truth catalog!' });
      fetchReports();
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Verification failed. Admin permissions required.';
      setActionFeedback({ id, type: 'error', message: msg });
    }
  };

  const handleDismiss = async (id: number) => {
    try {
      await dismissReport(id);
      setActionFeedback({ id, type: 'success', message: 'Report dismissed.' });
      fetchReports();
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Dismissal failed.';
      setActionFeedback({ id, type: 'error', message: msg });
    }
  };

  const handleAutoGPS = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormLat(pos.coords.latitude.toFixed(5));
          setFormLng(pos.coords.longitude.toFixed(5));
        },
        () => {
          // Fallback to Gangtok
          setFormLat('27.3389');
          setFormLng('88.6065');
        }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('report_type', formType);
      formData.append('description', formDesc);
      formData.append('latitude', formLat || '27.3389');
      formData.append('longitude', formLng || '88.6065');
      const fullName = formName ? `${formRole} - ${formName}` : formRole;
      formData.append('reporter_name', fullName);
      if (formPhone) formData.append('reporter_phone', formPhone);
      formData.append('reporter_language', getCurrentLanguage());

      await submitReport(formData);
      setSuccess(true);
      resetTimer.current = setTimeout(() => {
        setShowModal(false);
        setSuccess(false);
        setFormDesc('');
        setFormName('');
        setFormPhone('');
        fetchReports();
      }, 1800);
    } catch (e: any) {
      console.error('Submit error:', e);
      setError(e.response?.data?.detail || 'Failed to submit report. Please check required fields.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchesType = typeFilter === 'all' || r.report_type === typeFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        r.description?.toLowerCase().includes(q) ||
        r.reporter_name?.toLowerCase().includes(q) ||
        r.report_type?.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [reports, typeFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = reports.length;
    const pending = reports.filter((r) => r.status === 'pending').length;
    const verified = reports.filter((r) => r.status === 'verified').length;
    const dismissed = reports.filter((r) => r.status === 'dismissed').length;
    const rate = total > 0 ? Math.round((verified / total) * 100) : 0;
    return { total, pending, verified, dismissed, rate };
  }, [reports]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in min-w-0">
      {/* 1. Header Banner */}
      <div className="bg-white border border-slate-900 rounded-2xl p-5 sm:p-6 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-sky-50 to-emerald-50 border border-sky-200/80 flex items-center justify-center text-sky-700 shrink-0 shadow-xs">
            <FileText className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Field & Citizen Incident Reports
              </h1>
              <Badge variant="sky" size="md">
                North Eastern Region
              </Badge>
              {stats.pending > 0 && (
                <Badge variant="warning" size="sm">
                  {stats.pending} Awaiting Review
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
              Ground-truth hazard verifications, road blockage reports & citizen slope anomaly alerts across NER districts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => fetchReports()}
            className="p-2.5 rounded-xl border border-slate-300 hover:border-slate-900 bg-white text-slate-700 hover:text-slate-900 transition-all shadow-xs"
            title="Refresh Reports"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setShowModal(true);
              setError('');
              setSuccess(false);
            }}
            className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm transition-all shadow-card hover:shadow-card-hover flex items-center gap-2 border border-slate-900"
          >
            <Plus className="w-4 h-4" />
            <span>Submit Incident Report</span>
          </button>
        </div>
      </div>

      {/* 2. Top 4 KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Reports */}
        <div className="bg-white border border-slate-900 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
              <FileText className="w-5 h-5" />
            </div>
            <Badge variant="outline" size="sm">
              All Time
            </Badge>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{stats.total}</p>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
            Total Filed Incidents
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Verified Ground Truth:</span>
            <strong className="text-slate-800">{stats.verified} reports</strong>
          </div>
        </div>

        {/* Pending Verification */}
        <div className="bg-white border border-slate-900 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
            <Badge variant="warning" size="sm">
              Action Required
            </Badge>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-600">{stats.pending}</p>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
            Pending Verification
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Requires Field Check:</span>
            <strong className="text-amber-700 font-bold">{stats.pending} active</strong>
          </div>
        </div>

        {/* Verified Ground Truth */}
        <div className="bg-white border border-slate-900 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <Badge variant="success" size="sm">
              Confirmed
            </Badge>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600">{stats.verified}</p>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
            Verified Hazard Incidents
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Model Integration:</span>
            <strong className="text-emerald-700 font-bold">100% Ingested</strong>
          </div>
        </div>

        {/* Verification Rate */}
        <div className="bg-white border border-slate-900 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <Badge variant="sky" size="sm">
              Resolution
            </Badge>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{stats.rate}%</p>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
            Verification Resolution Rate
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <Progress value={stats.rate} className="h-2" />
          </div>
        </div>
      </div>

      {/* 3. Filters & Search Toolbar */}
      <div className="bg-white border border-slate-900 rounded-2xl p-4 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { key: 'all', label: 'All Incidents', count: stats.total },
            { key: 'pending', label: 'Pending Review', count: stats.pending, color: 'text-amber-700 bg-amber-50' },
            { key: 'verified', label: 'Verified Ground Truth', count: stats.verified, color: 'text-emerald-700 bg-emerald-50' },
            { key: 'dismissed', label: 'Dismissed', count: stats.dismissed, color: 'text-slate-600 bg-slate-100' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key as any)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shrink-0 select-none border ${
                statusFilter === tab.key
                  ? 'bg-sky-50 text-sky-800 border-slate-900 shadow-xs ring-1 ring-sky-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${tab.color || 'bg-slate-100 text-slate-700'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Hazard Type Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search description, place, reporter..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-sky-200 transition-all bg-slate-50/50"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-slate-900"
          >
            <option value="all">All Hazard Types</option>
            <option value="crack">🔍 Tension Cracks</option>
            <option value="slope_movement">⛰️ Slope Movement</option>
            <option value="blocked_road">🛣️ Blocked Highway</option>
            <option value="flooding">🌊 Waterlogging</option>
            <option value="other">📌 Other Hazard</option>
          </select>
        </div>
      </div>

      {/* 4. Action Notification Toast */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold shadow-card animate-fade-in ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-slate-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 5. Incident Reports Grid */}
      {loading ? (
        <div className="bg-white border border-slate-900 rounded-2xl p-12 text-center shadow-card flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-3 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-700">Loading ground-truth incident records...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-white border border-slate-900 rounded-2xl p-12 text-center shadow-card space-y-3">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No Incident Reports Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No reports match the current filter selection. Try changing the status tab or hazard category.
          </p>
          <button
            onClick={() => { setStatusFilter('all'); setTypeFilter('all'); setSearchQuery(''); }}
            className="px-4 py-2 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold text-xs border border-sky-200"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReports.map((report) => {
            const typeConfig = REPORT_TYPE_CONFIG[report.report_type] || REPORT_TYPE_CONFIG.other;
            const isVerified = report.status === 'verified';
            const isPending = report.status === 'pending';
            const isDismissed = report.status === 'dismissed';

            return (
              <div
                key={report.id}
                className="bg-white border border-slate-900 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base border shrink-0 ${typeConfig.bg}`}>
                        <span>{typeConfig.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm truncate">
                          {typeConfig.label}
                        </h4>
                        <p className="text-xs text-slate-500 flex items-center gap-1 font-medium mt-0.5">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="truncate">{report.reporter_name || 'Anonymous Citizen'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider shrink-0 flex items-center gap-1 border ${
                        isVerified
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : isPending
                          ? 'bg-amber-50 text-amber-700 border-amber-300'
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}
                    >
                      {isVerified && <CheckCircle2 className="w-3 h-3" />}
                      {isPending && <Clock className="w-3 h-3 animate-pulse" />}
                      {isDismissed && <XCircle className="w-3 h-3" />}
                      <span>{report.status}</span>
                    </span>
                  </div>

                  {/* Incident Description */}
                  <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed mb-4 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    "{report.description}"
                  </p>

                  {/* Metadata Chips */}
                  <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600 mb-4">
                    <div className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 flex items-center gap-1.5 font-mono text-[11px]">
                      <MapPin className="w-3 h-3 text-sky-600" />
                      <span>{report.latitude?.toFixed(4)}° N, {report.longitude?.toFixed(4)}° E</span>
                    </div>

                    <div className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 flex items-center gap-1.5 text-[11px]">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{report.created_at ? new Date(report.created_at).toLocaleString() : 'Just now'}</span>
                    </div>

                    {report.reporter_language && (
                      <div className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-100 text-[10px] font-bold uppercase">
                        {report.reporter_language}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => navigate('/map')}
                    className="text-xs font-bold text-sky-700 hover:text-sky-800 flex items-center gap-1 hover:underline"
                  >
                    <Compass className="w-3.5 h-3.5 text-sky-600" />
                    <span>View on Risk Map</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {isPending && canVerify && (
                      <button
                        onClick={() => handleVerify(report.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-xs flex items-center gap-1 border border-slate-900"
                      >
                        <Check className="w-3 h-3" />
                        <span>Verify</span>
                      </button>
                    )}

                    {isPending && canDismiss && (
                      <button
                        onClick={() => handleDismiss(report.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs transition-all border border-slate-300 hover:border-rose-400 flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        <span>Dismiss</span>
                      </button>
                    )}

                    {isVerified && (
                      <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Ground-Truth Active
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Submit Incident Report Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-900 rounded-3xl shadow-card max-w-lg w-full overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-sky-50 via-slate-50 to-emerald-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">File Field / Citizen Report</h3>
                  <p className="text-xs text-slate-500">Report tension cracks, ground shifts & highway blocks</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {success ? (
                <div className="text-center py-8 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border-2 border-emerald-300">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <h4 className="text-lg font-black text-slate-900">Incident Reported Successfully!</h4>
                  <p className="text-xs text-slate-600 max-w-xs mx-auto">
                    Thank you for your report. The telemetry has been submitted to the emergency operations center.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  {error && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Hazard Type Selector */}
                  <div>
                    <label className="font-bold text-slate-800 block mb-1.5">
                      1. Hazard Observation Category *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(REPORT_TYPE_CONFIG).map(([key, config]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setFormType(key)}
                          className={`p-2 rounded-xl text-left border transition-all flex items-center gap-2 ${
                            formType === key
                              ? 'bg-sky-50 border-slate-900 ring-2 ring-sky-300 text-slate-900 shadow-xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                          }`}
                        >
                          <span className="text-lg">{config.icon}</span>
                          <span className="font-bold truncate text-[11px]">{config.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="font-bold text-slate-800 block mb-1.5">
                      2. Hazard Description & Field Details *
                    </label>
                    <textarea
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      placeholder="Describe the crack size, water flow, rockfall, affected road segment..."
                      required
                      rows={3}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-sky-200"
                    />
                  </div>

                  {/* Coordinate Location */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-bold text-slate-800">
                        3. GPS Geographic Coordinates *
                      </label>
                      <button
                        type="button"
                        onClick={handleAutoGPS}
                        className="text-[11px] font-bold text-sky-700 hover:underline flex items-center gap-1"
                      >
                        <MapPin className="w-3 h-3 text-sky-600" />
                        <span>Use My GPS</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Latitude (°N)</span>
                        <input
                          type="number"
                          step="any"
                          value={formLat}
                          onChange={(e) => setFormLat(e.target.value)}
                          required
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Longitude (°E)</span>
                        <input
                          type="number"
                          step="any"
                          value={formLng}
                          onChange={(e) => setFormLng(e.target.value)}
                          required
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
                        />
                      </div>
                    </div>

                    {/* Quick Preset Locations */}
                    <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1">
                      <span className="text-[10px] font-semibold text-slate-400 shrink-0">Presets:</span>
                      {QUICK_LOCATIONS.map((loc) => (
                        <button
                          key={loc.name}
                          type="button"
                          onClick={() => {
                            setFormLat(loc.lat.toString());
                            setFormLng(loc.lng.toString());
                          }}
                          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold shrink-0 border border-slate-200"
                        >
                          {loc.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reporter Affiliation */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="font-bold text-slate-800 block mb-1">
                        Reporter Role
                      </label>
                      <select
                        value={formRole}
                        onChange={(e) => setFormRole(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-slate-900"
                      >
                        {REPORTER_ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.icon} {r.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-800 block mb-1">
                        Contact / Phone (Optional)
                      </label>
                      <input
                        type="tel"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="+91 9876543210"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-all shadow-card hover:shadow-card-hover flex items-center gap-1.5 border border-slate-900 disabled:opacity-50"
                    >
                      {submitting ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>{submitting ? 'Submitting Report...' : 'Submit Incident Report'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
