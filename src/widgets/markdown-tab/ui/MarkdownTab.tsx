import { useMemo } from "react";
import md from "../../../docs/typo.md?raw";

const imageUrlMap = import.meta.glob("../../../docs/images/*", {
  eager: true,
  as: "url",
}) as Record<string, string>;

const MarkdownTab = () => {
  const html = useMemo(() => {
    const escapeHtml = (s: string) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const extractFenced = (input: string) => {
      const blocks: { ph: string; html: string }[] = [];
      let i = 0;
      const text = input.replace(
        /(\n|^)\s*```([^\n]*)\n([\s\S]*?)\n\s*```/g,
        (_m, lead, langDecl, code) => {
          const lang = (langDecl || "").trim();
          const safe = escapeHtml(code);
          const cls = lang ? ` class="language-${lang}"` : "";
          const html = `<pre><code${cls}>${safe}</code></pre>`;
          const ph = `@@CODE_${i++}@@`;
          blocks.push({ ph, html });
          return `${lead}${ph}`;
        }
      );
      return { text, blocks };
    };

    const { text: withoutCode, blocks } = extractFenced(md);
    let out = withoutCode;

    const codeToken = (idx: number) => `§§CODE${idx}§§`;
    const codeMap: Record<number, string> = {};
    blocks.forEach((b, idx) => {
      out = out.replace(b.ph, codeToken(idx));
      codeMap[idx] = b.html;
    });

    out = out.replace(/@@CODE_?(\d+)@@/g, (_m, nStr) => {
      const n = Number(nStr);
      const idx = Number.isFinite(n) ? n : 0;
      return codeToken(codeMap[idx] ? idx : codeMap[idx - 1] ? idx - 1 : idx);
    });

    out = out.replace(
      /^######\s+(.+)$/gm,
      (_m, t) => `<h6 id="${encodeURIComponent(t)}">${t}</h6>`
    );
    out = out.replace(
      /^#####\s+(.+)$/gm,
      (_m, t) => `<h5 id="${encodeURIComponent(t)}">${t}</h5>`
    );
    out = out.replace(
      /^####\s+(.+)$/gm,
      (_m, t) => `<h4 id="${encodeURIComponent(t)}">${t}</h4>`
    );
    out = out.replace(
      /^###\s+(.+)$/gm,
      (_m, t) => `<h3 id="${encodeURIComponent(t)}">${t}</h3>`
    );
    out = out.replace(
      /^##\s+(.+)$/gm,
      (_m, t) => `<h2 id="${encodeURIComponent(t)}">${t}</h2>`
    );
    out = out.replace(
      /^#\s+(.+)$/gm,
      (_m, t) => `<h1 id="${encodeURIComponent(t)}">${t}</h1>`
    );

    out = out.replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gm, "<hr/>");

    out = out.replace(/^(>\s?.+(?:\n>.*)*)/gm, (block) => {
      const cleaned = block.replace(/^>\s?/gm, "").trim();
      return `<blockquote><p>${cleaned}</p></blockquote>`;
    });

    out = out.replace(
      /(^\|.+\|\s*$\n^\|(?:\s*:?[-=]+:?\s*\|)+\s*$\n(?:^\|.*\|\s*$\n?)*)/gm,
      (tableBlock) => {
        const lines = tableBlock.trim().split(/\n/);
        if (lines.length < 2) return tableBlock;
        const header = lines[0];
        const rows = lines.slice(2);
        const toCells = (line: string) =>
          line
            .replace(/^\||\|$/g, "")
            .split(/\|/)
            .map((c) => c.trim());
        const ths = toCells(header)
          .map((c) => `<th>${c}</th>`)
          .join("");
        const trs = rows
          .filter((l) => /^\|.*\|$/.test(l))
          .map(
            (r) =>
              `<tr>${toCells(r)
                .map((c) => `<td>${c}</td>`)
                .join("")}</tr>`
          )
          .join("");
        return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
      }
    );

    out = out.replace(/^(?:[-*]\s+.+(?:\n|$))+?/gm, (block) => {
      const items = block
        .trim()
        .split(/\n/)
        .map((l) => l.replace(/^[-*]\s+/, "").trim())
        .map((t) => `<li>${t}</li>`)
        .join("");
      return `<ul>${items}</ul>`;
    });
    out = out.replace(/^(?:\d+\.\s+.+(?:\n|$))+?/gm, (block) => {
      const items = block
        .trim()
        .split(/\n/)
        .map((l) => l.replace(/^\d+\.\s+/, "").trim())
        .map((t) => `<li>${t}</li>`)
        .join("");
      return `<ol>${items}</ol>`;
    });

    out = out.replace(
      /!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]+)")?\)/g,
      (_m, alt, src, title) => {
        let resolved = src;
        if (src.startsWith("./images/")) {
          const candidate = `./docs${src.slice(1)}`;
          resolved = imageUrlMap[candidate] || src;
        } else {
          const fileName = src.split("/").pop() || src;
          const candidate = `./docs/images/${fileName}`;
          resolved = imageUrlMap[candidate] || src;
        }
        const titleAttr = title ? ` title="${title}"` : "";
        return `<img src="${resolved}" alt="${alt}"${titleAttr} />`;
      }
    );

    out = out.replace(
      /\[([^\]]+)\]\(([^\s)]+)(?:\s+"([^"]+)")?\)/g,
      (_m, text, href, title) => {
        const titleAttr = title ? ` title="${title}"` : "";
        return `<a href="${href}"${titleAttr} target="_blank" rel="noreferrer noopener">${text}</a>`;
      }
    );

    const applyInline = (txt: string) =>
      txt
        .replace(/`([^`]+)`/g, (_m, code) => `<code>${code}</code>`)
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/__([^_]+)__/g, "<strong>$1</strong>")
        .replace(/\*([^*]+)\*/g, "<em>$1</em>")
        .replace(/_([^_]+)_/g, "<em>$1</em>");
    out = out
      .split(/(<[^>]+>)/g)
      .map((chunk) => (chunk.startsWith("<") ? chunk : applyInline(chunk)))
      .join("");

    const parts = out.split(/\n\s*\n/).map((chunk) => {
      const isBlock = /<(h\d|ul|ol|pre|table|blockquote|hr|img|p|code)\b/.test(
        chunk
      );
      if (isBlock) return chunk;
      const wrapped = chunk
        .split(/\n/)
        .map((line) => (line.trim() ? `<p>${line}</p>` : ""))
        .join("");
      return wrapped;
    });

    let result = parts.join("\n");

    result = result.replace(/§§CODE(\d+)§§/g, (_m, nStr) => {
      const idx = Number(nStr);
      return codeMap[idx] ?? _m;
    });

    return result;
  }, []);

  return (
    <div className="panel" aria-label="Markdown" tabIndex={0}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <strong>Документация</strong>
      </div>
      <div className="md-preview" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
};

export default MarkdownTab;
