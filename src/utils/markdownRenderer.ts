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
  // Inline code
  out = out.replace(
    /`([^`]+)`/g,
    '<code class="px-1 py-0.5 rounded bg-[#292a2d] text-[#8ab4f8] font-mono text-[11px]">$1</code>'
  );
  // Bold
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
  // Italic
  out = out.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');
  // Safe Links (http/https only)
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer" class="text-[#8ab4f8] underline">$1</a>'
  );
  return out;
}

export function renderSafeMarkdownToHtml(markdown: string): string {
  const lines = markdown.split('\n');
  const htmlBlocks: string[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (!inTable || tableRows.length === 0) return;
    inTable = false;
    const header = tableRows[0];
    const sepRegex = new RegExp('^[\\s:-]+$');
    const body = tableRows.slice(1).filter((r) => !r.every((c) => sepRegex.test(c)));
    let tbl =
      '<div class="overflow-x-auto my-2"><table class="w-full text-left border-collapse text-xs font-mono border border-[#3c4043]">';
    tbl += '<thead class="bg-[#292a2d] border-b border-[#3c4043]"><tr>';
    for (const h of header) {
      tbl += `<th class="px-2.5 py-1.5 font-medium text-[#e8eaed] border-r border-[#3c4043]">${formatInlineMarkdown(
        h.trim()
      )}</th>`;
    }
    tbl += '</tr></thead><tbody class="divide-y divide-[#292a2d]">';
    for (const row of body) {
      tbl += '<tr>';
      for (const cell of row) {
        tbl += `<td class="px-2.5 py-1 text-[#e8eaed] border-r border-[#292a2d]">${formatInlineMarkdown(
          cell.trim()
        )}</td>`;
      }
      tbl += '</tr>';
    }
    tbl += '</tbody></table></div>';
    htmlBlocks.push(tbl);
    tableRows = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');

    if (line.trim().startsWith('```')) {
      flushTable();
      if (inCodeBlock) {
        htmlBlocks.push(
          `<pre class="my-2 p-2.5 rounded bg-[#18191a] border border-[#3c4043] font-mono text-xs text-[#e8eaed] overflow-x-auto">${escapeHtml(
            codeLines.join('\n')
          )}</pre>`
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // GFM Table detection
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      inTable = true;
      const cells = line
        .trim()
        .slice(1, -1)
        .split('|');
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (!line.trim()) {
      htmlBlocks.push('<div class="h-1.5"></div>');
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      htmlBlocks.push(
        `<h3 class="text-xs font-bold text-white mt-2 mb-1">${formatInlineMarkdown(
          line.slice(4)
        )}</h3>`
      );
    } else if (line.startsWith('## ')) {
      htmlBlocks.push(
        `<h2 class="text-sm font-bold text-white mt-2.5 mb-1 border-b border-[#3c4043] pb-1">${formatInlineMarkdown(
          line.slice(3)
        )}</h2>`
      );
    } else if (line.startsWith('# ')) {
      htmlBlocks.push(
        `<h1 class="text-base font-bold text-white mt-2 mb-1.5 border-b border-[#3c4043] pb-1">${formatInlineMarkdown(
          line.slice(2)
        )}</h1>`
      );
    } else if (line.startsWith('> ')) {
      htmlBlocks.push(
        `<blockquote class="pl-3 border-l-2 border-[#8ab4f8] text-[#9aa0a6] italic my-1 text-xs">${formatInlineMarkdown(
          line.slice(2)
        )}</blockquote>`
      );
    } else if (/^[-*]\s+\[[ xX]\]\s+/.test(line.trim())) {
      const checked = /^[-*]\s+\[[xX]\]/.test(line.trim());
      const content = line.trim().replace(/^[-*]\s+\[[ xX]\]\s+/, '');
      htmlBlocks.push(
        `<div class="flex items-center gap-2 text-xs my-0.5"><input type="checkbox" disabled ${
          checked ? 'checked' : ''
        } class="accent-[#8ab4f8]" /><span>${formatInlineMarkdown(content)}</span></div>`
      );
    } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      htmlBlocks.push(
        `<div class="flex items-start gap-2 text-xs my-0.5 pl-2"><span class="text-[#9aa0a6]">•</span><span>${formatInlineMarkdown(
          line.trim().slice(2)
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
