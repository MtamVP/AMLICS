import React from 'react';
import { Play, Square } from 'lucide-react';
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
  hasSubmissionCsv: boolean;
  onRunAllCells: () => void;
  onStopExecution: () => void;
  onOpenCloudModal: () => void;
  onExportIpynb: () => void;
  onImportIpynbClick: () => void;
  onUploadCsvClick: () => void;
  onDownloadSubmissionCsv: () => void;
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
  hasSubmissionCsv,
  onRunAllCells,
  onStopExecution,
  onOpenCloudModal,
  onExportIpynb,
  onImportIpynbClick,
  onUploadCsvClick,
  onDownloadSubmissionCsv,
}) => {
  return (
    <header className="h-11 px-3 bg-[#202124] border-b border-[#3c4043] flex items-center justify-between gap-3 select-none shrink-0">
      {/* Left: Brand, Notebook Filename & Menu Actions */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-xs px-1.5 py-0.5 rounded bg-[#303134] text-[#e8eaed] border border-[#3c4043] tracking-tight">
            AMLICS
          </span>
          <div className="flex items-center">
            <input
              type="text"
              value={projectName}
              onChange={(e) => onProjectNameChange(e.target.value)}
              className="bg-transparent text-xs font-medium text-[#e8eaed] hover:bg-[#303134] focus:bg-[#303134] px-1.5 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-[#8ab4f8] w-44 truncate"
              title="Rename notebook"
            />
            <span className="text-xs text-[#9aa0a6] font-mono">.ipynb</span>
          </div>
        </div>

        <div className="h-4 w-[1px] bg-[#3c4043]" />

        <div className="flex items-center gap-1">
          {isExecuting ? (
            <button
              type="button"
              onClick={onStopExecution}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-[#3c4043] hover:bg-[#4b4f54] text-[#f28b82] transition-colors"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Interrupt</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onRunAllCells}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124] transition-colors"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Run all</span>
            </button>
          )}

          <button
            type="button"
            onClick={onUploadCsvClick}
            className="px-2 py-1 rounded text-xs text-[#e8eaed] hover:bg-[#303134] transition-colors"
          >
            Upload CSV
          </button>

          <button
            type="button"
            onClick={onImportIpynbClick}
            className="px-2 py-1 rounded text-xs text-[#e8eaed] hover:bg-[#303134] transition-colors"
            title="Import an existing .ipynb file from Kaggle or Colab"
          >
            Import .ipynb
          </button>

          <button
            type="button"
            onClick={onExportIpynb}
            className="px-2 py-1 rounded text-xs text-[#e8eaed] hover:bg-[#303134] transition-colors"
            title="Export notebook with all code, markdown, and plots to .ipynb"
          >
            Export .ipynb
          </button>

          {hasSubmissionCsv && (
            <button
              type="button"
              onClick={onDownloadSubmissionCsv}
              className="px-2 py-1 rounded text-xs font-mono bg-[#292a2d] hover:bg-[#35363a] text-[#81c995] border border-[#3c4043] transition-colors"
              title="Download generated Kaggle submission.csv"
            >
              ↓ submission.csv
            </button>
          )}
        </div>
      </div>

      {/* Right: Runtime Selector & Resource Pill */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-[#18191a] p-0.5 rounded border border-[#3c4043] text-xs">
          <button
            type="button"
            onClick={() => onRuntimeModeChange('pyodide')}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm transition-colors ${
              runtimeMode === 'pyodide'
                ? 'bg-[#303134] text-[#e8eaed] font-medium'
                : 'text-[#9aa0a6] hover:text-[#e8eaed]'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                pyodideStatus === 'idle'
                  ? 'bg-[#81c995]'
                  : pyodideStatus === 'initializing' || pyodideStatus === 'busy'
                  ? 'bg-[#fdd663]'
                  : 'bg-[#f28b82]'
              }`}
            />
            <span>Browser (Pyodide)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onRuntimeModeChange('cloud');
              if (!cloudConnected || cloudWorkerStatus === 'offline') {
                onOpenCloudModal();
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm transition-colors ${
              runtimeMode === 'cloud'
                ? 'bg-[#303134] text-[#e8eaed] font-medium'
                : 'text-[#9aa0a6] hover:text-[#e8eaed]'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                cloudWorkerStatus === 'idle'
                  ? 'bg-[#81c995]'
                  : cloudWorkerStatus === 'busy'
                  ? 'bg-[#fdd663]'
                  : 'bg-[#5f6368]'
              }`}
            />
            <span>Colab / Kaggle</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenCloudModal}
          className="px-2.5 py-1 rounded text-xs font-mono bg-[#292a2d] hover:bg-[#35363a] text-[#e8eaed] border border-[#3c4043] transition-colors"
        >
          {cloudWorkerStatus !== 'offline' && cloudHardware
            ? `${cloudHardware.gpu} • ${cloudHardware.ram_used_gb}/${cloudHardware.ram_total_gb}GB`
            : 'Connect Cloud'}
        </button>
      </div>
    </header>
  );
};
