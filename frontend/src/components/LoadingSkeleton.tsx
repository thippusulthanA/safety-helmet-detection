import React from "react";

export const CardSkeleton: React.FC = () => (
  <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
      <div className="h-9 w-9 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
    </div>
    <div className="mt-4">
      <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
      <div className="mt-2 h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
    </div>
  </div>
);

export const ChartSkeleton: React.FC = () => (
  <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm animate-pulse">
    <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded mb-4"></div>
    <div className="h-64 w-full bg-slate-100 dark:bg-slate-800/50 rounded-xl"></div>
  </div>
);

export const TableSkeleton: React.FC = () => (
  <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm animate-pulse">
    <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded mb-4"></div>
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-10 w-full bg-slate-100 dark:bg-slate-800/60 rounded-lg"></div>
      ))}
    </div>
  </div>
);

