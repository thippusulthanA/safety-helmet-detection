import React from "react";
import {
  HardHat,
  LayoutDashboard,
  Image,
  Video,
  Camera,
  FileSpreadsheet,
  Info,
  Sun,
  Moon,
  Activity,
  AlertCircle,
} from "lucide-react";
import { PageId, HealthResponse } from "../services/types";

interface NavbarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  health: HealthResponse | null;
  backendError: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  isDark,
  onToggleTheme,
  health,
  backendError,
}) => {
  const navItems: { id: PageId; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "image", label: "Image Detect", icon: <Image className="w-4 h-4" /> },
    { id: "video", label: "Video Detect", icon: <Video className="w-4 h-4" /> },
    { id: "stream", label: "Live Camera", icon: <Camera className="w-4 h-4" /> },
    { id: "logs", label: "Violations", icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: "about", label: "About", icon: <Info className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div
            onClick={() => onNavigate("dashboard")}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-400/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
              <HardHat className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                  SiteGuard<span className="text-amber-500">AI</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                  YOLOv8
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-none">
                Safety Helmet Compliance
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const active = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Health Pill & Theme Toggle */}
          <div className="flex items-center gap-3">
            {/* Backend Health Status Pill */}
            {backendError ? (
              <div
                title="Backend server unreachable at localhost:8000"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-medium"
              >
                <AlertCircle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                <span className="hidden sm:inline">Offline</span>
              </div>
            ) : health ? (
              <div
                title={`Connected to ${health.model_name} (${health.device})`}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <Activity className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-mono">
                  {health.demo_mode ? "Demo Mode" : "Online"}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs">
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-ping"></span>
                <span className="hidden sm:inline">Connecting...</span>
              </div>
            )}

            {/* Dark/Light Mode Button */}
            <button
              onClick={onToggleTheme}
              aria-label="Toggle Theme"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
          {navItems.map((item) => {
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center gap-1 px-2 py-1 text-xs font-medium rounded ${
                  active
                    ? "text-amber-600 dark:text-amber-400 font-semibold"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

