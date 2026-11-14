import React, { useRef, useState } from 'react';
import {
  Bold,
  Code,
  Code2,
  Columns2,
  Eye,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Pencil,
  Quote,
  Sigma,
  Strikethrough,
  Table,
} from 'lucide-react';
import { renderSafeMarkdownToHtml } from '../utils/markdownRenderer';

interface MarkdownCellEditorProps {
  value: string;
  onChange: (next: string) => void;
  onFinishEdit: () => void;
  rows: number;
}

const MD_TEMPLATES: { label: string; content: string }[] = [
  {
    label: 'Ghi chú EDA & Dữ liệu',
    content: `## Phân tích dữ liệu (EDA)\n- **Số dòng / cột:** \`...\n- **Missing values:** \`...\n- **Nhận xét phân phối:** ...\n\n> [!TIP] Hướng xử lý tiếp theo: ...`,
  },
  {
    label: 'Bảng so sánh thử nghiệm',
    content: `| Mô hình | Holdout | CV Mean | Ghi chú |\n| :--- | :---: | :---: | :--- |\n| HistGradientBoosting | 0.980 | 0.976 | Baseline tốt |\n| LightGBM | 0.982 | 0.979 | Tuning depth=8 |`,
  },
  {
    label: 'Callout / Cảnh báo [!WARNING]',
    content: `> [!WARNING] Lưu ý Data Leakage: Kiểm tra kỹ các cột ID hoặc cột tạo sau thời điểm dự đoán trước khi train.`,
  },
  {
    label: 'Checklist công việc',
    content: `### Checklist Pipeline\n- [x] Kiểm tra missing & outliers\n- [ ] Thử nghiệm Feature Engineering\n- [ ] So sánh 4 mô hình (Auto-Tournament)\n- [ ] Xuất file submission.csv`,
  },
];

