import React, { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

export interface CommandPaletteAction {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  onSelect: () => void;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  actions: CommandPaletteAction[];
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  actions,
}) => {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = actions.filter((a) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      a.label.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && filtered[activeIdx]) {
      e.preventDefault();
      filtered[activeIdx].onSelect();
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-[1px] flex items-start justify-center pt-[14vh] px-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        className="w-full max-w-lg rounded-lg border border-[#3c4043] bg-[#202124] text-[#e8eaed] shadow-2xl overflow-hidden"
      >
        <div className="px-3.5 py-2.5 bg-[#18191a] border-b border-[#3c4043] flex items-center gap-2.5">
          <Search className="w-4 h-4 text-[#8ab4f8] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            placeholder="Gõ lệnh nhanh (VD: Arena, Auto, Report, Pip, AI, Tab...)"
            className="flex-1 bg-transparent text-xs text-[#e8eaed] focus:outline-none placeholder:text-[#5f6368]"
          />
          <button
            type="button"
            onClick={onClose}
            className="text-[#9aa0a6] hover:text-[#e8eaed]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto py-1 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-[#9aa0a6]">
              Không tìm thấy lệnh phù hợp.
            </div>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => {
                  item.onSelect();
                  onClose();
                }}
                className={`w-full px-3.5 py-2 flex items-center justify-between text-left text-xs transition-colors ${
                  idx === activeIdx
                    ? 'bg-[#303134] text-[#8ab4f8]'
                    : 'text-[#e8eaed] hover:bg-[#292a2d]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="px-1.5 py-0.5 rounded bg-[#18191a] border border-[#3c4043] text-[10px] font-mono text-[#9aa0a6] shrink-0">
                    {item.category}
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>
                {item.shortcut && (
                  <span className="text-[10px] font-mono text-[#9aa0a6] shrink-0 ml-2">
                    {item.shortcut}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
