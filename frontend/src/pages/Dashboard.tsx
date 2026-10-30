import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  Zap,
  Users,
  RefreshCw,
  ArrowRight,
  Eye,
  Camera,
  Image as ImageIcon,
  Video as VideoIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { StatCard } from "../components/StatCard";
import { CardSkeleton, ChartSkeleton, TableSkeleton } from "../components/LoadingSkeleton";
import { SnapshotModal } from "../components/SnapshotModal";
import { getStats, getLogs } from "../services/api";
import { StatsResponse, ViolationLogItem, PageId } from "../services/types";

interface DashboardProps {
  onNavigate: (page: PageId) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [recentLogs, setRecentLogs] = useState<ViolationLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<ViolationLogItem | null>(null);

  const fetchData = async (isManual: boolean = false) => {
    try {
      if (isManual) setRefreshing(true);
      const [statsData, logsData] = await Promise.all([
        getStats(),
        getLogs(1, 5), // top 5 recent violations
      ]);
      setStats(statsData);
      setRecentLogs(logsData.items);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll stats every 10 seconds
    const interval = setInterval(() => {
      fetchData(false);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-8 text-white shadow-xl shadow-amber-500/10">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md mb-3">
            Real-Time Vision AI
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Safety Helmet Compliance Hub
          </h1>
          <p className="mt-2 text-white/90 text-sm sm:text-base leading-relaxed">
            Automated computer vision surveillance powered by fine-tuned YOLOv8. Detects workers, identifies hard hat compliance, and prevents job-site head injury hazards in real time.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate("image")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 font-semibold text-sm shadow-md hover:bg-slate-100 transition-all active:scale-95"
            >
              <ImageIcon className="w-4 h-4 text-amber-600" />
              <span>Analyze Image</span>
            </button>
            <button
              onClick={() => onNavigate("video")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/40 border border-white/30 text-white font-semibold text-sm backdrop-blur-md hover:bg-slate-900/60 transition-all active:scale-95"
            >
              <VideoIcon className="w-4 h-4" />
              <span>Process Video</span>
            </button>
            <button
              onClick={() => onNavigate("stream")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/40 border border-white/30 text-white font-semibold text-sm backdrop-blur-md hover:bg-slate-900/60 transition-all active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>Live Camera</span>
            </button>
          </div>
        </div>

        {/* Decorative background shapes */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
      </div>

      {/* KPI Stats Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Operational Safety KPIs</span>
          </h2>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="TOTAL DETECTIONS"
              value={stats.total_scans.toLocaleString()}
              subtitle="Scanned workers & events"
              icon={<Users className="w-5 h-5" />}
              colorScheme="blue"
            />
            <StatCard
              title="SAFETY VIOLATIONS"
              value={stats.total_violations.toLocaleString()}
              subtitle={`${stats.violation_rate}% violation rate`}
              icon={<AlertTriangle className="w-5 h-5" />}
              colorScheme="red"
            />
            <StatCard
              title="HELMET COMPLIANCE"
              value={`${stats.compliance_rate}%`}
              subtitle={stats.compliance_rate >= 80 ? "Healthy compliance standard" : "Requires safety briefing"}
              icon={<ShieldCheck className="w-5 h-5" />}
              colorScheme={stats.compliance_rate >= 85 ? "green" : stats.compliance_rate >= 70 ? "amber" : "red"}
            />
            <StatCard
              title="INFERENCE LATENCY"
              value={`${stats.avg_inference_time_ms} ms`}
              subtitle="Real-time model speed"
              icon={<Zap className="w-5 h-5" />}
              colorScheme="slate"
            />
          </div>
        ) : null}
      </div>

      {/* Analytics Charts & Recent Table Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 7-Day Trend Chart */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Violations Trend (Last 7 Days)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Daily unhelmeted head occurrences logged on site
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
              Violations / Day
            </span>
          </div>

          {loading ? (
            <ChartSkeleton />
          ) : stats ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.violations_per_day} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return d.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
                    }}
                    stroke="#94a3b8"
                    fontSize={11}
                  />
                  <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#1e293b",
                      borderRadius: "0.75rem",
                      color: "#f8fafc",
                      fontSize: "12px",
                    }}
                    labelFormatter={(val) => `Date: ${val}`}
                    formatter={(val) => [`${val} violations`, "Count"]}
                  />
                  <Bar
                    dataKey="count"
                    fill="#ef4444"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </div>

        {/* Recent Violations Panel */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Recent Violations
              </h3>
              <button
                onClick={() => onNavigate("logs")}
                className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {loading ? (
              <TableSkeleton />
            ) : recentLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                <ShieldCheck className="w-10 h-10 mx-auto text-emerald-500 mb-2 opacity-80" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">Zero Violations Recorded</p>
                <p className="text-xs mt-1">Site is currently fully compliant!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center font-bold">
                        {log.count}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100 capitalize">
                          {log.source_type}: {log.source_name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>

                    {log.snapshot_path ? (
                      <button
                        onClick={() => setSelectedSnapshot(log)}
                        className="p-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-colors"
                        title="View Snapshot"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">No image</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <button
              onClick={() => onNavigate("logs")}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Export CSV & Full Logs History
            </button>
          </div>
        </div>
      </div>

      {/* Snapshot Preview Modal */}
      <SnapshotModal
        log={selectedSnapshot}
        onClose={() => setSelectedSnapshot(null)}
      />
    </div>
  );
};