export const MarkdownCellEditor: React.FC<MarkdownCellEditorProps> = ({
  value,
  onChange,
  onFinishEdit,
  rows,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);

  const wrapSelection = (before: string, after: string, placeholder: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const selStart = start + before.length;
      el.setSelectionRange(selStart, selStart + selected.length);
    });
  };

  const insertLinePrefix = (prefix: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + prefix.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const insertBlock = (block: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const needsLeadingNewline = start > 0 && value[start - 1] !== '\n' ? '\n\n' : '';
    const needsTrailingNewline = end < value.length && value[end] !== '\n' ? '\n' : '';
    const insertion = needsLeadingNewline + block + needsTrailingNewline;
    const next = value.slice(0, start) + insertion + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + insertion.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.shiftKey && e.key === 'Enter') {
      e.preventDefault();
      onFinishEdit();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      wrapSelection('**', '**', 'bold text');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      wrapSelection('*', '*', 'italic text');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      wrapSelection('[', '](https://)', 'link text');
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = value.slice(0, start) + '  ' + value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        el.setSelectionRange(start + 2, start + 2);
      });
    }
  };

  const btnCls =
    'p-1.5 rounded hover:bg-white/[0.08] text-[#9aa0a6] hover:text-[#e8eaed] transition-colors shrink-0';

  return (
    <div className="flex flex-col">
      {/* Colab / Kaggle-style Formatting Toolbar */}
      <div className="px-2.5 py-1 bg-[#1b1c20] border-b border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-0.5 flex-wrap">
          <button
            type="button"
            onClick={() => insertLinePrefix('# ')}
            className={btnCls}
            title="Heading 1 (# )"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertLinePrefix('## ')}
            className={btnCls}
            title="Heading 2 (## )"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertLinePrefix('### ')}
            className={btnCls}
            title="Heading 3 (### )"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-3.5 bg-white/[0.08] mx-1" />

          <button
            type="button"
            onClick={() => wrapSelection('**', '**', 'in đậm')}
            className={btnCls}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => wrapSelection('*', '*', 'in nghiêng')}
            className={btnCls}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => wrapSelection('~~', '~~', 'gạch ngang')}
            className={btnCls}
            title="Strikethrough (~~text~~)"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => wrapSelection('`', '`', 'code')}
            className={btnCls}
            title="Inline Code (`code`)"
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-3.5 bg-white/[0.08] mx-1" />

          <button
            type="button"
            onClick={() => wrapSelection('[', '](https://)', 'tên liên kết')}
            className={btnCls}
            title="Chèn Link (Ctrl+K)"
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => wrapSelection('![', '](https://)', 'mô tả ảnh')}
            className={btnCls}
            title="Chèn Ảnh (![alt](url))"
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-3.5 bg-white/[0.08] mx-1" />

          <button
            type="button"
            onClick={() => insertLinePrefix('- ')}
            className={btnCls}
            title="Danh sách gạch đầu dòng (- )"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertLinePrefix('1. ')}
            className={btnCls}
            title="Danh sách đánh số (1. )"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertLinePrefix('- [ ] ')}
            className={btnCls}
            title="Checklist (- [ ] )"
          >
            <ListChecks className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-3.5 bg-white/[0.08] mx-1" />

          <button
            type="button"
            onClick={() => insertLinePrefix('> ')}
            className={btnCls}
            title="Trích dẫn (> quote)"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertBlock('```python\n# code\n```')}
            className={btnCls}
            title="Code Block (```python)"
          >
            <Code2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() =>
              insertBlock('| Cột 1 | Cột 2 | Cột 3 |\n| :--- | :---: | ---: |\n| A | 0.95 | 100 |')
            }
            className={btnCls}
            title="Chèn Bảng (GFM Table)"
          >
            <Table className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => wrapSelection('$$ ', ' $$', 'RMSE = \\sqrt{\\frac{1}{n}\\sum (y_i - \\hat{y}_i)^2}')}
            className={btnCls}
            title="Công thức Toán / LaTeX ($$ ... $$)"
          >
            <Sigma className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertBlock('---')}
            className={btnCls}
            title="Đường kẻ ngang (---)"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Quick Templates Dropdown */}
          <div className="relative ml-1">
            <button
              type="button"
              onClick={() => setTemplateMenuOpen((o) => !o)}
              className="px-2 py-0.5 rounded text-[10px] font-mono border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-[#bdc1c6] hover:text-[#e8eaed] transition-colors"
              title="Chèn nhanh mẫu ghi chú ML / Kaggle"
            >
              Mẫu ▾
            </button>
            {templateMenuOpen && (
              <div className="absolute left-0 top-full mt-1 w-56 rounded-md border border-[#3c4043] bg-[#25272d] shadow-xl py-1 z-40">
                {MD_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.label}
                    type="button"
                    onClick={() => {
                      insertBlock(tpl.content);
                      setTemplateMenuOpen(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-[11px] text-[#e8eaed] hover:bg-[#35363a]"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* View Mode Switcher: Split / Edit / Preview */}
        <div className="flex items-center bg-[#16171a] p-0.5 rounded-md border border-white/[0.08] text-[10px]">
          <button
            type="button"
            onClick={() => setViewMode('edit')}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
              viewMode === 'edit' ? 'bg-[#303134] text-[#e8eaed]' : 'text-[#9aa0a6] hover:text-[#e8eaed]'
            }`}
            title="Chỉ hiện khung viết Markdown"
          >
            <Pencil className="w-2.5 h-2.5" />
            <span className="hidden sm:inline">Edit</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
              viewMode === 'split' ? 'bg-[#303134] text-[#8ab4f8]' : 'text-[#9aa0a6] hover:text-[#e8eaed]'
            }`}
            title="Chia đôi: Viết & Xem trước song song"
          >
            <Columns2 className="w-2.5 h-2.5" />
            <span className="hidden sm:inline">Split</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
              viewMode === 'preview' ? 'bg-[#303134] text-[#81c995]' : 'text-[#9aa0a6] hover:text-[#e8eaed]'
            }`}
            title="Chỉ xem trước"
          >
            <Eye className="w-2.5 h-2.5" />
            <span className="hidden sm:inline">Preview</span>
          </button>
        </div>
      </div>

      {/* Editor / Preview Panes */}
      <div
        className={`grid ${
          viewMode === 'split'
            ? 'grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/[0.08]'
            : 'grid-cols-1'
        }`}
      >
        {viewMode !== 'preview' && (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={rows}
            placeholder="Viết Markdown tại đây (hỗ trợ # Tiêu đề, **Đậm**, *Nghiêng*, | Bảng |, - [x] Checklist, $Toán$, > [!TIP] Callout)..."
            className="w-full p-3 bg-[#16171a] text-xs font-mono text-[#e8eaed] focus:outline-none resize-y leading-relaxed"
          />
        )}
        {viewMode !== 'edit' && (
          <div
            className="p-3 bg-[#1e1f23] overflow-x-auto min-h-[110px]"
            dangerouslySetInnerHTML={{
              __html: renderSafeMarkdownToHtml(value),
            }}
          />
        )}
      </div>
    </div>
  );
};
