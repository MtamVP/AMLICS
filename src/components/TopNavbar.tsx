import React from 'react';
import {
  Cpu,
  Cloud,
  Play,
  Square,
  Download,
  Upload,
  Sparkles,
  Wifi,
  WifiOff,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { HardwareInfo, RuntimeMode, WorkerStatus } from '../types/studio';

interface TopNavbarProps {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  runtimeMode: RuntimeMode;
  onRuntimeModeChange: (mode: RuntimeMode) => void;
  pyodideStatus: WorkerStatus;
  pyodideStatusText: string;
  cloudConnected: boolean;
  cloudWorkerStatus: WorkerStatus;
  cloudHardware: HardwareInfo | null;
  isExecuting: boolean;
  onRunAllCells: () => void;
  onStopExecution: () => void;
  onOpenCloudModal: () => void;
  onExportIpynb: () => void;
  onUploadCsvClick: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  projectName,
  onProjectNameChange,
  runtimeMode,
  onRuntimeModeChange,
  pyodideStatus,
  cloudConnected,
  cloudWorkerStatus,
  cloudHardware,
  isExecuting,
  onRunAllCells,
  onStopExecution,
  onOpenCloudModal,
  onExportIpynb,
  onUploadCsvClick,
}) => {
  return (
    <header className="h-13 px-3 py-2 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-3 select-none shrink-0 z-20">
      {/* Left: Brand & Project Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm tracking-wider bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent whitespace-nowrap">
              AMLICS
            </span>
            <span className="hidden lg:inline text-xs font-medium text-slate-400 whitespace-nowrap">
              AutoML & Code Studio
            </span>
            <span className="hidden xl:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3" /> Anti-Leakage
            </span>
          </div>
          <input
            type="text"
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            className="bg-transparent text-xs text-slate-400 hover:text-slate-200 focus:text-white focus:outline-none border-b border-transparent focus:border-indigo-500 truncate w-44 sm:w-56"
            title="Click để đổi tên Project"
          />
        </div>
      </div>

      {/* Center: Dual-Runtime Engine Switcher */}
      <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
        <button
          type="button"
          onClick={() => onRuntimeModeChange('pyodide')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            runtimeMode === 'pyodide'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
          title="Chạy trực tiếp bằng Python WebAssembly trong trình duyệt (0 giây cài đặt, 0đ Server)"
        >
          {pyodideStatus === 'initializing' || (runtimeMode === 'pyodide' && pyodideStatus === 'busy') ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
          ) : (
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span>Tier 1: Browser Wasm</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              pyodideStatus === 'idle'
                ? 'bg-emerald-400'
                : pyodideStatus === 'initializing' || pyodideStatus === 'busy'
                ? 'bg-amber-400 animate-pulse'
                : 'bg-rose-400'
            }`}
          />
        </button>

        <button
          type="button"
          onClick={() => {
            onRuntimeModeChange('cloud');
            if (!cloudConnected || cloudWorkerStatus === 'offline') {
              onOpenCloudModal();
            }
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            runtimeMode === 'cloud'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
          title="Chạy trên Google Colab (12.7GB RAM) hoặc Kaggle (30GB RAM + GPU) qua Supabase Realtime"
        >
          <Cloud className="w-3.5 h-3.5 text-sky-400" />
          <span>Tier 2: Colab / Kaggle GPU</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              cloudWorkerStatus === 'idle'
                ? 'bg-emerald-400'
                : cloudWorkerStatus === 'busy'
                ? 'bg-amber-400 animate-ping'
                : 'bg-slate-500'
            }`}
          />
        </button>

        <button
          type="button"
          onClick={onOpenCloudModal}
          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/70 transition-colors"
          title="Cấu hình kết nối Supabase & lấy lệnh 1-Click cho Colab/Kaggle"
        >
          {cloudWorkerStatus !== 'offline' ? (
            <>
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span className="hidden md:inline text-emerald-300">
                {cloudHardware?.platform || 'Cloud Online'}
              </span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-slate-400" />
              <span className="hidden md:inline">Connect Cloud</span>
            </>
          )}
        </button>
      </div>

      {/* Right: Actions (Upload CSV, Export .ipynb, Run All / Stop) */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onUploadCsvClick}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          title="Tải file dữ liệu CSV từ máy tính của bạn"
        >
          <Upload className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Upload CSV</span>
        </button>

        <button
          type="button"
          onClick={onExportIpynb}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          title="Xuất toàn bộ các Cell & biểu đồ ra file chuẩn Jupyter Notebook (.ipynb)"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Export .ipynb</span>
        </button>

        {isExecuting ? (
          <button
            type="button"
            onClick={onStopExecution}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/25 transition-all"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Stop Run</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onRunAllCells}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white shadow-md shadow-indigo-600/25 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run Full Pipeline</span>
          </button>
        )}
      </div>
    </header>
  );
};
