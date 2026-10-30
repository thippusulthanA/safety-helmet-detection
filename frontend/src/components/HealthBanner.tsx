import React from "react";
import { AlertTriangle, Cpu, HardHat, Info } from "lucide-react";
import { HealthResponse } from "../services/types";

interface HealthBannerProps {
  health: HealthResponse | null;
  loading: boolean;
}

export const HealthBanner: React.FC<HealthBannerProps> = ({ health, loading }) => {
  if (loading || !health) return null;

  if (health.demo_mode) {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
          <div className="flex items-center gap-2 font-medium">
            <span className="p-1 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <span>
              <strong>Demo mode: custom helmet weights not found.</strong> Using baseline{" "}
              <code className="px-1.5 py-0.5 rounded bg-amber-500/20 font-mono text-xs">{health.model_name}</code> on{" "}
              <code className="px-1.5 py-0.5 rounded bg-amber-500/20 font-mono text-xs">{health.device.toUpperCase()}</code>.
            </span>
          </div>
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-xs">
            <Info className="w-3.5 h-3.5" />
            <span>Train custom weights via <code className="font-mono">backend/ml/train.py</code> and save to <code className="font-mono">backend/models/best.pt</code></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-900 dark:text-emerald-200 px-4 py-1.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-medium">
          <HardHat className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Active Helmet Model: <strong className="font-mono">{health.model_name}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <Cpu className="w-3 h-3" />
          <span>Device: <strong className="uppercase">{health.device}</strong></span>
        </div>
      </div>
    </div>
  );
};

