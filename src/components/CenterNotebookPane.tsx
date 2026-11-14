import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Square, Plus } from 'lucide-react';
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
    <main className="w-full h-full bg-[#18191a] flex flex-col overflow-hidden">
      {/* Minimal Subheader like Google Colab's "+ Code" toolbar */}
      <div className="px-4 py-1.5 bg-[#202124] border-b border-[#3c4043] flex items-center justify-between select-none shrink-0 text-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onAddCustomCell}
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-[#303134] text-[#e8eaed] font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Code</span>
          </button>
          <span className="text-[#5f6368]">|</span>
          <span className="text-[11px] text-[#9aa0a6]">
            {cells.length} cells • {cells.filter((c) => !c.isLocked).length} UI-synced,{' '}
            {cells.filter((c) => c.isLocked).length} custom-locked
          </span>
        </div>
      </div>

      {/* Notebook Cells List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 custom-scrollbar">
        {cells.map((cell, index) => {
          const isRunning = runningCellId === cell.id || cell.status === 'running';
          const isCollapsed = Boolean(collapsedCells[cell.id]);
          const lineCount = cell.currentCode.split('\n').length;
          const editorHeight = Math.min(Math.max(lineCount * 19 + 18, 125), 340);

          return (
            <div
              key={cell.id}
              className={`rounded border transition-colors overflow-hidden bg-[#202124] ${
                isRunning
                  ? 'border-[#8ab4f8]'
                  : 'border-[#3c4043] hover:border-[#5f6368]'
              }`}
            >
              {/* Minimal Cell Header */}
              <div className="px-3 py-1.5 bg-[#252629] border-b border-[#3c4043] flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Colab-style Play / Bracket Button */}
                  {isRunning ? (
                    <button
                      type="button"
                      onClick={onStopCell}
                      className="w-6 h-6 rounded-full bg-[#3c4043] hover:bg-[#5f6368] text-[#f28b82] flex items-center justify-center shrink-0 border border-[#8ab4f8] animate-pulse"
                      title="Interrupt cell"
                    >
                      <Square className="w-2.5 h-2.5 fill-current" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onRunCell(cell.id)}
                      disabled={runningCellId !== null}
                      className="group w-6 h-6 rounded-full bg-[#303134] hover:bg-[#3c4043] disabled:opacity-40 text-[#e8eaed] flex items-center justify-center shrink-0 transition-colors"
                      title="Run cell"
                    >
                      <Play className="w-2.5 h-2.5 fill-current hidden group-hover:block" />
                      <span className="font-mono text-[10px] text-[#9aa0a6] group-hover:hidden">
                        [{index + 1}]
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleCollapse(cell.id)}
                    className="font-medium text-[#e8eaed] hover:underline truncate text-left"
                  >
                    {cell.title}
                  </button>

                  <span className="hidden sm:inline text-[11px] text-[#9aa0a6] truncate">
                    — {cell.subtitle}
                  </span>
                </div>

                {/* Right: Minimal Status & Lock Controls */}
                <div className="flex items-center gap-2 shrink-0 text-[11px] font-mono">
                  {cell.durationMs !== undefined && cell.durationMs > 0 && (
                    <span className="text-[#9aa0a6]">
                      {cell.status === 'success' ? '✓ ' : ''}
                      {(cell.durationMs / 1000).toFixed(2)}s
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => onToggleLockCell(cell.id)}
                    className={`px-1.5 py-0.5 rounded-sm border transition-colors ${
                      cell.isLocked
                        ? 'bg-[#303134] text-[#fdd663] border-[#5f6368]'
                        : 'bg-transparent text-[#9aa0a6] border-[#3c4043] hover:text-[#e8eaed]'
                    }`}
                    title={
                      cell.isLocked
                        ? 'Locked (custom edited). Click to unlock.'
                        : 'Synced with UI sidebar. Editing code automatically locks this cell.'
                    }
                  >
                    {cell.isLocked ? 'Locked' : 'UI Synced'}
                  </button>

                  {cell.isLocked && cell.stepType !== 'custom' && (
                    <button
                      type="button"
                      onClick={() => onResetCellToTemplate(cell.id)}
                      className="px-1.5 py-0.5 rounded-sm bg-[#303134] hover:bg-[#3c4043] text-[#e8eaed]"
                      title="Reset to UI-generated code"
                    >
                      Reset
                    </button>
                  )}

                  {cell.stepType === 'custom' && (
                    <button
                      type="button"
                      onClick={() => onDeleteCustomCell(cell.id)}
                      className="px-1.5 py-0.5 rounded-sm hover:bg-[#3c4043] text-[#9aa0a6] hover:text-[#f28b82]"
                      title="Delete cell"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Monaco Code Area */}
              {!isCollapsed && (
                <div className="bg-[#1e1e1e]">
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
                      fontFamily: "'JetBrains Mono', Consolas, monospace",
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                      automaticLayout: true,
                      padding: { top: 8, bottom: 8 },
                      renderLineHighlight: 'line',
                      tabSize: 4,
                    }}
                  />
                </div>
              )}

              {/* Colab-style Output Area */}
              {(cell.outputText || (cell.figures && cell.figures.length > 0)) && (
                <div className="border-t border-[#3c4043] bg-[#18191a] px-3.5 py-2.5 space-y-2">
                  {cell.outputText && (
                    <pre
                      className={`text-xs font-mono whitespace-pre-wrap break-words max-h-52 overflow-y-auto pl-2.5 border-l-2 ${
                        cell.status === 'error'
                          ? 'border-[#f28b82] text-[#f28b82]'
                          : 'border-[#5f6368] text-[#e8eaed]'
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
                          className="rounded border border-[#3c4043] bg-[#202124] p-1"
                        >
                          <img
                            src={figSrc}
                            alt={`Output plot ${fIdx + 1}`}
                            className="w-full h-auto object-contain max-h-72 mx-auto"
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

        <div className="pt-1 pb-6 flex justify-center">
          <button
            type="button"
            onClick={onAddCustomCell}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-[#202124] hover:bg-[#292a2d] text-[#9aa0a6] hover:text-[#e8eaed] border border-[#3c4043] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add code cell</span>
          </button>
        </div>
      </div>
    </main>
  );
};
