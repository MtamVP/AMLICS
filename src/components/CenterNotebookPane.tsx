import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Square, Plus, ArrowUp, ArrowDown, Copy } from 'lucide-react';
import { CellType, NotebookCell } from '../types/studio';
import { renderSafeMarkdownToHtml } from '../utils/markdownRenderer';

interface CenterNotebookPaneProps {
  cells: NotebookCell[];
  runningCellId: string | null;
  onRunCell: (cellId: string) => void;
  onRunFromCell: (cellId: string) => void;
  onStopCell: () => void;
  onEditCellCode: (cellId: string, newCode: string) => void;
  onToggleLockCell: (cellId: string) => void;
  onResetCellToTemplate: (cellId: string) => void;
  onInsertCellAt: (index: number, cellType: CellType) => void;
  onMoveCell: (cellId: string, direction: 'up' | 'down') => void;
  onDuplicateCell: (cellId: string) => void;
  onDeleteCell: (cellId: string) => void;
}

export const CenterNotebookPane: React.FC<CenterNotebookPaneProps> = ({
  cells,
  runningCellId,
  onRunCell,
  onRunFromCell,
  onStopCell,
  onEditCellCode,
  onToggleLockCell,
  onResetCellToTemplate,
  onInsertCellAt,
  onMoveCell,
  onDuplicateCell,
  onDeleteCell,
}) => {
  const [collapsedCells, setCollapsedCells] = useState<Record<string, boolean>>({});
  const [editingMarkdownIds, setEditingMarkdownIds] = useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string) => {
    setCollapsedCells((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleMarkdownEdit = (id: string, forceState?: boolean) => {
    setEditingMarkdownIds((prev) => ({
      ...prev,
      [id]: forceState !== undefined ? forceState : !prev[id],
    }));
  };

  return (
    <main className="w-full h-full bg-[#18191a] flex flex-col overflow-hidden">
      {/* Colab-style "+ Code" & "+ Text" Subheader */}
      <div className="px-4 py-1.5 bg-[#202124] border-b border-[#3c4043] flex items-center justify-between select-none shrink-0 text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onInsertCellAt(cells.length, 'code')}
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-[#303134] text-[#e8eaed] font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Code</span>
          </button>

          <button
            type="button"
            onClick={() => onInsertCellAt(cells.length, 'markdown')}
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-[#303134] text-[#e8eaed] font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Text</span>
          </button>

          <span className="text-[#5f6368]">|</span>
          <span className="text-[11px] text-[#9aa0a6]">
            {cells.length} cells ({cells.filter((c) => c.cellType === 'code' && !c.isLocked).length}{' '}
            UI-synced, {cells.filter((c) => c.cellType === 'code' && c.isLocked).length} locked,{' '}
            {cells.filter((c) => c.cellType === 'markdown').length} text)
          </span>
        </div>

        <span className="hidden md:inline text-[10px] font-mono text-[#9aa0a6]">
          Shortcuts: Shift+Enter (Run cell)
        </span>
      </div>

      {/* Notebook Cells Container */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 custom-scrollbar">
        {cells.map((cell, index) => {
          const isRunning = runningCellId === cell.id || cell.status === 'running';
          const isCollapsed = Boolean(collapsedCells[cell.id]);
          const lineCount = Math.max(cell.currentCode.split('\n').length, 3);
          // Auto-fit editor height without nested vertical scrollbars for normal cells
          const editorHeight = Math.min(Math.max(lineCount * 19 + 20, 85), 520);
          const isMdEditing = Boolean(editingMarkdownIds[cell.id]);

          if (cell.cellType === 'markdown') {
            return (
              <React.Fragment key={cell.id}>
                <div
                  onDoubleClick={() => toggleMarkdownEdit(cell.id, true)}
                  className="rounded border border-[#3c4043] hover:border-[#5f6368] bg-[#202124] overflow-hidden transition-colors"
                >
                  {/* Markdown Cell Header */}
                  <div className="px-3 py-1 bg-[#252629] border-b border-[#3c4043] flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 text-[#9aa0a6]">
                      <span className="font-mono">[md]</span>
                      <span className="font-medium text-[#e8eaed]">{cell.title}</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono">
                      <button
                        type="button"
                        onClick={() => toggleMarkdownEdit(cell.id)}
                        className="px-2 py-0.5 rounded-sm bg-[#303134] hover:bg-[#3c4043] text-[#8ab4f8]"
                      >
                        {isMdEditing ? 'Done (Render)' : 'Edit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveCell(cell.id, 'up')}
                        disabled={index === 0}
                        className="p-0.5 text-[#9aa0a6] hover:text-[#e8eaed] disabled:opacity-30"
                        title="Move cell up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveCell(cell.id, 'down')}
                        disabled={index === cells.length - 1}
                        className="p-0.5 text-[#9aa0a6] hover:text-[#e8eaed] disabled:opacity-30"
                        title="Move cell down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCell(cell.id)}
                        className="px-1.5 py-0.5 rounded-sm hover:bg-[#3c4043] text-[#9aa0a6] hover:text-[#f28b82]"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {isMdEditing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#3c4043]">
                      <textarea
                        value={cell.currentCode}
                        onChange={(e) => onEditCellCode(cell.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.shiftKey && e.key === 'Enter') {
                            e.preventDefault();
                            toggleMarkdownEdit(cell.id, false);
                          }
                        }}
                        rows={Math.min(Math.max(lineCount + 1, 5), 16)}
                        placeholder="Write Markdown here (supports # Headings, | GFM Tables |, - [x] Checklists, `code`)..."
                        className="w-full p-3 bg-[#18191a] text-xs font-mono text-[#e8eaed] focus:outline-none resize-y"
                      />
                      <div
                        className="p-3 bg-[#202124] overflow-x-auto"
                        dangerouslySetInnerHTML={{
                          __html: renderSafeMarkdownToHtml(cell.currentCode),
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      className="px-4 py-3 cursor-text"
                      title="Double-click to edit Markdown"
                      dangerouslySetInnerHTML={{
                        __html: renderSafeMarkdownToHtml(cell.currentCode),
                      }}
                    />
                  )}
                </div>

                {/* Hover Insert Divider Between Cells */}
                <InterCellDivider
                  onAddCode={() => onInsertCellAt(index + 1, 'code')}
                  onAddText={() => onInsertCellAt(index + 1, 'markdown')}
                />
              </React.Fragment>
            );
          }

          return (
            <React.Fragment key={cell.id}>
              <div
                className={`rounded border transition-colors overflow-hidden bg-[#202124] ${
                  isRunning
                    ? 'border-[#8ab4f8]'
                    : cell.status === 'error'
                    ? 'border-[#f28b82]/60'
                    : 'border-[#3c4043] hover:border-[#5f6368]'
                }`}
              >
                {/* Code Cell Header */}
                <div className="px-3 py-1.5 bg-[#252629] border-b border-[#3c4043] flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Colab Play / Stop Bracket */}
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
                        title="Run cell (Shift+Enter)"
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

                  {/* Right Cell Toolbar */}
                  <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-mono">
                    {/* Explicit Status Indicator */}
                    {isRunning && (
                      <span className="text-[#8ab4f8]">running...</span>
                    )}
                    {!isRunning && cell.status === 'success' && (
                      <span className="text-[#81c995]">
                        ✓ {cell.durationMs ? `${(cell.durationMs / 1000).toFixed(2)}s` : 'done'}
                      </span>
                    )}
                    {!isRunning && cell.status === 'error' && (
                      <span className="text-[#f28b82]">error</span>
                    )}
                    {!isRunning && cell.status === 'stopped' && (
                      <span className="text-[#fdd663]">stopped</span>
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
                          ? 'Locked (custom code). Click to unlock.'
                          : 'Synced with UI sidebar.'
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

                    <button
                      type="button"
                      onClick={() => onRunFromCell(cell.id)}
                      disabled={runningCellId !== null}
                      className="px-1.5 py-0.5 rounded-sm bg-[#292a2d] hover:bg-[#3c4043] text-[#9aa0a6] hover:text-[#e8eaed]"
                      title="Run this cell and all cells below"
                    >
                      ▶↓
                    </button>

                    <button
                      type="button"
                      onClick={() => onMoveCell(cell.id, 'up')}
                      disabled={index === 0}
                      className="p-0.5 text-[#9aa0a6] hover:text-[#e8eaed] disabled:opacity-30"
                      title="Move cell up"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onMoveCell(cell.id, 'down')}
                      disabled={index === cells.length - 1}
                      className="p-0.5 text-[#9aa0a6] hover:text-[#e8eaed] disabled:opacity-30"
                      title="Move cell down"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDuplicateCell(cell.id)}
                      className="p-0.5 text-[#9aa0a6] hover:text-[#e8eaed]"
                      title="Duplicate cell"
                    >
                      <Copy className="w-3 h-3" />
                    </button>

                    {cell.stepType === 'custom' && (
                      <button
                        type="button"
                        onClick={() => onDeleteCell(cell.id)}
                        className="px-1.5 py-0.5 rounded-sm hover:bg-[#3c4043] text-[#9aa0a6] hover:text-[#f28b82]"
                        title="Delete cell"
                      >
                        ×
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
                      onMount={(editor, monaco) => {
                        editor.addCommand(
                          monaco.KeyMod.Shift | monaco.KeyCode.Enter,
                          () => {
                            onRunCell(cell.id);
                          }
                        );
                        editor.addCommand(
                          monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
                          () => {
                            onRunCell(cell.id);
                          }
                        );
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
                        scrollbar: {
                          alwaysConsumeMouseWheel: false,
                        },
                      }}
                    />
                  </div>
                )}

                {/* Output Area (Stdout + HTML DataFrame + Figures) */}
                {(cell.outputText ||
                  cell.htmlOutput ||
                  (cell.figures && cell.figures.length > 0)) && (
                  <div className="border-t border-[#3c4043] bg-[#18191a] px-3.5 py-2.5 space-y-2">
                    {cell.outputText && (
                      <pre
                        className={`text-xs font-mono whitespace-pre-wrap break-words max-h-56 overflow-y-auto pl-2.5 border-l-2 ${
                          cell.status === 'error'
                            ? 'border-[#f28b82] text-[#f28b82]'
                            : 'border-[#5f6368] text-[#e8eaed]'
                        }`}
                      >
                        {cell.outputText}
                      </pre>
                    )}

                    {cell.htmlOutput && (
                      <div
                        className="overflow-x-auto text-[11px] font-mono text-[#e8eaed] border border-[#3c4043] rounded bg-[#202124] p-2 [&_table]:w-full [&_th]:px-2 [&_th]:py-1 [&_th]:bg-[#292a2d] [&_th]:text-left [&_td]:px-2 [&_td]:py-1 [&_tr]:border-b [&_tr]:border-[#292a2d]"
                        dangerouslySetInnerHTML={{ __html: cell.htmlOutput }}
                      />
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

              {/* Hover Insert Divider Between Cells */}
              <InterCellDivider
                onAddCode={() => onInsertCellAt(index + 1, 'code')}
                onAddText={() => onInsertCellAt(index + 1, 'markdown')}
              />
            </React.Fragment>
          );
        })}
      </div>
    </main>
  );
};

const InterCellDivider: React.FC<{
  onAddCode: () => void;
  onAddText: () => void;
}> = ({ onAddCode, onAddText }) => (
  <div className="group h-4 flex items-center justify-center relative my-0.5">
    <div className="w-full h-[1px] bg-transparent group-hover:bg-[#3c4043] transition-colors" />
    <div className="absolute opacity-0 group-hover:opacity-100 flex items-center gap-1.5 bg-[#18191a] px-2 transition-opacity">
      <button
        type="button"
        onClick={onAddCode}
        className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#292a2d] hover:bg-[#3c4043] text-[#e8eaed] border border-[#3c4043]"
      >
        + Code
      </button>
      <button
        type="button"
        onClick={onAddText}
        className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#292a2d] hover:bg-[#3c4043] text-[#e8eaed] border border-[#3c4043]"
      >
        + Text
      </button>
    </div>
  </div>
);
