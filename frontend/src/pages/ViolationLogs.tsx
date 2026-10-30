import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Download,
  Trash2,
  Filter,
  Eye,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { getLogs, clearLogs, getExportCsvUrl } from "../services/api";
import { ViolationLogItem, PaginatedLogsResponse } from "../services/types";
import { SnapshotModal } from "../components/SnapshotModal";

export const ViolationLogs: React.FC = () => {
  const [logs, setLogs] = useState<ViolationLogItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [sourceType, setSourceType] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Modals & Confirmation
  const [selectedSnapshot, setSelectedSnapshot] = useState<ViolationLogItem | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState<boolean>(false);
  const [clearing, setClearing] = useState<boolean>(false);

  const fetchLogs = async (targetPage: number = 1) => {
    setLoading(true);
    try {
      const res: PaginatedLogsResponse = await getLogs(
        targetPage,
        10,
        sourceType || undefined,
        startDate || undefined,
        endDate || undefined
      );
      setLogs(res.items);
      setPage(res.page);
      setTotalPages(res.total_pages);
      setTotalCount(res.total);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [sourceType, startDate, endDate]);

  const handleClearLogs = async () => {
    setClearing(true);
    try {
      await clearLogs();
      setConfirmClearOpen(false);
      fetchLogs(1);
    } catch (err) {
      console.error("Failed to clear logs:", err);
    } finally {
      setClearing(false);
    }
  };

  const exportUrl = getExportCsvUrl(
    sourceType || undefined,
    startDate || undefined,
    endDate || undefined
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-7 h-7 text-amber-500" />
            <span>Safety Violation Audit Logs</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Immutable safety incident logs persisted in SQLite with debounced snapshot references for compliance auditing.
          </p>
        </div>

        {/* Action Buttons: Export CSV & Clear */}
        <div className="flex items-center gap-3">
          <a
            href={exportUrl}
            download
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span>Export CSV</span>
          </a>

          <button
            onClick={() => setConfirmClearOpen(true)}
            disabled={totalCount === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear Logs</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Source Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">All Sources</option>
              <option value="image">Image Upload</option>
              <option value="video">Video Upload</option>
              <option value="stream">Live Stream</option>
            </select>
          </div>

          {/* Date Range Filters */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
              <span className="text-[11px] text-slate-400">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-slate-700 dark:text-slate-300 font-mono text-xs focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
              <span className="text-[11px] text-slate-400">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-slate-700 dark:text-slate-300 font-mono text-xs focus:outline-none"
              />
            </div>

            {(sourceType || startDate || endDate) && (
              <button
                onClick={() => {
                  setSourceType("");
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline px-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <strong>{logs.length}</strong> of <strong>{totalCount}</strong> recorded events
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Log ID</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4">File / Device</th>
                <th className="py-3.5 px-4 text-center">Unhelmeted Heads</th>
                <th className="py-3.5 px-4">Inference Latency</th>
                <th className="py-3.5 px-4 text-right">Snapshot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    <span>Loading violation records...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30 text-amber-500" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">No violations match criteria</p>
                    <p className="text-xs mt-1">Try expanding the date range or selecting another source.</p>
                  </td>
                </tr>
              ) : (
                logs.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono text-slate-400">#{item.id}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="capitalize px-2 py-0.5 rounded-md font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {item.source_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono max-w-[180px] truncate" title={item.source_name}>
                      {item.source_name}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-full font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                        {item.count}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {item.inference_ms} ms
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {item.snapshot_path ? (
                        <button
                          onClick={() => setSelectedSnapshot(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 hover:bg-amber-500/20 transition-colors font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">None</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchLogs(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchLogs(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Snapshot Preview Modal */}
      <SnapshotModal
        log={selectedSnapshot}
        onClose={() => setSelectedSnapshot(null)}
      />

      {/* Clear Logs Confirmation Modal */}
      {confirmClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 rounded-xl bg-red-500/10">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Clear All Violation Logs?
              </h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              This action will permanently delete all {totalCount} safety violation records from the SQLite database. Incident snapshots will also be unlinked.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmClearOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearLogs}
                disabled={clearing}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20 transition-all flex items-center gap-1.5"
              >
                {clearing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Yes, Delete Everything</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
