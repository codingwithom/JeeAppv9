import { Router, type Request, type Response } from "express";
import playdl from "play-dl";

const router: Router = Router();

function decodeHTMLEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&nbsp;/g, " ");
}

async function fetchOgImage(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      signal: AbortSignal.timeout(1800) // 1.8 seconds timeout max
    });
    if (!response.ok) return "";
    const html = await response.text();
    
    // Match property="og:image"
    let match = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i) ||
                html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
                
    if (match && match[1]) {
      let imgUrl = match[1];
      if (imgUrl.startsWith("//")) {
        imgUrl = "https:" + imgUrl;
      } else if (imgUrl.startsWith("/")) {
        const parsed = new URL(url);
        imgUrl = parsed.origin + imgUrl;
      }
      return imgUrl;
    }
    return "";
  } catch (e) {
    return "";
  }
}

router.get("/search", async (req: Request, res: Response) => {
  try {
    const { q, df } = req.query;
    if (!q || typeof q !== "string") {
      return res.status(400).json({ error: "Missing search query parameter 'q'" });
    }

    const encoded = encodeURIComponent(q);
    let searchUrl = `https://html.duckduckgo.com/html/?q=${encoded}`;
    if (df && typeof df === "string") {
      searchUrl += `&df=${df}`;
    }

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo request failed with status: ${response.status}`);
    }

    const html = await response.text();
    if (!html.includes("result results_links")) {
      return res.status(200).json({ results: [] });
    }

    const parts = html.split('class="result results_links');
    const rawResults = parts.slice(1, 7).map((part) => {
      const hrefMatch = part.match(/class="result__a"[^>]*href="([^"]+)"/);
      const titleMatch = part.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/);
      const snippetMatch = part.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
      
      let url = hrefMatch ? hrefMatch[1] : "";
      if (url.startsWith("//")) {
        url = "https:" + url;
      }
      if (url.startsWith("/l/") || url.includes("uddg=")) {
        const match = url.match(/[?&]uddg=([^&]+)/);
        if (match) {
          url = decodeURIComponent(match[1]);
        }
      }
      
      let title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "").trim() : "";
      let snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, "").trim() : "";
      
      title = decodeHTMLEntities(title);
      snippet = decodeHTMLEntities(snippet);
      
      return { url, title, snippet, thumbnail: "" };
    });

    // Concurrently fetch OpenGraph images for the top 4 results to make visual cards
    const withThumbnails = await Promise.all(
      rawResults.map(async (item, idx) => {
        if (idx < 4 && item.url) {
          const thumbnail = await fetchOgImage(item.url);
          return { ...item, thumbnail };
        }
        return item;
      })
    );

    return res.status(200).json({ results: withThumbnails });
  } catch (error: any) {
    console.error("Backend Search Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

router.get("/yt-search", async (req: Request, res: Response) => {
  try {
    const q = req.query.q;
    if (!q || typeof q !== "string") {
      return res.status(400).json({ error: "Missing search query parameter 'q'" });
    }
    
    // Search YouTube using play-dl
    const results = await playdl.search(q, { limit: 25, source: { youtube: "video" } });
    const formatted = results.map(v => ({
      videoId: v.id || "",
      title: v.title || "Unknown",
      author: v.channel?.name || "Unknown",
      length_seconds: v.durationInSec || 0,
      thumbnail: v.thumbnails?.at(-1)?.url || `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`
    }));
    
    return res.status(200).json({ results: formatted });
  } catch (error: any) {
    console.error("Backend YT Search Error:", error);
    // Hard fallback: scrape YouTube search page
    try {
      const q = req.query.q as string;
      const encoded = encodeURIComponent(q);
      const searchUrl = `https://www.youtube.com/results?search_query=${encoded}&gl=US&hl=en`;
      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9"
        },
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        const html = await response.text();
        const videos: any[] = [];
        const seenIds = new Set<string>();
        
        let pos = 0;
        while (true) {
          pos = html.indexOf('"videoRenderer"', pos);
          if (pos === -1) break;
          
          const startIdx = html.indexOf("{", pos + 15);
          if (startIdx !== -1) {
            let braceCount = 0;
            let inString = false;
            let escape = false;
            let block = "";
            for (let i = startIdx; i < html.length; i++) {
              const char = html[i];
              if (escape) { escape = false; continue; }
              if (char === "\\") { escape = true; continue; }
              if (char === '"') { inString = !inString; continue; }
              if (!inString) {
                if (char === "{") braceCount++;
                else if (char === "}") {
                  braceCount--;
                  if (braceCount === 0) {
                    block = html.slice(startIdx, i + 1);
                    break;
                  }
                }
              }
            }
            if (block) {
              try {
                const r = JSON.parse(block);
                const vId = r.videoId;
                if (vId && !seenIds.has(vId)) {
                  seenIds.add(vId);
                  const title = r.title?.runs?.[0]?.text || r.title?.simpleText || "";
                  const author = r.ownerText?.runs?.[0]?.text || "";
                  let length_seconds = 0;
                  if (r.lengthText?.simpleText) {
                    const parts = r.lengthText.simpleText.split(":").map(Number);
                    if (parts.every((p: number) => !isNaN(p))) {
                      if (parts.length === 2) length_seconds = parts[0] * 60 + parts[1];
                      if (parts.length === 3) length_seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
                    }
                  }
                  videos.push({
                    videoId: vId,
                    title,
                    author,
                    length_seconds,
                    thumbnail: `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`
                  });
                }
              } catch(e) {}
            }
          }
          pos += 15;
        }
        if (videos.length > 0) {
          return res.status(200).json({ results: videos });
        }
      }
    } catch(scrapeErr) {
      console.error("Backend YT Search Scrape Fallback Error:", scrapeErr);
    }
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

export default router;
