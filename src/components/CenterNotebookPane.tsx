import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  Play,
  Square,
  Plus,
  ArrowUp,
  ArrowDown,
  Copy,
  ChevronDown,
  ChevronRight,
  Pencil,
} from 'lucide-react';
import { PIPELINE_TEMPLATES, QUICK_SNIPPETS } from '../data/sampleDatasets';
import {
  CellType,
  NotebookCell,
  PipelineTemplateId,
  QuickSnippetId,
} from '../types/studio';
import { explainPythonError } from '../utils/errorExplainer';
import { renderSafeMarkdownToHtml } from '../utils/markdownRenderer';

interface CenterNotebookPaneProps {
  cells: NotebookCell[];
  runningCellId: string | null;
  activeCellId?: string | null;
  activeDatasetName?: string;
  onSelectCell?: (cellId: string) => void;
  onRunCell: (cellId: string) => void;
  onRunFromCell: (cellId: string) => void;
  onStopCell: () => void;
  onEditCellCode: (cellId: string, newCode: string) => void;
  onRenameCell: (cellId: string, newTitle: string) => void;
  onToggleLockCell: (cellId: string) => void;
  onResetCellToTemplate: (cellId: string) => void;
  onInsertCellAt: (index: number, cellType: CellType) => void;
  onMoveCell: (cellId: string, direction: 'up' | 'down') => void;
  onDuplicateCell: (cellId: string) => void;
  onDeleteCell: (cellId: string) => void;
  onApplyTemplate: (templateId: PipelineTemplateId) => void;
  onInsertQuickSnippet: (snippetId: QuickSnippetId) => void;
  onDropCsvFile?: (file: File) => void;
}

