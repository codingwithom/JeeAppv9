import React, { useMemo, useEffect } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import mathjaxDefs from "@/data/pyq/mathjax-defs.html?raw";

// Inject the global MathJax SVG font cache into the document so all SVG glyphs (#MJX-TEX-...) render
function ensureMathJaxDefs() {
  if (typeof document === "undefined") return;
  if (!document.getElementById("MJX-SVG-global-cache")) {
    const container = document.createElement("div");
    container.style.display = "none";
    container.innerHTML = mathjaxDefs;
    if (container.firstElementChild) {
      document.body.prepend(container.firstElementChild);
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
}

export function RichMathContent({ content, className = "" }: RichMathContentProps) {
  useEffect(() => {
    ensureMathJaxDefs();
  }, []);

  const processedHtml = useMemo(() => {
    if (!content) return "";

    let html = content;

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

    return html;
  }, [content]);

  return (
    <div
      className={`prose dark:prose-invert max-w-none text-foreground text-sm sm:text-base leading-relaxed rich-math-content ${className}`}
      dangerouslySetInnerHTML={{ __html: processedHtml }}
    />
  );
}
