import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  Play,
  Square,
  Lock,
  Unlock,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Code2,
  ChevronDown,
  ChevronUp,
  Terminal,
} from 'lucide-react';
import { NotebookCell } from '../types/studio';

interface CenterNotebookPaneProps {
  cells: NotebookCell[];
  runningCellId: string | null;
  onRunCell: (cellId: string) => void;
  onStopCell: () => void;
  onEditCellCode: (cellId: string, newCode: string) => void;
  onToggleLockCell: (cellId: string) => void;
  onResetCellToTemplate: (cellId: string) => void;
  onAddCustomCell: () => void;
  onDeleteCustomCell: (cellId: string) => void;
}

export const CenterNotebookPane: React.FC<CenterNotebookPaneProps> = ({
  cells,
  runningCellId,
  onRunCell,
  onStopCell,
  onEditCellCode,
  onToggleLockCell,
  onResetCellToTemplate,
  onAddCustomCell,
  onDeleteCustomCell,
}) => {
  const [collapsedCells, setCollapsedCells] = useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string) => {
    setCollapsedCells((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <main className="w-full h-full bg-slate-950 flex flex-col overflow-hidden">
      {/* Pane Top Bar */}
      <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between select-none shrink-0">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Interactive Notebook Cells (Hybrid UI-to-Code)
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            <Unlock className="w-3 h-3" /> UI Synced:{' '}
            {cells.filter((c) => !c.isLocked).length}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <Lock className="w-3 h-3" /> Custom Locked:{' '}
            {cells.filter((c) => c.isLocked).length}
          </span>
        </div>
      </div>

      {/* Scrollable Cells Container */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 custom-scrollbar">
        {cells.map((cell, index) => {
          const isRunning = runningCellId === cell.id || cell.status === 'running';
          const isCollapsed = Boolean(collapsedCells[cell.id]);
          const lineCount = cell.currentCode.split('\n').length;
          const editorHeight = Math.min(Math.max(lineCount * 19 + 24, 150), 360);

          return (
            <div
              key={cell.id}
              className={`rounded-xl border transition-all overflow-hidden shadow-lg ${
                isRunning
                  ? 'border-indigo-500/80 bg-slate-900/95 shadow-indigo-500/10'
                  : cell.isLocked
                  ? 'border-amber-500/40 bg-slate-900/80'
                  : 'border-slate-800 bg-slate-900/75 hover:border-slate-700'
              }`}
            >
              {/* Cell Header */}
              <div className="px-3.5 py-2 bg-slate-900 border-b border-slate-800/90 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => toggleCollapse(cell.id)}
                    className="text-slate-400 hover:text-white p-0.5 rounded"
                    title={isCollapsed ? 'Mở rộng Cell' : 'Thu gọn Cell'}
                  >
                    {isCollapsed ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                  </button>

                  <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                    In [{index + 1}]
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-slate-100 truncate">
                        {cell.title}
                      </h3>
                      {/* Hybrid Lock Status Pill */}
                      {cell.isLocked ? (
                        <button
                          type="button"
                          onClick={() => onToggleLockCell(cell.id)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors shrink-0"
                          title="Cell đã được sửa tay nên đang khóa bảo vệ. Click để mở khóa."
                        >
                          <Lock className="w-2.5 h-2.5" />
                          <span>Custom Locked</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onToggleLockCell(cell.id)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors shrink-0"
                          title="Đang tự động đồng bộ từ cấu hình UI. Nếu bạn gõ sửa code, Cell sẽ tự chuyển sang Custom Locked."
                        >
                          <Unlock className="w-2.5 h-2.5" />
                          <span>UI Synced</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      {cell.subtitle}
                    </p>
                  </div>
                </div>

                {/* Cell Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {cell.durationMs !== undefined && cell.durationMs > 0 && (
                    <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">
                      {(cell.durationMs / 1000).toFixed(2)}s
                    </span>
                  )}

                  {cell.status === 'success' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  {cell.status === 'error' && (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  )}

                  {cell.isLocked && cell.stepType !== 'custom' && (
                    <button
                      type="button"
                      onClick={() => onResetCellToTemplate(cell.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 transition-colors"
                      title="Khôi phục lại code chuẩn sinh tự động từ UI và mở khóa đồng bộ"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span className="hidden sm:inline">Reset to UI</span>
                    </button>
                  )}

                  {cell.stepType === 'custom' && (
                    <button
                      type="button"
                      onClick={() => onDeleteCustomCell(cell.id)}
                      className="p-1 rounded bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700"
                      title="Xóa Custom Cell này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {isRunning ? (
                    <button
                      type="button"
                      onClick={onStopCell}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      <span>Stop</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onRunCell(cell.id)}
                      disabled={runningCellId !== null}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Run Cell</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Monaco Code Editor */}
              {!isCollapsed && (
                <div className="relative bg-[#1e1e1e]">
                  <Editor
                    height={`${editorHeight}px`}
                    defaultLanguage="python"
                    theme="vs-dark"
                    value={cell.currentCode}
                    onChange={(val) => {
                      if (typeof val === 'string' && val !== cell.currentCode) {
                        onEditCellCode(cell.id, val);
                      }
                    }}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 12.5,
                      fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                      automaticLayout: true,
                      padding: { top: 10, bottom: 10 },
                      renderLineHighlight: 'all',
                      tabSize: 4,
                    }}
                  />
                </div>
              )}

              {/* Cell Execution Output & Figures */}
              {(cell.outputText || (cell.figures && cell.figures.length > 0) || isRunning) && (
                <div className="border-t border-slate-800 bg-slate-950/95 p-3 space-y-2.5">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Terminal className="w-3 h-3 text-indigo-400" />
                      Cell Output
                    </span>
                    {isRunning && (
                      <span className="flex items-center gap-1 text-amber-300">
                        <Loader2 className="w-3 h-3 animate-spin" /> Executing...
                      </span>
                    )}
                  </div>

                  {cell.outputText && (
                    <pre
                      className={`text-xs font-mono whitespace-pre-wrap break-words max-h-56 overflow-y-auto p-2.5 rounded-lg border ${
                        cell.status === 'error'
                          ? 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                          : 'bg-slate-900/90 border-slate-800 text-slate-200'
                      }`}
                    >
                      {cell.outputText}
                    </pre>
                  )}

                  {cell.figures && cell.figures.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {cell.figures.map((figSrc, fIdx) => (
                        <div
                          key={fIdx}
                          className="rounded-lg overflow-hidden border border-slate-800 bg-slate-900 p-1.5"
                        >
                          <img
                            src={figSrc}
                            alt={`Diagnostic Figure ${fIdx + 1}`}
                            className="w-full h-auto rounded object-contain max-h-80 mx-auto"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Add Custom Cell Button */}
        <div className="pt-1 pb-6 flex justify-center">
          <button
            type="button"
            onClick={onAddCustomCell}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-dashed border-indigo-500/40 hover:border-indigo-400 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Custom Python Cell (Truy cập trực tiếp biến df, full_pipeline, X_train...)</span>
          </button>
        </div>
      </div>
    </main>
  );
};