export const CenterNotebookPane: React.FC<CenterNotebookPaneProps> = ({
  cells,
  runningCellId,
  activeCellId,
  activeDatasetName,
  onSelectCell,
  onRunCell,
  onRunFromCell,
  onStopCell,
  onEditCellCode,
  onRenameCell,
  onToggleLockCell,
  onResetCellToTemplate,
  onInsertCellAt,
  onMoveCell,
  onDuplicateCell,
  onDeleteCell,
  onApplyTemplate,
  onInsertQuickSnippet,
  onDropCsvFile,
}) => {
  const [collapsedCells, setCollapsedCells] = useState<Record<string, boolean>>({});
  const [editingMarkdownIds, setEditingMarkdownIds] = useState<Record<string, boolean>>({});
  const [editingTitleCellId, setEditingTitleCellId] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<'templates' | 'snippets' | null>(null);
  const [isDraggingCsv, setIsDraggingCsv] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

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
    <main
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setIsDraggingCsv(true);
        }
      }}
      onDragLeave={() => setIsDraggingCsv(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingCsv(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.name.toLowerCase().endsWith('.csv') && onDropCsvFile) {
          onDropCsvFile(file);
        }
      }}
      className="w-full h-full bg-[#18191a] flex flex-col overflow-hidden relative"
    >
      {isDraggingCsv && (
        <div className="absolute inset-0 z-40 bg-[#18191a]/85 border-2 border-dashed border-[#8ab4f8] flex items-center justify-center pointer-events-none">
          <div className="px-5 py-3 rounded bg-[#202124] border border-[#8ab4f8] text-sm font-mono text-[#8ab4f8]">
            Thả file .csv vào đây để nạp dữ liệu ngay
          </div>
        </div>
      )}

      {/* Colab-style "+ Code", "+ Text" & Compact Dropdowns Subheader */}
      <div className="px-4 py-1.5 bg-[#202124] border-b border-[#3c4043] flex items-center justify-between select-none shrink-0 text-xs relative z-20">
        <div ref={dropdownRef} className="flex items-center gap-1.5 flex-wrap">
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

          {/* Compact Dropdown: Mẫu Pipeline */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setOpenDropdown((d) => (d === 'templates' ? null : 'templates'))
              }
              className={`px-2 py-0.5 rounded font-mono text-[11px] border transition-colors ${
                openDropdown === 'templates'
                  ? 'bg-[#292a2d] text-[#8ab4f8] border-[#8ab4f8]/60'
                  : 'bg-transparent text-[#9aa0a6] border-[#3c4043] hover:text-[#e8eaed]'
              }`}
            >
              Mẫu Pipeline ▾
            </button>

            {openDropdown === 'templates' && (
              <div className="absolute left-0 top-full mt-1 w-80 rounded border border-[#3c4043] bg-[#292a2d] shadow-xl py-1 z-50">
                <div className="px-3 py-1 text-[10px] font-mono text-[#9aa0a6] border-b border-[#3c4043]">
                  Áp dụng cho: {activeDatasetName || 'dataset hiện tại'}
                </div>
                {PIPELINE_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      setOpenDropdown(null);
                      onApplyTemplate(tpl.id);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-[#3c4043] transition-colors space-y-0.5"
                  >
                    <div className="text-xs font-mono text-[#8ab4f8]">
                      {tpl.shortLabel}
                    </div>
                    <div className="text-[10px] text-[#9aa0a6] leading-snug">
                      {tpl.description}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Compact Dropdown: + Đồ thị & So sánh */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setOpenDropdown((d) => (d === 'snippets' ? null : 'snippets'))
              }
              className={`px-2 py-0.5 rounded font-mono text-[11px] border transition-colors ${
                openDropdown === 'snippets'
                  ? 'bg-[#292a2d] text-[#81c995] border-[#81c995]/60'
                  : 'bg-transparent text-[#9aa0a6] border-[#3c4043] hover:text-[#e8eaed]'
              }`}
              title="Chèn nhanh cell vẽ đồ thị hoặc bảng so sánh theo dữ liệu vừa tải"
            >
              + Đồ thị &amp; So sánh ▾
            </button>

            {openDropdown === 'snippets' && (
              <div className="absolute left-0 top-full mt-1 w-80 rounded border border-[#3c4043] bg-[#292a2d] shadow-xl py-1 z-50">
                <div className="px-3 py-1 text-[10px] font-mono text-[#81c995] border-b border-[#3c4043]">
                  Chèn cell cho: {activeDatasetName || 'df'}
                </div>
                {QUICK_SNIPPETS.map((snip) => (
                  <button
                    key={snip.id}
                    type="button"
                    onClick={() => {
                      setOpenDropdown(null);
                      onInsertQuickSnippet(snip.id);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-[#3c4043] transition-colors space-y-0.5"
                  >
                    <div className="text-xs font-mono text-[#e8eaed]">
                      + {snip.label}
                    </div>
                    <div className="text-[10px] text-[#9aa0a6] leading-snug">
                      {snip.description}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="text-[#5f6368] hidden sm:inline">|</span>
          <span className="text-[11px] text-[#9aa0a6] hidden sm:inline">
            {cells.length} cells
          </span>
        </div>

        <span className="hidden lg:inline text-[10px] font-mono text-[#9aa0a6]">
          Kéo thả .csv vào đây • Click tên cell để đổi tên
        </span>
      </div>

      {/* Notebook Cells Container */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 custom-scrollbar">
        {cells.length === 0 && (
          <div className="p-6 rounded border border-[#3c4043] bg-[#202124] text-center space-y-3 my-4">
            <div className="text-sm font-medium text-[#e8eaed]">
              Notebook đang trống — Chọn mẫu Pipeline có sẵn hoặc thêm Cell mới
            </div>
            <p className="text-xs text-[#9aa0a6] max-w-xl mx-auto">
              Bấm vào một trong các mẫu dưới đây để tự động sinh bộ khung code chuẩn chống Data Leakage, hoặc bấm <strong>+ Code</strong> để tự viết code Python từ đầu.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2 text-left">
              {PIPELINE_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => onApplyTemplate(tpl.id)}
                  className="p-3 rounded border border-[#3c4043] bg-[#18191a] hover:border-[#8ab4f8] hover:bg-[#252629] transition-colors space-y-1"
                >
                  <div className="text-xs font-semibold text-[#8ab4f8] font-mono">
                    {tpl.shortLabel}
                  </div>
                  <div className="text-[11px] text-[#9aa0a6] leading-snug">
                    {tpl.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {cells.map((cell, index) => {
          const isRunning = runningCellId === cell.id || cell.status === 'running';
          const isCollapsed = Boolean(collapsedCells[cell.id]);
          const lineCount = Math.max(cell.currentCode.split('\n').length, 3);
          const editorHeight = Math.min(Math.max(lineCount * 19 + 20, 85), 520);
          const isMdEditing = Boolean(editingMarkdownIds[cell.id]);
          const isEditingTitle = editingTitleCellId === cell.id;

          if (cell.cellType === 'markdown') {
            return (
              <React.Fragment key={cell.id}>
                <div
                  onDoubleClick={() => toggleMarkdownEdit(cell.id, true)}
                  className="rounded border border-[#3c4043] hover:border-[#5f6368] bg-[#202124] overflow-hidden transition-colors"
                >
                  {/* Markdown Cell Header */}
                  <div className="px-3 py-1 bg-[#252629] border-b border-[#3c4043] flex items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-2 text-[#9aa0a6] min-w-0 flex-1">
                      <span className="font-mono shrink-0">[md]</span>
                      {isEditingTitle ? (
                        <input
                          type="text"
                          autoFocus
                          value={cell.title}
                          onChange={(e) => onRenameCell(cell.id, e.target.value)}
                          onBlur={() => setEditingTitleCellId(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Escape') {
                              setEditingTitleCellId(null);
                            }
                          }}
                          className="bg-[#18191a] border border-[#8ab4f8] rounded px-2 py-0.5 text-xs text-[#e8eaed] font-medium focus:outline-none w-64 max-w-full"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingTitleCellId(cell.id)}
                          title="Bấm để đổi tên cell này"
                          className="group flex items-center gap-1.5 font-medium text-[#e8eaed] hover:text-[#8ab4f8] truncate text-left"
                        >
                          <span className="truncate">{cell.title}</span>
                          <Pencil className="w-3 h-3 text-[#9aa0a6] opacity-60 group-hover:opacity-100 shrink-0" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 font-mono shrink-0">
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
                        title="Delete cell"
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
                onClick={() => onSelectCell?.(cell.id)}
                className={`rounded border transition-colors overflow-hidden bg-[#202124] ${
                  isRunning
                    ? 'border-[#8ab4f8]'
                    : cell.status === 'error'
                    ? 'border-[#f28b82]/60'
                    : activeCellId === cell.id
                    ? 'border-[#5f6368] border-l-2 border-l-[#8ab4f8]'
                    : 'border-[#3c4043] hover:border-[#5f6368]'
                }`}
              >
                {/* Code Cell Header */}
                <div className="px-3 py-1.5 bg-[#252629] border-b border-[#3c4043] flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
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

                    {/* Collapse Toggle Chevron */}
                    <button
                      type="button"
                      onClick={() => toggleCollapse(cell.id)}
                      className="p-0.5 text-[#9aa0a6] hover:text-[#e8eaed] shrink-0"
                      title={isCollapsed ? 'Mở rộng cell' : 'Thu gọn cell'}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Editable Cell Title for ALL cells */}
                    {isEditingTitle ? (
                      <input
                        type="text"
                        autoFocus
                        value={cell.title}
                        onChange={(e) => onRenameCell(cell.id, e.target.value)}
                        onBlur={() => setEditingTitleCellId(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'Escape') {
                            setEditingTitleCellId(null);
                          }
                        }}
                        placeholder="Nhập tên cell..."
                        className="bg-[#18191a] border border-[#8ab4f8] rounded px-2 py-0.5 text-xs text-[#e8eaed] font-medium focus:outline-none w-72 max-w-full"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingTitleCellId(cell.id)}
                        title="Bấm để đổi tên cell"
                        className="group flex items-center gap-1.5 font-medium text-[#e8eaed] hover:text-[#8ab4f8] truncate text-left"
                      >
                        <span className="truncate">{cell.title}</span>
                        <Pencil className="w-3 h-3 text-[#9aa0a6] opacity-50 group-hover:opacity-100 shrink-0" />
                      </button>
                    )}

                    {!isEditingTitle && cell.subtitle && (
                      <span className="hidden xl:inline text-[11px] text-[#9aa0a6] truncate">
                        — {cell.subtitle}
                      </span>
                    )}
                  </div>

                  {/* Right Cell Toolbar */}
                  <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-mono">
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

                    <button
                      type="button"
                      onClick={() => onDeleteCell(cell.id)}
                      className="px-1.5 py-0.5 rounded-sm hover:bg-[#3c4043] text-[#9aa0a6] hover:text-[#f28b82]"
                      title="Delete cell"
                    >
                      ×
                    </button>
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
                      <>
                        <pre
                          className={`text-xs font-mono whitespace-pre-wrap break-words max-h-56 overflow-y-auto pl-2.5 border-l-2 ${
                            cell.status === 'error'
                              ? 'border-[#f28b82] text-[#f28b82]'
                              : 'border-[#5f6368] text-[#e8eaed]'
                          }`}
                        >
                          {cell.outputText}
                        </pre>
                        {cell.status === 'error' &&
                          explainPythonError(cell.outputText) && (
                            <div className="px-2.5 py-1.5 rounded bg-[#2d261b] border border-[#fdd663]/40 text-[11px] text-[#fdd663]">
                              {explainPythonError(cell.outputText)}
                            </div>
                          )}
                      </>
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
