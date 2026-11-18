// Renderer Markdown XSS-safe bersama untuk halaman chat mahasiswa & admin.
function escapeHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Buang sintaks LaTeX agar rumus tampil sebagai teks biasa yang bersih.
function cleanLatex(text) {
  return String(text || "")
    .replace(/\$\$([\s\S]*?)\$\$/g, "$1")
    .replace(/\$([^$\n]+)\$/g, "$1")
    .replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1 / $2)")
    .replace(/\\times/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\left|\\right/g, "")
    .replace(/\\text\s*\{([^{}]*)\}/g, "$1")
    .replace(/\\[a-zA-Z]+/g, "");
}

function inlineFormat(text) {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-zinc-100 text-[0.85em] text-indigo-700">$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  // Link markdown [judul](url) — hanya skema http/https yang diizinkan.
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-600 underline underline-offset-2 break-all hover:text-indigo-700">$1</a>');
  // URL telanjang
  out = out.replace(/(^|[\s(])((?:https?:\/\/)[^\s<)]+)/g,
    '$1<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-600 underline underline-offset-2 break-all hover:text-indigo-700">$2</a>');
  // Email
  out = out.replace(/(^|[\s(])([\w.+-]+@[\w-]+\.[\w.-]+)/g,
    '$1<a href="mailto:$2" class="text-indigo-600 underline underline-offset-2 break-all hover:text-indigo-700">$2</a>');
  return out;
}

function isTableRow(line) {
  const t = line.trim();
  return t.startsWith("|") && t.endsWith("|") && t.length > 2;
}

function isTableSeparator(line) {
  return /^\|[\s:|-]+\|$/.test(line.trim()) && line.includes("-");
}

function parseTableCells(line) {
  const t = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells = [];
  let buf = "";
  for (let i = 0; i < t.length; i++) {
    if (t[i] === "\\" && t[i + 1] === "|") { buf += "|"; i++; continue; }
    if (t[i] === "|") { cells.push(buf.trim()); buf = ""; continue; }
    buf += t[i];
  }
  cells.push(buf.trim());
  return cells;
}

function formatMarkdown(raw) {
  const lines = cleanLatex(raw).replace(/\r\n?/g, "\n").split("\n");
  const html = [];
  let listType = null;

  function closeLists() {
    if (listType) { html.push(listType === "ol" ? "</ol>" : "</ul>"); listType = null; }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Tabel responsif
    if (isTableRow(line) && isTableSeparator(lines[i + 1] || "")) {
      closeLists();
      const headers = parseTableCells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) { rows.push(parseTableCells(lines[i])); i++; }
      i--;
      let tbl = '<div class="my-3 overflow-x-auto rounded-xl border border-zinc-200"><table class="min-w-full text-left text-xs sm:text-sm"><thead class="bg-zinc-50"><tr>';
      headers.forEach((h) => { tbl += '<th class="px-3 py-2 font-semibold text-zinc-700 whitespace-nowrap">' + inlineFormat(h) + "</th>"; });
      tbl += '</tr></thead><tbody class="divide-y divide-zinc-100">';
      rows.forEach((r) => {
        tbl += '<tr class="align-top">';
        for (let c = 0; c < headers.length; c++) {
          tbl += '<td class="px-3 py-2 text-zinc-600">' + inlineFormat(r[c] || "") + "</td>";
        }
        tbl += "</tr>";
      });
      tbl += "</tbody></table></div>";
      html.push(tbl);
      continue;
    }

    if (trimmed === "") { closeLists(); continue; }

    const heading = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      closeLists();
      const size = ["text-base", "text-[15px]", "text-sm", "text-sm"][heading[1].length - 1];
      html.push('<p class="' + size + ' font-semibold text-zinc-900 mt-3 mb-1">' + inlineFormat(heading[2]) + "</p>");
      continue;
    }

    const ordered = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
    if (ordered) {
      if (listType !== "ol") { closeLists(); html.push('<ol class="list-decimal pl-5 my-2 space-y-1">'); listType = "ol"; }
      html.push('<li class="pl-0.5">' + inlineFormat(ordered[2]) + "</li>");
      continue;
    }

    const bullet = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bullet) {
      if (listType !== "ul") { closeLists(); html.push('<ul class="list-disc pl-5 my-2 space-y-1">'); listType = "ul"; }
      html.push('<li class="pl-0.5">' + inlineFormat(bullet[1]) + "</li>");
      continue;
    }

    closeLists();
    html.push('<p class="my-1.5 leading-relaxed">' + inlineFormat(trimmed) + "</p>");
  }

  closeLists();
  return html.join("");
}
