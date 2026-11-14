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
  Trash2,
  X,
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
import { MarkdownCellEditor } from './MarkdownCellEditor';

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
  onDeleteCells?: (cellIds: string[]) => void;
  onApplyTemplate: (templateId: PipelineTemplateId) => void;
  onInsertQuickSnippet: (snippetId: QuickSnippetId) => void;
  onDropCsvFile?: (file: File) => void;
  onUploadCsvClick?: () => void;
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
  onDeleteCells,
  onApplyTemplate,
  onInsertQuickSnippet,
  onDropCsvFile,
  onUploadCsvClick,
}) => {
  const [collapsedCells, setCollapsedCells] = useState<Record<string, boolean>>({});
  const [editingMarkdownIds, setEditingMarkdownIds] = useState<Record<string, boolean>>({});
  const [editingTitleCellId, setEditingTitleCellId] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<'templates' | 'snippets' | null>(null);
  const [isDraggingCsv, setIsDraggingCsv] = useState<boolean>(false);
  const [showMinimap, setShowMinimap] = useState<boolean>(true);
  const [hoveredMinimapCellId, setHoveredMinimapCellId] = useState<string | null>(null);
  const [selectedCellIds, setSelectedCellIds] = useState<string[]>([]);
  const [anchorCellId, setAnchorCellId] = useState<string | null>(null);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [scrollProgress, setScrollProgress] = useState<{ topRatio: number; heightRatio: number }>({
    topRatio: 0,
    heightRatio: 0.25,
  });
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleNotebookScroll = () => {
    const el = scrollContainerRef.current;
    if (!el || el.scrollHeight <= 0) return;
    setScrollProgress({
      topRatio: el.scrollTop / el.scrollHeight,
      heightRatio: Math.min(1, el.clientHeight / el.scrollHeight),
    });
  };

  const jumpToCell = (cellId: string) => {
    onSelectCell?.(cellId);
    const targetEl = cellRefs.current[cellId];
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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

  const [zoomedPlotSrc, setZoomedPlotSrc] = useState<string | null>(null);

  const handleCellSelect = (cellId: string, e?: React.MouseEvent) => {
    onSelectCell?.(cellId);
    const isCtrl = Boolean(e?.ctrlKey || e?.metaKey);
    const isShift = Boolean(e?.shiftKey);

    if (isShift) {
      const anchor = anchorCellId || activeCellId || cellId;
      const idxA = cells.findIndex((c) => c.id === anchor);
      const idxB = cells.findIndex((c) => c.id === cellId);
      if (idxA >= 0 && idxB >= 0) {
        const [start, end] = idxA <= idxB ? [idxA, idxB] : [idxB, idxA];
        const rangeIds = cells.slice(start, end + 1).map((c) => c.id);
        if (isCtrl) {
          setSelectedCellIds((prev) => Array.from(new Set([...prev, ...rangeIds])));
        } else {
          setSelectedCellIds(rangeIds);
        }
        return;
      }
    }

    if (isCtrl) {
      setSelectedCellIds((prev) =>
        prev.includes(cellId) ? prev.filter((id) => id !== cellId) : [...prev, cellId]
      );
      setAnchorCellId(cellId);
      return;
    }

    setSelectedCellIds([cellId]);
    setAnchorCellId(cellId);
  };

  const deleteSelected = () => {
    const targets =
      selectedCellIds.length > 0
        ? selectedCellIds
        : activeCellId
        ? [activeCellId]
        : [];
    if (targets.length === 0) return;
    if (onDeleteCells) {
      onDeleteCells(targets);
    } else {
      targets.forEach((id) => onDeleteCell(id));
    }
    setSelectedCellIds([]);
    setAnchorCellId(null);
  };

  useEffect(() => {
    const isEditingText = () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable) {
        return true;
      }
      if (el.closest('.monaco-editor')) return true;
      return false;
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isShortcutsOpen) {
          setIsShortcutsOpen(false);
          return;
        }
        if (zoomedPlotSrc) {
          setZoomedPlotSrc(null);
          return;
        }
        if (selectedCellIds.length > 1) {
          setSelectedCellIds(activeCellId ? [activeCellId] : []);
          return;
        }
      }

      if ((e.altKey && e.key === '/') || (!isEditingText() && e.key === '?')) {
        e.preventDefault();
        setIsShortcutsOpen((p) => !p);
        return;
      }

      if (isEditingText()) return;

      const isMod = e.ctrlKey || e.metaKey;

      // Ctrl+A: Select all cells
      if (isMod && !e.shiftKey && e.key.toLowerCase() === 'a') {
        if (cells.length > 0) {
          e.preventDefault();
          const allIds = cells.map((c) => c.id);
          setSelectedCellIds(allIds);
          if (!activeCellId) onSelectCell?.(allIds[0]);
          if (!anchorCellId) setAnchorCellId(allIds[0]);
        }
        return;
      }

      // Delete / Backspace / Alt+Backspace: Delete selected cell(s)
      if (e.key === 'Delete' || e.key === 'Backspace' || (e.altKey && e.key === 'Backspace')) {
        if (selectedCellIds.length > 0 || activeCellId) {
          e.preventDefault();
          deleteSelected();
        }
        return;
      }

      const curIdx = activeCellId ? cells.findIndex((c) => c.id === activeCellId) : -1;

      // ArrowUp / ArrowDown, Shift+Arrow, Ctrl+Shift+Arrow
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (cells.length === 0) return;
        e.preventDefault();

        // Alt+Shift+Arrow: Move active cell up/down
        if (e.altKey && e.shiftKey && activeCellId) {
          onMoveCell(activeCellId, e.key === 'ArrowUp' ? 'up' : 'down');
          return;
        }

        const dir = e.key === 'ArrowDown' ? 1 : -1;
        const nextIdx =
          isMod && e.shiftKey
            ? dir > 0
              ? cells.length - 1
              : 0
            : curIdx < 0
            ? 0
            : Math.min(cells.length - 1, Math.max(0, curIdx + dir));
        const targetCell = cells[nextIdx];
        if (!targetCell) return;

        if (e.shiftKey) {
          const anchor = anchorCellId || activeCellId || targetCell.id;
          const aIdx = Math.max(0, cells.findIndex((c) => c.id === anchor));
          const [start, end] = aIdx <= nextIdx ? [aIdx, nextIdx] : [nextIdx, aIdx];
          setSelectedCellIds(cells.slice(start, end + 1).map((c) => c.id));
          onSelectCell?.(targetCell.id);
        } else {
          setSelectedCellIds([targetCell.id]);
          setAnchorCellId(targetCell.id);
          onSelectCell?.(targetCell.id);
        }
        cellRefs.current[targetCell.id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }

      // Shift+Enter: Run active cell and advance
      if (e.shiftKey && e.key === 'Enter' && activeCellId) {
        e.preventDefault();
        onRunCell(activeCellId);
        if (curIdx >= 0 && curIdx < cells.length - 1) {
          const next = cells[curIdx + 1];
          onSelectCell?.(next.id);
          setSelectedCellIds([next.id]);
          setAnchorCellId(next.id);
        }
        return;
      }

      // Ctrl+Shift+D: Duplicate active cell
      if (isMod && e.shiftKey && e.key.toLowerCase() === 'd' && activeCellId) {
        e.preventDefault();
        onDuplicateCell(activeCellId);
        return;
      }

      // Alt+N: Insert Code cell below | Alt+T: Insert Text cell below
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        onInsertCellAt(curIdx >= 0 ? curIdx + 1 : cells.length, 'code');
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        onInsertCellAt(curIdx >= 0 ? curIdx + 1 : cells.length, 'markdown');
        return;
      }

      // Alt+M: Toggle collapse active cell | Alt+C: Toggle collapse all
      if (e.altKey && e.key.toLowerCase() === 'm' && activeCellId) {
        e.preventDefault();
        toggleCollapse(activeCellId);
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        toggleCollapseAll();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    zoomedPlotSrc,
    isShortcutsOpen,
    activeCellId,
    anchorCellId,
    selectedCellIds,
    cells,
    onDeleteCell,
    onDeleteCells,
    onSelectCell,
    onMoveCell,
    onRunCell,
    onDuplicateCell,
    onInsertCellAt,
  ]);

  const allCollapsed =
    cells.length > 0 && cells.every((c) => Boolean(collapsedCells[c.id]));

  const toggleCollapseAll = () => {
    if (allCollapsed) {
      setCollapsedCells({});
    } else {
      const next: Record<string, boolean> = {};
      cells.forEach((c) => {
        next[c.id] = true;
      });
      setCollapsedCells(next);
    }
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
      <div className="px-3 py-1.5 bg-[#202124] border-b border-[#3c4043] flex items-center justify-between gap-2 select-none shrink-0 text-xs relative z-20">
        <div ref={dropdownRef} className="flex items-center gap-1.5 flex-wrap min-w-0">
          <div className="inline-flex items-center rounded-md border border-[#3c4043] bg-[#18191a]/60 overflow-hidden h-7 shrink-0">
            <button
              type="button"
              onClick={() => onInsertCellAt(cells.length, 'code')}
              className="flex items-center gap-1 px-2.5 h-full hover:bg-[#303134] text-[#e8eaed] font-medium transition-colors whitespace-nowrap"
              title="Thêm Code Cell mới"
            >
              <Plus className="w-3.5 h-3.5 text-[#8ab4f8]" />
              <span>Code</span>
            </button>
            <div className="w-px h-4 bg-[#3c4043]" />
            <button
              type="button"
              onClick={() => onInsertCellAt(cells.length, 'markdown')}
              className="flex items-center gap-1 px-2.5 h-full hover:bg-[#303134] text-[#e8eaed] font-medium transition-colors whitespace-nowrap"
              title="Thêm Text (Markdown) Cell mới"
            >
              <Plus className="w-3.5 h-3.5 text-[#81c995]" />
              <span>Text</span>
            </button>
          </div>

          {/* Compact Dropdown: Mẫu Pipeline */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() =>
                setOpenDropdown((d) => (d === 'templates' ? null : 'templates'))
              }
              className={`h-7 px-2.5 rounded-md font-mono text-[11px] border transition-colors whitespace-nowrap flex items-center ${
                openDropdown === 'templates'
                  ? 'bg-[#292a2d] text-[#8ab4f8] border-[#8ab4f8]/60'
                  : 'bg-[#18191a]/40 text-[#bdc1c6] border-[#3c4043] hover:text-[#e8eaed] hover:bg-[#292a2d]'
              }`}
            >
              Mẫu Pipeline ▾
            </button>

            {openDropdown === 'templates' && (
              <div className="absolute left-0 top-full mt-1 w-80 max-h-64 overflow-y-auto custom-scrollbar rounded border border-[#3c4043] bg-[#292a2d] shadow-xl py-1 z-50">
                <div className="sticky top-0 bg-[#292a2d] px-3 py-1 text-[10px] font-mono text-[#9aa0a6] border-b border-[#3c4043]">
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
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() =>
                setOpenDropdown((d) => (d === 'snippets' ? null : 'snippets'))
              }
              className={`h-7 px-2.5 rounded-md font-mono text-[11px] border transition-colors whitespace-nowrap flex items-center ${
                openDropdown === 'snippets'
                  ? 'bg-[#292a2d] text-[#81c995] border-[#81c995]/60'
                  : 'bg-[#18191a]/40 text-[#bdc1c6] border-[#3c4043] hover:text-[#e8eaed] hover:bg-[#292a2d]'
              }`}
              title="Chèn nhanh cell vẽ đồ thị hoặc bảng so sánh theo dữ liệu vừa tải"
            >
              + Đồ thị ▾
            </button>

            {openDropdown === 'snippets' && (
              <div className="absolute left-0 top-full mt-1 w-80 max-h-64 overflow-y-auto custom-scrollbar rounded border border-[#3c4043] bg-[#292a2d] shadow-xl py-1 z-50">
                <div className="sticky top-0 bg-[#292a2d] px-3 py-1 text-[10px] font-mono text-[#81c995] border-b border-[#3c4043]">
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

        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="hidden md:inline-flex items-center h-7 px-2 rounded-md bg-[#18191a]/60 border border-[#3c4043]/70 text-[11px] font-mono text-[#9aa0a6] whitespace-nowrap">
            {cells.length} cells
          </span>
          {cells.length > 0 && (
            <button
              type="button"
              onClick={toggleCollapseAll}
              className="h-7 px-2.5 rounded-md font-mono text-[11px] border border-[#3c4043] bg-[#18191a]/40 text-[#bdc1c6] hover:text-[#e8eaed] hover:bg-[#292a2d] transition-colors whitespace-nowrap"
              title="Thu gọn hoặc mở rộng tất cả các cell để dễ tìm và xóa nhanh"
            >
              {allCollapsed ? 'Mở rộng' : 'Thu gọn'}
            </button>
          )}
          {selectedCellIds.length > 1 ? (
            <div className="flex items-center gap-1.5 h-7 px-2 rounded-md bg-[#8ab4f8]/15 border border-[#8ab4f8]/50 text-[11px] font-mono whitespace-nowrap">
              <span className="text-[#8ab4f8] font-semibold">
                {selectedCellIds.length} đã chọn
              </span>
              <button
                type="button"
                onClick={deleteSelected}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#f28b82]/20 hover:bg-[#f28b82]/30 text-[#f28b82]"
                title="Xóa tất cả các cell đã chọn (Delete / Backspace)"
              >
                <Trash2 className="w-3 h-3" />
                <span>Xóa</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCellIds(activeCellId ? [activeCellId] : [])}
                className="text-[#9aa0a6] hover:text-[#e8eaed]"
                title="Bỏ chọn nhiều (Esc)"
              >
                Esc
              </button>
            </div>
          ) : (
            activeCellId && (
              <button
                type="button"
                onClick={deleteSelected}
                className="flex items-center gap-1 h-7 px-2.5 rounded-md font-mono text-[11px] border border-[#f28b82]/40 bg-[#f28b82]/5 text-[#f28b82] hover:bg-[#f28b82]/15 transition-colors whitespace-nowrap"
                title="Xóa cell đang chọn (Delete / Alt+Backspace)"
              >
                <Trash2 className="w-3 h-3" />
                <span className="hidden sm:inline">Xóa</span>
              </button>
            )
          )}
          <button
            type="button"
            onClick={() => setIsShortcutsOpen(true)}
            className="h-7 px-2.5 rounded-md font-mono text-[11px] border border-[#3c4043] bg-[#18191a]/40 text-[#bdc1c6] hover:text-[#e8eaed] hover:bg-[#292a2d] transition-colors whitespace-nowrap flex items-center gap-1"
            title="Xem danh sách phím tắt (? hoặc Alt+/)"
          >
            <span>⌨</span>
            <span className="hidden xl:inline">Phím tắt</span>
          </button>
          {cells.length > 0 && (
            <button
              type="button"
              onClick={() => setShowMinimap((m) => !m)}
              className={`h-7 px-2.5 rounded-md font-mono text-[11px] border transition-colors whitespace-nowrap flex items-center ${
                showMinimap
                  ? 'bg-[#8ab4f8]/15 text-[#8ab4f8] border-[#8ab4f8]/50'
                  : 'bg-[#18191a]/40 text-[#bdc1c6] border-[#3c4043] hover:text-[#e8eaed] hover:bg-[#292a2d]'
              }`}
              title="Bật/tắt thanh Minimap thu nhỏ bên phải (giống VS Code)"
            >
              Map{cells.some((c) => c.status === 'error') ? ' • !' : ''}
            </button>
          )}
        </div>
      </div>

      {/* Notebook Cells Container + VS Code-style Minimap */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
      <div
        ref={scrollContainerRef}
        onScroll={handleNotebookScroll}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-2 custom-scrollbar"
      >
        {cells.length === 0 && (
          <div className="p-6 rounded-lg border border-white/[0.08] bg-[#1e1f23] text-center space-y-3 my-4">
            <div className="text-sm font-medium text-[#e8eaed]">
              Notebook trống — Tải dữ liệu hoặc chọn mẫu Pipeline để bắt đầu
            </div>
            <p className="text-xs text-[#9aa0a6] max-w-xl mx-auto">
              Tải lên file <code>train.csv</code>, chọn dữ liệu Public URL / Colab-Kaggle ở cột trái để tự động sinh 5 cell Pipeline, hoặc chọn mẫu bên dưới / bấm <strong>+ Code</strong>.
            </p>
            {onUploadCsvClick && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onUploadCsvClick}
                  className="px-3.5 py-1.5 rounded bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124] text-xs font-medium transition-colors"
                >
                  Tải file train.csv lên (Tự tạo 5 cell)
                </button>
              </div>
            )}
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
          const isMultiSelected = selectedCellIds.includes(cell.id);

          if (cell.cellType === 'markdown') {
            return (
              <React.Fragment key={cell.id}>
                <div
                  ref={(el) => {
                    cellRefs.current[cell.id] = el;
                  }}
                  onClick={(e) => handleCellSelect(cell.id, e)}
                  onDoubleClick={() => toggleMarkdownEdit(cell.id, true)}
                  className={`rounded-lg border overflow-hidden transition-all ${
                    isMultiSelected
                      ? 'border-[#8ab4f8]/70 bg-[#8ab4f8]/[0.04] shadow-[0_0_0_1px_rgba(138,180,248,0.12)]'
                      : 'border-white/[0.08] hover:border-white/[0.16] bg-[#1e1f23]'
                  }`}
                >
                  {/* Markdown Cell Header */}
                  <div className="px-3 py-1.5 bg-[#23252a] border-b border-white/[0.06] flex items-center justify-between gap-2 text-[11px]">
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
                        className="p-1 rounded-sm hover:bg-[#f28b82]/15 text-[#9aa0a6] hover:text-[#f28b82] transition-colors"
                        title="Xóa cell này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isMdEditing ? (
                    <MarkdownCellEditor
                      value={cell.currentCode}
                      onChange={(next) => onEditCellCode(cell.id, next)}
                      onFinishEdit={() => toggleMarkdownEdit(cell.id, false)}
                      rows={Math.min(Math.max(lineCount + 1, 5), 16)}
                    />
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
                ref={(el) => {
                  cellRefs.current[cell.id] = el;
                }}
                onClick={(e) => handleCellSelect(cell.id, e)}
                className={`rounded-lg border transition-all overflow-hidden bg-[#1e1f23] ${
                  isRunning
                    ? 'border-[#8ab4f8]/80 shadow-[0_0_0_1px_rgba(138,180,248,0.18)]'
                    : cell.status === 'error'
                    ? 'border-[#f28b82]/60'
                    : isMultiSelected || activeCellId === cell.id
                    ? 'border-[#8ab4f8]/60 border-l-2 border-l-[#8ab4f8] shadow-[0_0_0_1px_rgba(138,180,248,0.12)]'
                    : 'border-white/[0.08] hover:border-white/[0.16]'
                }`}
              >
                {/* Code Cell Header */}
                <div className="sticky top-0 z-10 px-3 py-1.5 bg-[#23252a] border-b border-white/[0.06] flex items-center justify-between gap-2 text-xs">
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
                      className="p-1 rounded-sm hover:bg-[#f28b82]/15 text-[#9aa0a6] hover:text-[#f28b82] transition-colors"
                      title="Xóa cell này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
                            onClick={() => setZoomedPlotSrc(figSrc)}
                            title="Bấm để phóng to đồ thị"
                            className="group relative rounded border border-[#3c4043] hover:border-[#8ab4f8] bg-[#202124] p-1 cursor-zoom-in transition-colors"
                          >
                            <img
                              src={figSrc}
                              alt={`Output plot ${fIdx + 1}`}
                              className="w-full h-auto object-contain max-h-72 mx-auto"
                            />
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 px-2 py-0.5 rounded bg-[#18191a]/90 border border-[#3c4043] text-[10px] font-mono text-[#8ab4f8]">
                              Phóng to ⤢
                            </span>
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

      {/* VS Code-style Compact Notebook Minimap (24px wide) */}
      {showMinimap && cells.length > 0 && (
        <div className="w-6 shrink-0 bg-[#1a1b1e] border-l border-[#292a2d] py-1.5 px-0.5 flex flex-col gap-1 select-none relative z-20">
          {/* Viewport slider */}
          <div
            className="pointer-events-none absolute left-0 right-0 bg-white/[0.06] border-y border-white/10 transition-all duration-75"
            style={{
              top: `${Math.min(92, scrollProgress.topRatio * 100)}%`,
              height: `${Math.max(8, scrollProgress.heightRatio * 100)}%`,
            }}
          />

          {cells.map((cell, idx) => {
            const lines = cell.currentCode.split('\n');
            const isErr = cell.status === 'error';
            const isRun = runningCellId === cell.id || cell.status === 'running';
            const isOk = cell.status === 'success';
            const isActive = activeCellId === cell.id || selectedCellIds.includes(cell.id);
            const previewLines = Math.min(6, Math.max(2, Math.ceil(lines.length / 8)));
            return (
              <div
                key={cell.id}
                onClick={() => jumpToCell(cell.id)}
                onMouseEnter={() => setHoveredMinimapCellId(cell.id)}
                onMouseLeave={() =>
                  setHoveredMinimapCellId((prev) => (prev === cell.id ? null : prev))
                }
                style={{ flexGrow: Math.min(Math.max(lines.length, 3), 22) }}
                className={`relative rounded-[2px] px-[2px] py-[2px] cursor-pointer flex flex-col justify-start gap-[2px] transition-colors ${
                  isErr
                    ? 'bg-[#f28b82]/30 border-l-2 border-[#f28b82]'
                    : isRun
                    ? 'bg-[#8ab4f8]/25 border-l-2 border-[#8ab4f8] animate-pulse'
                    : isOk
                    ? 'bg-[#292a2d]/60 border-l-2 border-[#81c995]'
                    : isActive
                    ? 'bg-[#303134] border-l-2 border-[#8ab4f8]'
                    : 'bg-[#252629]/60 hover:bg-[#303134]'
                }`}
              >
                {Array.from({ length: previewLines }).map((_, lIdx) => {
                  const sampleLine = lines[lIdx * 3] || lines[lIdx] || '';
                  const widthPct = Math.min(100, Math.max(25, sampleLine.trim().length * 2));
                  return (
                    <div
                      key={lIdx}
                      className={`h-[1.5px] rounded-full ${
                        isErr
                          ? 'bg-[#f28b82]/90'
                          : isRun
                          ? 'bg-[#8ab4f8]/80'
                          : cell.cellType === 'markdown'
                          ? 'bg-[#fdd663]/40'
                          : 'bg-[#9aa0a6]/45'
                      }`}
                      style={{ width: `${widthPct}%` }}
                    />
                  );
                })}

                {hoveredMinimapCellId === cell.id && (
                  <div className="absolute right-7 top-0 px-2 py-1 rounded bg-[#292a2d] border border-[#3c4043] shadow-xl text-[10px] font-mono whitespace-nowrap pointer-events-none z-50 flex items-center gap-1.5">
                    <span className="text-[#9aa0a6]">[{idx + 1}]</span>
                    <span className="text-[#e8eaed] max-w-[180px] truncate">
                      {cell.title}
                    </span>
                    {isErr && (
                      <span className="px-1 rounded bg-[#f28b82]/20 text-[#f28b82] font-semibold">
                        ERROR
                      </span>
                    )}
                    {isOk && (
                      <span className="px-1 rounded bg-[#81c995]/20 text-[#81c995]">
                        OK
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* Plot Lightbox / Zoom Modal */}
      {zoomedPlotSrc && (
        <div
          onClick={() => setZoomedPlotSrc(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-[95vw] max-h-[92vh] bg-[#202124] border border-[#3c4043] rounded-lg p-3 shadow-2xl flex flex-col gap-2"
          >
            <div className="flex items-center justify-between gap-4 px-1">
              <span className="text-xs font-mono text-[#9aa0a6]">
                Xem đồ thị phóng to (bấm Esc hoặc nền tối để thu nhỏ)
              </span>
              <button
                type="button"
                onClick={() => setZoomedPlotSrc(null)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#303134] hover:bg-[#3c4043] text-xs font-medium text-[#e8eaed] border border-[#3c4043] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Thu nhỏ / Đóng</span>
              </button>
            </div>
            <div className="overflow-auto flex items-center justify-center bg-[#18191a] rounded border border-[#292a2d] p-2">
              <img
                src={zoomedPlotSrc}
                alt="Zoomed output plot"
                className="max-w-full max-h-[80vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
      {/* Keyboard Shortcuts Cheat Sheet Modal */}
      {isShortcutsOpen && (
        <div
          onClick={() => setIsShortcutsOpen(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#202124] border border-[#3c4043] rounded-lg shadow-2xl overflow-hidden text-[#e8eaed]"
          >
            <div className="px-4 py-3 bg-[#292a2d] border-b border-[#3c4043] flex items-center justify-between">
              <span className="text-xs font-semibold font-mono text-[#8ab4f8]">
                ⌨ Phím tắt Notebook (Shortcuts)
              </span>
              <button
                type="button"
                onClick={() => setIsShortcutsOpen(false)}
                className="p-1 rounded text-[#9aa0a6] hover:text-[#e8eaed] hover:bg-[#3c4043]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-2 text-xs font-mono max-h-[70vh] overflow-y-auto custom-scrollbar">
              {[
                ['Ctrl + A', 'Chọn tất cả các cell'],
                ['Shift + Click', 'Chọn liên tiếp từ cell gốc đến cell vừa bấm'],
                ['Ctrl + Click', 'Chọn thêm / bỏ chọn từng cell riêng lẻ'],
                ['Ctrl + Shift + Click', 'Chọn thêm cả một khoảng cell vào vùng đang chọn'],
                ['Shift + ↑ / ↓', 'Mở rộng vùng chọn lên / xuống 1 cell'],
                ['Ctrl + Shift + ↑ / ↓', 'Chọn từ cell hiện tại tới đầu / cuối Notebook'],
                ['↑ / ↓', 'Di chuyển nhanh giữa các cell'],
                ['Delete / Backspace', 'Xóa tất cả các cell đang chọn'],
                ['Shift + Enter', 'Chạy cell đang chọn & nhảy xuống cell tiếp theo'],
                ['Alt + Shift + ↑ / ↓', 'Di chuyển cell đang chọn lên / xuống'],
                ['Ctrl + Shift + D', 'Nhân bản (Duplicate) cell đang chọn'],
                ['Alt + N / Alt + T', 'Thêm cell Code / Markdown ngay bên dưới'],
                ['Alt + M / Alt + C', 'Thu gọn cell đang chọn / Thu gọn tất cả'],
                ['Esc', 'Bỏ chọn nhiều cell / Đóng cửa sổ phóng to'],
                ['? hoặc Alt + /', 'Mở / Đóng bảng phím tắt này'],
              ].map(([keys, desc]) => (
                <div
                  key={keys}
                  className="flex items-center justify-between gap-3 py-1 border-b border-[#292a2d]"
                >
                  <kbd className="px-2 py-0.5 rounded bg-[#18191a] border border-[#3c4043] text-[#fdd663] shrink-0 text-[11px]">
                    {keys}
                  </kbd>
                  <span className="text-[#e8eaed] text-right text-[11px] font-sans">
                    {desc}
                  </span>
                </div>
              ))}
              <p className="text-[10px] text-[#9aa0a6] font-sans pt-1">
                Lưu ý: Các phím tắt thao tác cell (như Ctrl+A, Delete, ↑/↓) tự động nhường cho trình soạn thảo khi bạn đang gõ code bên trong ô Monaco Editor.
              </p>
            </div>
          </div>
        </div>
      )}
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
