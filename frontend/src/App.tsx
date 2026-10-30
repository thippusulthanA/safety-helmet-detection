import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { HealthBanner } from "./components/HealthBanner";
import { Dashboard } from "./pages/Dashboard";
import { ImageDetection } from "./pages/ImageDetection";
import { VideoDetection } from "./pages/VideoDetection";
import { LiveCamera } from "./pages/LiveCamera";
import { ViolationLogs } from "./pages/ViolationLogs";
import { About } from "./pages/About";
import { getHealth } from "./services/api";
import { PageId, HealthResponse } from "./services/types";
import { HardHat } from "lucide-react";

export const App: React.FC = () => {
  const getInitialPage = (): PageId => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("page") as PageId;
    if (["dashboard", "image", "video", "stream", "logs", "about"].includes(p)) {
      return p;
    }
    const hash = window.location.hash.replace("#", "") as PageId;
    if (["dashboard", "image", "video", "stream", "logs", "about"].includes(hash)) {
      return hash;
    }
    return "dashboard";
  };

  const [currentPage, setCurrentPage] = useState<PageId>(getInitialPage);
  const [isDark, setIsDark] = useState<boolean>(() => {
    return (
      localStorage.getItem("theme") === "dark" ||
      (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  });

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(true);
  const [backendError, setBackendError] = useState<boolean>(false);

  // Sync theme
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  // Poll backend health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const data = await getHealth();
        setHealth(data);
        setBackendError(false);
      } catch (err) {
        console.warn("Backend health check failed:", err);
        setBackendError(true);
      } finally {
        setLoadingHealth(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => setIsDark((prev) => !prev);

  const handleNavigate = (page: PageId) => {
    setCurrentPage(page);
    window.history.pushState(null, "", `?page=${page}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        health={health}
        backendError={backendError}
      />

      {/* Demo Mode / Custom Weights Notice Banner */}
      <HealthBanner health={health} loading={loadingHealth} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {currentPage === "dashboard" && <Dashboard onNavigate={handleNavigate} />}
        {currentPage === "image" && <ImageDetection />}
        {currentPage === "video" && <VideoDetection />}
        {currentPage === "stream" && <LiveCamera />}
        {currentPage === "logs" && <ViolationLogs />}
        {currentPage === "about" && <About />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <HardHat className="w-4 h-4 text-amber-500" />
            <span className="font-bold text-slate-700 dark:text-slate-300">
              SiteGuard AI
            </span>
            <span>&bull; Safety Helmet Detection at Construction Sites using YOLOv8</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>FastAPI &bull; React &bull; PyTorch &bull; SQLite</span>
            <span>Ultralytics AGPL-3.0 License</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
