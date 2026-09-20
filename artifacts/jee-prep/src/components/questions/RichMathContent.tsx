import React, { useMemo, useEffect } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import mathjaxDefs from "@/data/pyq/mathjax-defs.html?raw";

// Inject the global MathJax SVG font cache into the document so all SVG glyphs (#MJX-TEX-...) render
function ensureMathJaxDefs() {
  if (typeof document === "undefined") return;
  const existing = document.getElementById("MJX-SVG-global-cache");
  if (!existing) {
    const container = document.createElement("div");
    container.style.display = "none";
    container.innerHTML = mathjaxDefs;
    if (container.firstElementChild) {
      document.body.prepend(container.firstElementChild);
    }
  } else {
    const defsContent = mathjaxDefs.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
    if (!existing.innerHTML.includes("MJX-TEX-S4-23A1")) {
      existing.innerHTML = defsContent;
    }
  }
}

// Run immediately at module evaluation
ensureMathJaxDefs();

function decodeMathEntities(str: string) {
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

interface RichMathContentProps {
  content?: string | null;
  className?: string;
  compact?: boolean;
}

export function RichMathContent({ content, className = "", compact = false }: RichMathContentProps) {
  useEffect(() => {
    ensureMathJaxDefs();
  }, []);

  const processedHtml = useMemo(() => {
    if (!content) return "";

    let html = content;

    // 0. Remove empty paragraphs, consecutive line breaks, and trailing spaces that create huge gaps
    html = html
      .replace(/<p>\s*(?:&nbsp;|\s|<br\s*\/?>)*\s*<\/p>/gi, "")
      .replace(/(?:<br\s*\/?>\s*){3,}/gi, "<br/><br/>")
      .replace(/<p>\s*<\/p>/gi, "");

    // 0.1 Fix MathJax table frames & lines from turning into solid black blocks
    html = html.replace(/<rect([^>]*)(?:class=["']mjx-solid["']|data-frame=["']true["'])([^>]*)>/gi, '<rect$1class="mjx-solid" data-frame="true" fill="none" stroke="currentColor" stroke-width="70"$2>');

    // 1. Fix CDN image URLs if relative
    html = html.replace(/src=["']\/([^"']+)["']/g, 'src="https://questions.examside.com/$1"');
    html = html.replace(/src=["']\/\/([^"']+)["']/g, 'src="https://$1"');

    // 2. Ensure modern SVG href is set alongside xlink:href for full cross-browser SVG compatibility
    html = html.replace(/xlink:href=["'](#MJX-TEX-[^"']+)["']/g, 'xlink:href="$1" href="$1"');

    // 3. Render block math \[ ... \]
    html = html.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
      try {
        return katex.renderToString(decodeMathEntities(math.trim()), { displayMode: true, throwOnError: false });
      } catch {
        return `\\[${math}\\]`;
      }
    });

    // 4. Render block math $$ ... $$
    html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
      try {
        return katex.renderToString(decodeMathEntities(math.trim()), { displayMode: true, throwOnError: false });
      } catch {
        return `$$${math}$$`;
      }
    });

    // 5. Render inline math \( ... \)
    html = html.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => {
      try {
        return katex.renderToString(decodeMathEntities(math.trim()), { displayMode: false, throwOnError: false });
      } catch {
        return `\\(${math}\\)`;
      }
    });

    // 6. Render inline math $ ... $ (avoid matching escaped \$ or currency like $100)
    html = html.replace(/(?<!\\)\$([^\$\n\r]+?)\$/g, (_, math) => {
      if (/^\s*\d+\s*$/.test(math)) return `$${math}$`;
      try {
        return katex.renderToString(decodeMathEntities(math.trim()), { displayMode: false, throwOnError: false });
      } catch {
        return `$${math}$`;
      }
    });

    // 7. If compact mode (e.g. inside option items), remove outer single paragraph wrappers
    if (compact) {
      html = html.trim();
      if (html.startsWith("<p>") && html.endsWith("</p>") && (html.match(/<p>/gi) || []).length === 1) {
        html = html.slice(3, -4);
      }
    }

    return html;
  }, [content, compact]);

  return (
    <div
      className={`prose dark:prose-invert max-w-none text-foreground text-sm sm:text-base leading-relaxed rich-math-content ${compact ? "compact" : ""} ${className}`}
      dangerouslySetInnerHTML={{ __html: processedHtml }}
    />
  );
}
