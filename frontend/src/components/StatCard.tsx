import React from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  colorScheme: "green" | "red" | "amber" | "blue" | "slate";
}

const colorStyles = {
  green: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    border: "border-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
    pill: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  },
  red: {
    bg: "bg-red-500/10 dark:bg-red-500/15",
    border: "border-red-500/30",
    text: "text-red-600 dark:text-red-400",
    pill: "bg-red-500/20 text-red-700 dark:text-red-300",
  },
  amber: {
    bg: "bg-amber-500/10 dark:bg-amber-500/15",
    border: "border-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
    pill: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  },
  blue: {
    bg: "bg-blue-500/10 dark:bg-blue-500/15",
    border: "border-blue-500/30",
    text: "text-blue-600 dark:text-blue-400",
    pill: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  },
  slate: {
    bg: "bg-slate-500/10 dark:bg-slate-500/15",
    border: "border-slate-300 dark:border-slate-800",
    text: "text-slate-700 dark:text-slate-300",
    pill: "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  colorScheme,
}) => {
  const styles = colorStyles[colorScheme];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border ${styles.border} p-5 shadow-sm transition-all hover:shadow-md`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 tracking-wider">
          {title}
        </p>
        <div className={`p-2.5 rounded-xl ${styles.bg} ${styles.text}`}>
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {value}
        </h3>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1 font-medium">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

