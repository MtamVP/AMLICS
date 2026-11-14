import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  PanelLeft,
  PanelRight,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Square,
  Trash2,
} from 'lucide-react';
import {
  HardwareInfo,
  NotebookWorkspaceMeta,
  RuntimeMode,
  WorkerStatus,
} from '../types/studio';

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
  hasActiveCell: boolean;
  showLeftPanel: boolean;
  showRightPanel: boolean;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
  onRunAllCells: () => void;
  onRunActiveCell: () => void;
  onRunBeforeActiveCell: () => void;
  onRunFromActiveCell: () => void;
  onRunPendingOrErrorCells: () => void;
  onRestartAndRunAll: () => void;
  onRestartKernel: () => void;
  onClearAllOutputs: () => void;
  onStopExecution: () => void;
  onOpenCloudModal: () => void;
  onExportIpynb: () => void;
  onImportIpynbClick: () => void;
  onUploadCsvClick: () => void;
  onDownloadSubmissionCsv: () => void;
  workspaces: NotebookWorkspaceMeta[];
  activeWorkspaceId: string;
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspace: () => void;
  onDeleteWorkspace: (id: string) => void;
  onOpenAiModal: () => void;
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
  hasActiveCell,
  showLeftPanel,
  showRightPanel,
  onToggleLeftPanel,
  onToggleRightPanel,
  onRunAllCells,
  onRunActiveCell,
  onRunBeforeActiveCell,
  onRunFromActiveCell,
  onRunPendingOrErrorCells,
  onRestartAndRunAll,
  onRestartKernel,
  onClearAllOutputs,
  onStopExecution,
  onOpenCloudModal,
  onExportIpynb,
  onImportIpynbClick,
  onUploadCsvClick,
  onDownloadSubmissionCsv,
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  onDeleteWorkspace,
  onOpenAiModal,
}) => {
  const [runMenuOpen, setRunMenuOpen] = useState(false);
  const [wsMenuOpen, setWsMenuOpen] = useState(false);
  const runMenuRef = useRef<HTMLDivElement | null>(null);
  const wsMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (runMenuRef.current && !runMenuRef.current.contains(e.target as Node)) {
        setRunMenuOpen(false);
      }
      if (wsMenuRef.current && !wsMenuRef.current.contains(e.target as Node)) {
        setWsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const triggerMenuAction = (fn: () => void) => {
    setRunMenuOpen(false);
    fn();
  };

  return (
    <header className="h-11 px-3 bg-[#202124] border-b border-[#3c4043] flex items-center justify-between gap-3 select-none shrink-0 relative z-30">
      {/* Left: Brand, Notebook Filename & Menu Actions */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-xs px-1.5 py-0.5 rounded bg-[#303134] text-[#e8eaed] border border-[#3c4043] tracking-tight">
            AMLICS
          </span>
          <div ref={wsMenuRef} className="relative flex items-center">
            <input
              type="text"
              value={projectName}
              onChange={(e) => onProjectNameChange(e.target.value)}
              className="bg-transparent text-xs font-medium text-[#e8eaed] hover:bg-[#303134] focus:bg-[#303134] px-1.5 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-[#8ab4f8] w-40 truncate"
              title="Rename notebook"
            />
            <span className="text-xs text-[#9aa0a6] font-mono">.ipynb</span>
            <button
              type="button"
              onClick={() => setWsMenuOpen((o) => !o)}
              title="Chuyển đổi / Tạo Notebook mới"
              className="ml-1 p-1 rounded hover:bg-[#303134] text-[#9aa0a6] hover:text-[#e8eaed] transition-colors flex items-center gap-0.5 text-[10px] font-mono"
            >
              <span>({workspaces.length})</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {wsMenuOpen && (
              <div className="absolute left-0 top-full mt-1 w-64 bg-[#292a2d] border border-[#3c4043] rounded shadow-xl py-1 z-50 text-xs">
                <div className="px-3 py-1 text-[10px] font-mono text-[#9aa0a6] uppercase tracking-wider flex items-center justify-between">
                  <span>Notebooks ({workspaces.length})</span>
                  <button
                    type="button"
                    onClick={() => {
                      setWsMenuOpen(false);
                      onCreateWorkspace();
                    }}
                    className="inline-flex items-center gap-1 text-[#8ab4f8] hover:underline font-sans normal-case"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Notebook</span>
                  </button>
                </div>
                <div className="my-1 border-t border-[#3c4043]" />
                <div className="max-h-56 overflow-y-auto">
                  {workspaces.map((ws) => {
                    const active = ws.id === activeWorkspaceId;
                    return (
                      <div
                        key={ws.id}
                        className={`px-3 py-1.5 flex items-center justify-between gap-2 hover:bg-[#35363a] ${
                          active ? 'bg-[#303134] text-[#8ab4f8]' : 'text-[#e8eaed]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setWsMenuOpen(false);
                            onSelectWorkspace(ws.id);
                          }}
                          className="flex-1 text-left truncate font-mono text-[11px]"
                        >
                          {ws.name}.ipynb
                        </button>
                        {workspaces.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteWorkspace(ws.id);
                            }}
                            title="Xóa notebook này"
                            className="p-0.5 text-[#9aa0a6] hover:text-[#f28b82]"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
            <div ref={runMenuRef} className="relative flex items-center">
              <button
                type="button"
                onClick={onRunAllCells}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-l text-xs font-medium bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124] transition-colors"
                title="Run all cells in notebook"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Run all</span>
              </button>
              <button
                type="button"
                onClick={() => setRunMenuOpen((o) => !o)}
                className="px-1.5 py-1 rounded-r bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124] border-l border-[#202124]/25 transition-colors"
                title="More Run & Runtime options"
                aria-label="Run options"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {runMenuOpen && (
                <div className="absolute left-0 top-full mt-1 w-64 rounded border border-[#3c4043] bg-[#292a2d] shadow-xl py-1 text-xs text-[#e8eaed] z-50">
                  <button
                    type="button"
                    onClick={() => triggerMenuAction(onRunAllCells)}
                    className="w-full px-3 py-1.5 text-left hover:bg-[#3c4043] flex items-center justify-between"
                  >
                    <span>Run all cells</span>
                    <span className="text-[10px] font-mono text-[#9aa0a6]">All</span>
                  </button>
                  <button
                    type="button"
                    disabled={!hasActiveCell}
                    onClick={() => triggerMenuAction(onRunActiveCell)}
                    className="w-full px-3 py-1.5 text-left hover:bg-[#3c4043] disabled:opacity-40 flex items-center justify-between"
                  >
                    <span>Run selected cell</span>
                    <span className="text-[10px] font-mono text-[#9aa0a6]">Ctrl+Enter</span>
                  </button>
                  <button
                    type="button"
                    disabled={!hasActiveCell}
                    onClick={() => triggerMenuAction(onRunBeforeActiveCell)}
                    className="w-full px-3 py-1.5 text-left hover:bg-[#3c4043] disabled:opacity-40 flex items-center justify-between"
                  >
                    <span>Run before selected cell</span>
                    <span className="text-[10px] font-mono text-[#9aa0a6]">↑</span>
                  </button>
                  <button
                    type="button"
                    disabled={!hasActiveCell}
                    onClick={() => triggerMenuAction(onRunFromActiveCell)}
                    className="w-full px-3 py-1.5 text-left hover:bg-[#3c4043] disabled:opacity-40 flex items-center justify-between"
                  >
                    <span>Run selected &amp; cells below</span>
                    <span className="text-[10px] font-mono text-[#9aa0a6]">▶↓</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerMenuAction(onRunPendingOrErrorCells)}
                    className="w-full px-3 py-1.5 text-left hover:bg-[#3c4043] flex items-center justify-between"
                  >
                    <span>Run unrun / failed cells</span>
                    <span className="text-[10px] font-mono text-[#fdd663]">Retry</span>
                  </button>

                  <div className="my-1 border-t border-[#3c4043]" />

                  <button
                    type="button"
                    onClick={() => triggerMenuAction(onRestartAndRunAll)}
                    className="w-full px-3 py-1.5 text-left hover:bg-[#3c4043] flex items-center gap-2 text-[#8ab4f8]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restart kernel &amp; Run all</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerMenuAction(onRestartKernel)}
                    className="w-full px-3 py-1.5 text-left hover:bg-[#3c4043] flex items-center gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#9aa0a6]" />
                    <span>Restart kernel (clear memory)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerMenuAction(onClearAllOutputs)}
                    className="w-full px-3 py-1.5 text-left hover:bg-[#3c4043] flex items-center gap-2 text-[#9aa0a6] hover:text-[#e8eaed]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear all cell outputs</span>
                  </button>
                </div>
              )}
            </div>
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

      {/* Right: AI BYOK, Panel Toggles, Runtime Selector & Resource Pill */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenAiModal}
          title="AI Copilot (BYOK - dùng Gemini hoặc OpenAI Key của bạn để Auto-Optimize & sinh code)"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-[#303134] hover:bg-[#3c4043] text-[#8ab4f8] border border-[#8ab4f8]/40 transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Copilot (BYOK)</span>
        </button>

        <div className="flex items-center bg-[#18191a] p-0.5 rounded border border-[#3c4043]">
          <button
            type="button"
            onClick={onToggleLeftPanel}
            title={showLeftPanel ? 'Ẩn cột Pipeline Configuration' : 'Mở cột Pipeline Configuration'}
            className={`p-1 rounded-sm transition-colors ${
              showLeftPanel
                ? 'bg-[#303134] text-[#8ab4f8]'
                : 'text-[#9aa0a6] hover:text-[#e8eaed]'
            }`}
          >
            <PanelLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onToggleRightPanel}
            title={showRightPanel ? 'Ẩn cột Leaderboard & Console' : 'Mở cột Leaderboard & Console'}
            className={`p-1 rounded-sm transition-colors ${
              showRightPanel
                ? 'bg-[#303134] text-[#8ab4f8]'
                : 'text-[#9aa0a6] hover:text-[#e8eaed]'
            }`}
          >
            <PanelRight className="w-3.5 h-3.5" />
          </button>
        </div>

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
