import React from "react";
import { X, ExternalLink, Calendar, MapPin, AlertTriangle } from "lucide-react";
import { ViolationLogItem } from "../services/types";

interface SnapshotModalProps {
  log: ViolationLogItem | null;
  onClose: () => void;
}

export const SnapshotModal: React.FC<SnapshotModalProps> = ({ log, onClose }) => {
  if (!log) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold">
            <AlertTriangle className="w-5 h-5" />
            <span>Violation Snapshot #{log.id}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Preview */}
        <div className="bg-slate-950 flex items-center justify-center p-4 min-h-[300px] max-h-[500px] overflow-hidden">
          {log.snapshot_path ? (
            <img
              src={log.snapshot_path}
              alt={`Violation Snapshot #${log.id}`}
              className="max-h-[460px] w-auto object-contain rounded-lg shadow-md"
            />
          ) : (
            <div className="text-slate-400 text-sm">No snapshot image available</div>
          )}
        </div>

        {/* Metadata Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>{new Date(log.timestamp).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span className="capitalize">{log.source_type} ({log.source_name})</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full font-semibold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20">
              {log.count} Violation{log.count > 1 ? "s" : ""}
            </span>
            {log.snapshot_path && (
              <a
                href={log.snapshot_path}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-3 py-1 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 font-medium transition-colors"
              >
                <span>Full Image</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

