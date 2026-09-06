import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  getAlerts, acknowledgeAlert, resolveAlert, getAlertTimeline, getAlertHistory,
  Alert as AlertType, TimelineEntry,
} from '../services/api';
import { t } from '../i18n/translations';
import { useAuth } from '../App';
import {
  AlertTriangle, CheckCircle, XCircle, Clock, Users, MapPin, Radio, Bell,
  BarChart3, List, History, ChevronRight, Activity, TrendingUp,
  ShieldAlert, Sparkles, Filter, CheckCircle2, Shield, Zap, RefreshCw
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';

const RISK_CONFIG: Record<string, { badgeVariant: 'destructive' | 'warning' | 'sky' | 'success'; color: string; bg: string; text: string; border: string; dot: string }> = {
  critical: { badgeVariant: 'destructive', color: '#f43f5e', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200/80', dot: 'bg-rose-500' },
  high: { badgeVariant: 'warning', color: '#f97316', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200/80', dot: 'bg-orange-500' },
  moderate: { badgeVariant: 'warning', color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200/80', dot: 'bg-amber-500' },
  low: { badgeVariant: 'success', color: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/80', dot: 'bg-emerald-500' },
};

export default function Alerts() {
  const { user } = useAuth();
  const canAcknowledge = user && ['admin', 'field_officer', 'district_admin'].includes(user.role);
  const canResolve = user?.role === 'admin';
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [filter, setFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<'list' | 'timeline' | 'history'>('list');
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [timelineSummary, setTimelineSummary] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyDays, setHistoryDays] = useState<number>(30);
  const [actionFeedback, setActionFeedback] = useState<{ id: number; type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (actionFeedback) {
      const timer = setTimeout(() => setActionFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [actionFeedback]);

  const fetchAlerts = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const params: { status?: string } = {};
      if (filter !== 'all') params.status = filter;
      const res = await getAlerts(params);
      let data = res.data || [];
      if (riskFilter !== 'all') {
        data = data.filter((a: AlertType) => a.risk_level === riskFilter);
      }
      setAlerts(data);
    } catch (e) {
      console.error('Alert fetch error:', e);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, [filter, riskFilter]);

  const fetchTimeline = useCallback(async () => {
    try {
      const res = await getAlertTimeline(72);
      setTimeline(res.data?.timeline || []);
      setTimelineSummary(res.data?.summary || null);
    } catch (e) {
      console.error('Timeline fetch error:', e);
    }
  }, []);

  const fetchHistory = useCallback(async (days: number = 30) => {
    try {
      const res = await getAlertHistory(days);
      setHistoryData(res.data || []);
    } catch (e) {
      console.error('History fetch error:', e);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    if (view === 'timeline') fetchTimeline();
    if (view === 'history') fetchHistory(historyDays);
    const interval = setInterval(() => fetchAlerts(), 15000);
    return () => clearInterval(interval);
  }, [fetchAlerts, fetchTimeline, fetchHistory, view]);

  const handleAcknowledge = async (id: number) => {
    try {
      await acknowledgeAlert(id);
      setActionFeedback({ id, type: 'success', message: t('alertAcknowledged') || 'Alert acknowledged successfully' });
      fetchAlerts();
    } catch (e: any) {
      const msg = e.response?.data?.detail || t('acknowledgeFailed') || 'Failed to acknowledge alert';
      setActionFeedback({ id, type: 'error', message: msg });
    }
  };

  const handleResolve = async (id: number) => {
    try {
      await resolveAlert(id);
      setActionFeedback({ id, type: 'success', message: t('alertResolved') || 'Alert marked as resolved' });
      fetchAlerts();
    } catch (e: any) {
      const msg = e.response?.data?.detail || t('resolveFailed') || 'Failed to resolve alert';
      setActionFeedback({ id, type: 'error', message: msg });
    }
  };

  const stats = useMemo(() => {
    return {
      total: alerts.length,
      critical: alerts.filter(a => a.risk_level === 'critical').length,
      high: alerts.filter(a => a.risk_level === 'high').length,
      active: alerts.filter(a => a.status === 'active').length,
      acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
      resolved: alerts.filter(a => a.status === 'resolved').length,
    };
  }, [alerts]);

    const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((acc: number, p: any) => acc + (typeof p.value === 'number' ? p.value : 0), 0);
      return (
        <div className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border border-slate-200 dark:border-white/15 rounded-2xl px-4 py-3 shadow-2xl space-y-2 min-w-[170px]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-white/10 pb-1.5">
            <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-zinc-400">{label}</span>
            <span className="text-[11px] font-black text-slate-900 dark:text-white font-mono">{total} Alerts</span>
          </div>
          <div className="space-y-1">
            {payload.map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs gap-3 font-mono">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-300 font-sans">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color || p.stroke || p.fill }} />
                  <span>{p.name}</span>
                </span>
                <span className="font-bold text-slate-900 dark:text-white">{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto animate-fade-in min-w-0">
      {/* Top Banner & View Switcher Navigation */}
      <div className="bg-white border border-slate-900 rounded-2xl p-4 sm:p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200/80 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 shadow-xs">
            <Bell className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 tracking-tight truncate">
                {t('alerts')}
              </h1>
              <Badge variant={stats.active > 0 ? 'destructive' : 'success'} size="md">
                {stats.active > 0 ? `${stats.active} Active Early Warnings` : 'All Clear'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1 truncate">
              {t('earlyWarningSubtitle') || 'Multi-level risk escalation, ground telemetry & response workflow'}
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/80 text-xs">
            {[
              { key: 'list', icon: List, label: 'Alert Stream' },
              { key: 'timeline', icon: Clock, label: '72h Timeline' },
              { key: 'history', icon: History, label: '30-Day Trend' },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setView(key as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all select-none ${
                  view === key
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAlerts(true)}
            disabled={refreshing}
            className="text-slate-600 hover:text-sky-600 shrink-0 h-9"
            title="Refresh alerts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-sky-600' : ''}`} />
            <span className="hidden md:inline ml-1.5">Refresh</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 min-w-0">
        {[
          { label: t('totalAlerts') || 'Total Alerts', value: stats.total, sub: 'All recorded incidents', icon: Bell, color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 border-sky-200/80 dark:border-sky-500/20' },
          { label: t('active') || 'Active Urgent', value: stats.active, sub: stats.active > 0 ? 'Requires intervention' : 'Zero active threats', icon: Radio, color: stats.active > 0 ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200/80 dark:border-rose-500/20' : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/80 dark:border-emerald-500/20', pulse: stats.active > 0 },
          { label: t('criticalLevelShort') || 'Critical Risk', value: stats.critical, sub: 'Immediate life safety', icon: AlertTriangle, color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200/80 dark:border-rose-500/20' },
          { label: t('highRiskLabel') || 'High Risk Watch', value: stats.high, sub: 'Slope deformation alert', icon: Zap, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200/80 dark:border-amber-500/20' },
        ].map((card, i) => (
          <Card key={i} className="p-3.5 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">{card.label}</span>
              <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${card.color}`}>
                <card.icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                {card.value}
                {card.pulse && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">
                {card.sub}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Action Toast Feedback */}
      {actionFeedback && (
        <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-fade-in ${
          actionFeedback.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {actionFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {/* ==================== 1. ALERT STREAM LIST VIEW ==================== */}
      {view === 'list' && (
        <div className="space-y-4 min-w-0">
          {/* Filters Toolbar */}
          <Card className="p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 min-w-0">
            {/* Status Filter */}
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 shrink-0">
                <Filter className="w-3 h-3 text-slate-400" />
                Status:
              </span>
              <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200/80 text-xs">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'active', label: `Active (${stats.active})` },
                  { key: 'acknowledged', label: `Acknowledged (${stats.acknowledged})` },
                  { key: 'resolved', label: `Resolved (${stats.resolved})` },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-all select-none ${
                      filter === key
                        ? 'bg-white text-sky-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Risk Tier Filter */}
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="text-xs font-semibold text-slate-500 shrink-0">
                Severity:
              </span>
              <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200/80 text-xs">
                {[
                  { key: 'all', label: 'All Levels' },
                  { key: 'critical', label: 'Critical' },
                  { key: 'high', label: 'High' },
                  { key: 'moderate', label: 'Moderate' },
                  { key: 'low', label: 'Low' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setRiskFilter(key)}
                    className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-all select-none ${
                      riskFilter === key
                        ? 'bg-white text-sky-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Alert Cards Stream */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : alerts.length === 0 ? (
            <Card className="p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900">{t('noAlertsFound') || 'No Alerts Matching Filter'}</h3>
              <p className="text-xs text-slate-500 mt-1">All monitored stations are operating within safe geological tolerances.</p>
              {(filter !== 'all' || riskFilter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setFilter('all'); setRiskFilter('all'); }}
                  className="mt-3 text-xs"
                >
                  Reset Filters
                </Button>
              )}
            </Card>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => {
                const riskKey = (alert.risk_level || 'low').toLowerCase();
                const config = RISK_CONFIG[riskKey] || RISK_CONFIG.low;

                return (
                  <Card
                    key={alert.id}
                    className="p-4 sm:p-5 hover:border-black transition-all flex flex-col justify-between gap-3.5"
                  >
                    {/* Top Alert Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className={`w-3 h-3 rounded-full mt-1 shrink-0 ${config.dot}`} />
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                            {alert.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-medium mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {new Date(alert.created_at).toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <strong className="text-slate-700">{alert.station_id}</strong>
                            </span>
                            {alert.affected_population > 0 && (
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3 text-slate-400" />
                                <strong className="text-slate-700">{alert.affected_population.toLocaleString()}</strong> residents
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status & Severity Badges */}
                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                        <Badge variant={config.badgeVariant} size="sm" className="font-bold uppercase tracking-wider">
                          {alert.risk_level}
                        </Badge>
                        <Badge
                          variant={alert.status === 'active' ? 'destructive' : alert.status === 'acknowledged' ? 'warning' : 'success'}
                          size="sm"
                          className="capitalize"
                        >
                          {alert.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Alert Message Box */}
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50/90 p-3 rounded-xl border border-slate-100 font-medium">
                      {alert.message}
                    </p>

                    {/* Operational Action Workflow Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        {alert.status === 'active' && canAcknowledge && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAcknowledge(alert.id)}
                              className="text-xs font-semibold text-amber-800 border-amber-300 hover:bg-amber-50 h-8"
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                              {t('acknowledge') || 'Acknowledge Alert'}
                            </Button>
                            {canResolve && (
                              <Button
                                size="sm"
                                variant="sky"
                                onClick={() => handleResolve(alert.id)}
                                className="text-xs font-semibold text-emerald-700 bg-emerald-50 border-emerald-300 hover:bg-emerald-100 h-8"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                {t('resolve') || 'Resolve & Clear'}
                              </Button>
                            )}
                          </>
                        )}
                        {alert.status === 'acknowledged' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Acknowledged by Response Unit
                          </span>
                        )}
                        {alert.status === 'resolved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Resolved & Mitigated
                          </span>
                        )}
                      </div>

                      <a
                        href={`#/station/${alert.station_id}`}
                        className="text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1 text-xs hover:underline ml-auto"
                      >
                        <span>View Station Telemetry</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== 2. 72-HOUR TIMELINE VIEW ==================== */}
      {view === 'timeline' && (
        <div className="space-y-4 min-w-0">
          {timelineSummary && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Total Incidents (72h)', value: timelineSummary.total_alerts, color: 'text-slate-900' },
                { label: 'Critical Escalations', value: timelineSummary.critical_count, color: 'text-rose-600' },
                { label: 'High Risk Events', value: timelineSummary.high_count, color: 'text-orange-600' },
                { label: 'Moderate Alerts', value: timelineSummary.moderate_count, color: 'text-amber-600' },
                { label: 'Affected Residents', value: timelineSummary.total_affected_population?.toLocaleString() || 0, color: 'text-sky-700' },
              ].map((item, i) => (
                <Card key={i} className="p-3 text-center">
                  <span className={`text-lg sm:text-xl font-bold ${item.color} block`}>{item.value}</span>
                  <span className="text-[10px] sm:text-xs text-slate-500 font-medium block mt-0.5">{item.label}</span>
                </Card>
              ))}
            </div>
          )}

          {timeline.length === 0 ? (
            <Card className="p-12 text-center">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">{t('noData') || 'No Timeline Incidents in 72h'}</h3>
              <p className="text-xs text-slate-500 mt-1">No recorded telemetry spikes or hazard trigger events.</p>
            </Card>
          ) : (
            <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {timeline.map((entry, idx) => {
                const riskKey = (entry.max_risk || 'low').toLowerCase();
                const config = RISK_CONFIG[riskKey] || RISK_CONFIG.low;

                return (
                  <div key={idx} className="relative">
                    {/* Node Dot */}
                    <div className={`absolute -left-6 sm:-left-8 top-3 w-4 h-4 rounded-full border-2 border-white shadow-xs ${config.dot}`} />

                    <Card className="p-4 hover:border-slate-400 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-slate-900">{entry.timestamp}</span>
                          <span className="text-[11px] text-slate-500 font-medium">• {entry.alerts.length} alerts</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={config.badgeVariant} size="sm" className="font-bold uppercase">
                            {entry.max_risk}
                          </Badge>
                          <span className="text-xs text-slate-500 font-semibold">
                            👥 {entry.total_affected.toLocaleString()} affected
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {entry.alerts.map((alert, ai) => (
                          <div key={ai} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${RISK_CONFIG[alert.risk_level?.toLowerCase()]?.dot || 'bg-slate-400'}`} />
                              <span className="font-semibold text-slate-800 truncate">{alert.title}</span>
                              <span className="text-slate-400 font-mono">({alert.station_id})</span>
                            </div>
                            {alert.status === 'resolved' && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-2" />
                            )}
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

            {/* ==================== 3. 30-DAY TREND ANALYTICS ==================== */}
      {view === 'history' && (
        <div className="space-y-4 sm:space-y-6 min-w-0">
          {/* Historical Summary Metric Pods */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950/85 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-card">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                Aggregated Volume ({historyDays}D)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                  {historyData.reduce((sum, d) => sum + (d.total || 0), 0)}
                </span>
                <span className="text-xs text-sky-600 dark:text-sky-400 font-semibold">Total Alerts</span>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 block mt-1">Continuous time series</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950/85 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-card">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                Critical Escalations
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">
                  {historyData.reduce((sum, d) => sum + (d.critical || 0), 0)}
                </span>
                <span className="text-xs text-rose-500 font-semibold">Events</span>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 block mt-1">High slope failure threshold</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950/85 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-card">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                High Risk Watch Days
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-orange-600 dark:text-orange-400 font-mono">
                  {historyData.reduce((sum, d) => sum + (d.high || 0), 0)}
                </span>
                <span className="text-xs text-orange-500 font-semibold">Incidents</span>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 block mt-1">Precipitation spike correlation</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950/85 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-card">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                Daily Mean Frequency
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                  {historyData.length > 0 ? (historyData.reduce((sum, d) => sum + (d.total || 0), 0) / historyData.length).toFixed(1) : 0}
                </span>
                <span className="text-xs text-slate-500 dark:text-zinc-400 font-semibold">Alerts/Day</span>
              </div>
              <span className="text-[10px] text-emerald-500 dark:text-emerald-400 block mt-1">Monitored baseline</span>
            </div>
          </div>

          {/* Chart 1: Multi-Risk Evolution Stream (Stacked Area Chart) */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-950/85 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200/80 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Multi-Severity Hazard Evolution Wave
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Continuous chronological stacked risk distribution across Critical, High, Moderate, and Low tiers
                  </p>
                </div>
              </div>

              {/* Range Filters (7D, 14D, 30D) */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 self-start sm:self-auto">
                {[
                  { label: '7 Days', val: 7 },
                  { label: '14 Days', val: 14 },
                  { label: '30 Days', val: 30 },
                ].map(({ label, val }) => (
                  <button
                    key={val}
                    onClick={() => {
                      setHistoryDays(val);
                      fetchHistory(val);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      historyDays === val
                        ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full h-[300px] sm:h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="critGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="highGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.55} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="modGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="lowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.25} />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="critical"
                    stackId="1"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fill="url(#critGrad)"
                    name="Critical Risk"
                  />
                  <Area
                    type="monotone"
                    dataKey="high"
                    stackId="1"
                    stroke="#f97316"
                    strokeWidth={2}
                    fill="url(#highGrad)"
                    name="High Risk"
                  />
                  <Area
                    type="monotone"
                    dataKey="moderate"
                    stackId="1"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fill="url(#modGrad)"
                    name="Moderate"
                  />
                  <Area
                    type="monotone"
                    dataKey="low"
                    stackId="1"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#lowGrad)"
                    name="Low Risk"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Legend Badges */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2 border-t border-slate-100 dark:border-white/5 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-rose-500">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
                Critical Threat (≥70)
              </span>
              <span className="flex items-center gap-1.5 text-orange-500">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50" />
                High Watch (50–69)
              </span>
              <span className="flex items-center gap-1.5 text-amber-500">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                Moderate Risk (30–49)
              </span>
              <span className="flex items-center gap-1.5 text-emerald-500">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                Low Baseline (&lt;30)
              </span>
            </div>
          </div>

          {/* Chart 2: Daily Alert Volume & Influx Rate */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-950/85 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-card space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-white/10">
              <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200/80 dark:border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Daily Incident Volume & Surge Profile
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Total multi-station alert generation volume per 24-hour cycle
                </p>
              </div>
            </div>

            <div className="w-full h-[240px] sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historyData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#0284c7" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.25} />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar
                    dataKey="total"
                    fill="url(#barGrad)"
                    radius={[6, 6, 0, 0]}
                    name="Daily Incidents"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
