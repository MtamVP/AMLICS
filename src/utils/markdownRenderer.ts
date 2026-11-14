function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatInlineMarkdown(text: string): string {
  let out = escapeHtml(text);

  // Protect inline code spans first so markdown markers inside `...` aren't parsed
  const codePlaceholders: string[] = [];
  out = out.replace(/`([^`]+)`/g, (_m, code) => {
    const idx = codePlaceholders.length;
    codePlaceholders.push(
      `<code class="px-1.5 py-0.5 rounded bg-white/[0.07] text-[#8ab4f8] font-mono text-[11px]">${code}</code>`
    );
    return `\u0000CODE${idx}\u0000`;
  });

  // Inline LaTeX-style math ($...$)
  out = out.replace(
    /\$([^$\n]+)\$/g,
    '<span class="px-1 py-0.5 rounded bg-[#8ab4f8]/10 text-[#aecbfa] font-serif italic text-[12px]">$1</span>'
  );

  // Safe Images: ![alt](https://...) or ![alt](data:image/...)
  out = out.replace(
    /!\[([^\]]*)\]\(((?:https?:\/\/|data:image\/)[^\s)]+)\)/g,
    '<img src="$2" alt="$1" class="max-w-full rounded-md border border-white/[0.08] my-2 max-h-80 object-contain" />'
  );

  // Safe Links (http/https only)
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer" class="text-[#8ab4f8] hover:underline">$1</a>'
  );

  // Strikethrough
  out = out.replace(/~~([^~]+)~~/g, '<del class="line-through text-[#9aa0a6]">$1</del>');

  // Bold (**text** or __text__)
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
  out = out.replace(/__([^_]+)__/g, '<strong class="text-white font-semibold">$1</strong>');

  // Italic (*text* or _text_)
  out = out.replace(/\*([^*]+)\*/g, '<em class="italic text-[#e8eaed]">$1</em>');
  out = out.replace(/(^|\s)_([^_]+)_(\s|$)/g, '$1<em class="italic text-[#e8eaed]">$2</em>$3');

  // Restore inline code spans
  out = out.replace(/\u0000CODE(\d+)\u0000/g, (_m, idx) => codePlaceholders[Number(idx)] || '');

  return out;
}

export function renderSafeMarkdownToHtml(markdown: string): string {
  const lines = markdown.split('\n');
  const htmlBlocks: string[] = [];
  let inCodeBlock = false;
  let codeLang = '';
  let codeLines: string[] = [];
  let inMathBlock = false;
  let mathLines: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (!inTable || tableRows.length === 0) return;
    inTable = false;
    const header = tableRows[0];
    const sepRegex = new RegExp('^[\\s:-]+$');
    const sepRow = tableRows[1];
    const alignments: ('left' | 'center' | 'right')[] = header.map((_, idx) => {
      const cell = (sepRow?.[idx] || '').trim();
      if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
      if (cell.endsWith(':')) return 'right';
      return 'left';
    });
    const body = tableRows.slice(1).filter((r) => !r.every((c) => sepRegex.test(c)));
    let tbl =
      '<div class="overflow-x-auto my-2 rounded-md border border-white/[0.08]"><table class="w-full text-left border-collapse text-xs">';
    tbl += '<thead class="bg-[#25272d] border-b border-white/[0.08]"><tr>';
    header.forEach((h, idx) => {
      const alignCls =
        alignments[idx] === 'center'
          ? 'text-center'
          : alignments[idx] === 'right'
          ? 'text-right'
          : 'text-left';
      tbl += `<th class="px-3 py-1.5 font-semibold text-[#e8eaed] border-r last:border-r-0 border-white/[0.06] ${alignCls}">${formatInlineMarkdown(
        h.trim()
      )}</th>`;
    });
    tbl += '</tr></thead><tbody class="divide-y divide-white/[0.06]">';
    for (const row of body) {
      tbl += '<tr class="hover:bg-white/[0.02]">';
      row.forEach((cell, idx) => {
        const alignCls =
          alignments[idx] === 'center'
            ? 'text-center'
            : alignments[idx] === 'right'
            ? 'text-right'
            : 'text-left';
        tbl += `<td class="px-3 py-1.5 text-[#e8eaed]/90 border-r last:border-r-0 border-white/[0.05] ${alignCls}">${formatInlineMarkdown(
          cell.trim()
        )}</td>`;
      });
      tbl += '</tr>';
    }
    tbl += '</tbody></table></div>';
    htmlBlocks.push(tbl);
    tableRows = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    const trimmed = line.trim();

    // Fenced code blocks ```lang
    if (trimmed.startsWith('```')) {
      flushTable();
      if (inCodeBlock) {
        const langBadge = codeLang
          ? `<div class="px-3 py-1 bg-[#25272d] border-b border-white/[0.06] text-[10px] font-mono text-[#9aa0a6] uppercase tracking-wider">${escapeHtml(
              codeLang
            )}</div>`
          : '';
        htmlBlocks.push(
          `<div class="my-2 rounded-md border border-white/[0.08] bg-[#16171a] overflow-hidden">${langBadge}<pre class="p-3 font-mono text-xs text-[#e8eaed] overflow-x-auto leading-relaxed">${escapeHtml(
            codeLines.join('\n')
          )}</pre></div>`
        );
        codeLines = [];
        codeLang = '';
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLang = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Display math blocks $$...$$
    if (trimmed === '$$') {
      flushTable();
      if (inMathBlock) {
        htmlBlocks.push(
          `<div class="my-2 px-4 py-2.5 rounded-md bg-[#8ab4f8]/[0.06] border border-[#8ab4f8]/20 text-center font-serif italic text-sm text-[#aecbfa] overflow-x-auto">${escapeHtml(
            mathLines.join(' ')
          )}</div>`
        );
        mathLines = [];
        inMathBlock = false;
      } else {
        inMathBlock = true;
      }
      continue;
    }

    if (inMathBlock) {
      mathLines.push(line);
      continue;
    }

    // Single-line display math $$ ... $$
    if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4) {
      flushTable();
      htmlBlocks.push(
        `<div class="my-2 px-4 py-2.5 rounded-md bg-[#8ab4f8]/[0.06] border border-[#8ab4f8]/20 text-center font-serif italic text-sm text-[#aecbfa] overflow-x-auto">${escapeHtml(
          trimmed.slice(2, -2).trim()
        )}</div>`
      );
      continue;
    }

    // GFM Table detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      const cells = trimmed.slice(1, -1).split('|');
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (!trimmed) {
      htmlBlocks.push('<div class="h-1.5"></div>');
      continue;
    }

    // Horizontal Rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      htmlBlocks.push('<hr class="my-3 border-t border-white/[0.1]" />');
      continue;
    }

    // Headings (# .. ####)
    if (line.startsWith('#### ')) {
      htmlBlocks.push(
        `<h4 class="text-xs font-semibold text-[#e8eaed] mt-2 mb-1">${formatInlineMarkdown(
          line.slice(5)
        )}</h4>`
      );
    } else if (line.startsWith('### ')) {
      htmlBlocks.push(
        `<h3 class="text-[13px] font-bold text-white mt-2.5 mb-1">${formatInlineMarkdown(
          line.slice(4)
        )}</h3>`
      );
    } else if (line.startsWith('## ')) {
      htmlBlocks.push(
        `<h2 class="text-sm font-bold text-white mt-3 mb-1.5 border-b border-white/[0.08] pb-1">${formatInlineMarkdown(
          line.slice(3)
        )}</h2>`
      );
    } else if (line.startsWith('# ')) {
      htmlBlocks.push(
        `<h1 class="text-base font-bold text-white mt-2.5 mb-2 border-b border-white/[0.1] pb-1.5">${formatInlineMarkdown(
          line.slice(2)
        )}</h1>`
      );
    } else if (line.startsWith('> ')) {
      const content = line.slice(2).trim();
      const alertMatch = content.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/i);
      if (alertMatch) {
        const kind = alertMatch[1].toUpperCase();
        const rest = alertMatch[2];
        const palette: Record<string, { border: string; bg: string; text: string }> = {
          NOTE: { border: 'border-[#8ab4f8]', bg: 'bg-[#8ab4f8]/10', text: 'text-[#8ab4f8]' },
          TIP: { border: 'border-[#81c995]', bg: 'bg-[#81c995]/10', text: 'text-[#81c995]' },
          IMPORTANT: { border: 'border-[#c58af9]', bg: 'bg-[#c58af9]/10', text: 'text-[#c58af9]' },
          WARNING: { border: 'border-[#fdd663]', bg: 'bg-[#fdd663]/10', text: 'text-[#fdd663]' },
          CAUTION: { border: 'border-[#f28b82]', bg: 'bg-[#f28b82]/10', text: 'text-[#f28b82]' },
        };
        const p = palette[kind] || palette.NOTE;
        htmlBlocks.push(
          `<div class="my-1.5 px-3 py-2 rounded-r-md border-l-2 ${p.border} ${p.bg} text-xs"><span class="font-semibold ${p.text} mr-1.5">${kind}:</span><span class="text-[#e8eaed]">${formatInlineMarkdown(
            rest
          )}</span></div>`
        );
      } else {
        htmlBlocks.push(
          `<blockquote class="pl-3 border-l-2 border-[#8ab4f8]/60 text-[#bdc1c6] italic my-1.5 text-xs">${formatInlineMarkdown(
            line.slice(2)
          )}</blockquote>`
        );
      }
    } else if (/^[-*]\s+\[[ xX]\]\s+/.test(trimmed)) {
      const checked = /^[-*]\s+\[[xX]\]/.test(trimmed);
      const content = trimmed.replace(/^[-*]\s+\[[ xX]\]\s+/, '');
      htmlBlocks.push(
        `<div class="flex items-center gap-2 text-xs my-0.5"><input type="checkbox" disabled ${
          checked ? 'checked' : ''
        } class="accent-[#8ab4f8]" /><span class="${
          checked ? 'line-through text-[#9aa0a6]' : 'text-[#e8eaed]'
        }">${formatInlineMarkdown(content)}</span></div>`
      );
    } else if (/^\d+\.\s+/.test(trimmed)) {
      const numMatch = trimmed.match(/^(\d+\.)\s+(.*)$/);
      if (numMatch) {
        htmlBlocks.push(
          `<div class="flex items-start gap-2 text-xs my-0.5 pl-1"><span class="font-mono text-[#8ab4f8] shrink-0">${
            numMatch[1]
          }</span><span class="text-[#e8eaed] leading-relaxed">${formatInlineMarkdown(
            numMatch[2]
          )}</span></div>`
        );
      }
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const indent = line.search(/\S/);
      const padCls = indent >= 2 ? 'pl-5' : 'pl-2';
      htmlBlocks.push(
        `<div class="flex items-start gap-2 text-xs my-0.5 ${padCls}"><span class="text-[#9aa0a6]">•</span><span class="text-[#e8eaed] leading-relaxed">${formatInlineMarkdown(
          trimmed.slice(2)
        )}</span></div>`
      );
    } else {
      htmlBlocks.push(
        `<p class="text-xs text-[#e8eaed] leading-relaxed my-0.5">${formatInlineMarkdown(
          line
        )}</p>`
      );
    }
  }

  flushTable();
  return htmlBlocks.join('\n');
}
