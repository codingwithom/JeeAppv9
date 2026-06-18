import { Router, type Request, type Response } from "express";

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

    // Strategy 1: Fetch directly from YouTube and parse HTML
    try {
      const encoded = encodeURIComponent(q);
      const searchUrl = `https://www.youtube.com/results?search_query=${encoded}&gl=US&hl=en`;
      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9"
        },
        signal: AbortSignal.timeout(6000)
      });

      if (response.ok) {
        const html = await response.text();
        
        const videos: any[] = [];
        const seenIds = new Set<string>();

        // 1. Try extracting and parsing ytInitialData using brace counting
        const markers = [
          'var ytInitialData =',
          'ytInitialData =',
          'window["ytInitialData"] ='
        ];
        
        let ytData: any = null;
        for (const marker of markers) {
          const idx = html.indexOf(marker);
          if (idx === -1) continue;
          
          const startIdx = html.indexOf('{', idx + marker.length);
          if (startIdx === -1) continue;
          
          let braceCount = 0;
          let inStringDouble = false;
          let inStringSingle = false;
          let escape = false;
          
          for (let i = startIdx; i < html.length; i++) {
            const char = html[i];
            if (escape) { escape = false; continue; }
            if (char === '\\') { escape = true; continue; }
            if (char === '"' && !inStringSingle) {
              inStringDouble = !inStringDouble;
              continue;
            }
            if (char === "'" && !inStringDouble) {
              inStringSingle = !inStringSingle;
              continue;
            }
            if (!inStringDouble && !inStringSingle) {
              if (char === '{') {
                braceCount++;
              } else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                  const jsonStr = html.slice(startIdx, i + 1);
                  try {
                    ytData = JSON.parse(jsonStr);
                    break;
                  } catch (e) {
                    console.warn("Failed to parse extracted JSON for marker", marker, e);
                  }
                }
              }
            }
          }
          if (ytData) break;
        }

        if (ytData) {
          const findVideos = (obj: any) => {
            if (videos.length >= 50) return;
            if (Array.isArray(obj)) {
              for (const item of obj) findVideos(item);
            } else if (obj !== null && typeof obj === "object") {
              if (obj.videoRenderer && obj.videoRenderer.videoId) {
                videos.push(obj.videoRenderer);
              } else {
                for (const key of Object.keys(obj)) findVideos(obj[key]);
              }
            }
          };
          findVideos(ytData);
        }

        // 2. If ytInitialData yielded nothing, fallback to block-based brace-counting search in the HTML
        if (videos.length === 0) {
          const rendererKeys = ["videoRenderer", "playlistVideoRenderer", "gridVideoRenderer"];
          for (const key of rendererKeys) {
            let pos = 0;
            while (true) {
              pos = html.indexOf(`"${key}"`, pos);
              if (pos === -1) break;

              const startIdx = html.indexOf("{", pos + key.length + 2);
              if (startIdx !== -1 && startIdx - pos < 50) {
                let braceCount = 0;
                let inStringDouble = false;
                let inStringSingle = false;
                let escape = false;
                let rendererStr = "";

                for (let i = startIdx; i < html.length; i++) {
                  const char = html[i];
                  if (escape) { escape = false; continue; }
                  if (char === "\\") { escape = true; continue; }
                  if (char === '"' && !inStringDouble && !inStringSingle) {
                    inStringDouble = true;
                    continue;
                  }
                  if (char === '"' && inStringDouble && !escape) {
                    inStringDouble = false;
                    continue;
                  }
                  if (char === "'" && !inStringDouble && !inStringSingle) {
                    inStringSingle = true;
                    continue;
                  }
                  if (char === "'" && inStringSingle && !escape) {
                    inStringSingle = false;
                    continue;
                  }
                  if (!inStringDouble && !inStringSingle) {
                    if (char === "{") braceCount++;
                    else if (char === "}") {
                      braceCount--;
                      if (braceCount === 0) {
                        rendererStr = html.slice(startIdx, i + 1);
                        break;
                      }
                    }
                  }
                }

                if (rendererStr) {
                  try {
                    const r = JSON.parse(rendererStr);
                    const videoObj = r.videoRenderer || r;
                    if (videoObj && videoObj.videoId) {
                      videos.push(videoObj);
                    }
                  } catch (e) {
                    // ignore
                  }
                }
              }
              pos += key.length + 2;
            }
          }
        }

        if (videos.length > 0) {
          const results = [];
          for (const v of videos) {
            if (!v.videoId || seenIds.has(v.videoId)) continue;
            seenIds.add(v.videoId);

            const timeStr = v.lengthText?.simpleText || "0:00";
            const parts = timeStr.split(":").map(Number);
            const length_seconds =
              parts.length === 3
                ? parts[0] * 3600 + parts[1] * 60 + parts[2]
                : parts.length === 2
                  ? parts[0] * 60 + parts[1]
                  : parts[0] || 0;

            results.push({
              videoId: v.videoId,
              title: decodeHTMLEntities(v.title?.runs?.[0]?.text || v.title?.simpleText || v.title || "Unknown"),
              author: decodeHTMLEntities(v.ownerText?.runs?.[0]?.text || v.shortBylineText?.runs?.[0]?.text || "Unknown"),
              length_seconds,
              thumbnail: `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
            });
          }

          if (results.length > 0) {
            return res.status(200).json({ results });
          }
        }
      }
    } catch (err) {
      console.error("Direct YouTube search scrape failed:", err);
    }

    // Strategy 2: Fallback to Piped/Invidious instances via backend fetch
    const pipedInstances = [
      "https://pipedapi.kavin.rocks",
      "https://pipedapi.smnz.de",
      "https://piped-api.lunar.icu",
      "https://pipedapi.adminforge.de",
      "https://pipedapi.tokhmi.xyz"
    ];

    const invidiousInstances = [
      "https://invidious.jing.rocks",
      "https://vid.puffyan.us",
      "https://invidious.nerdvpn.de",
      "https://invidious.privacydev.net",
      "https://inv.tux.pizza",
      "https://invidious.lunar.icu",
      "https://invidious.flokinet.to"
    ];

    const fallbackTasks: Promise<any[]>[] = [];

    for (const instance of pipedInstances) {
      fallbackTasks.push(
        (async () => {
          const res = await fetch(`${instance}/search?q=${encodeURIComponent(q)}&filter=all`, {
            signal: AbortSignal.timeout(4000)
          });
          if (!res.ok) throw new Error("HTTP error");
          const data = (await res.json()) as any;
          if (!data?.items?.length) throw new Error("No data");
          const videos = data.items.filter((item: any) => item.type === "stream");
          if (!videos.length) throw new Error("No videos");
          return videos.map((v: any) => {
            const vId = v.url.includes("?v=") ? v.url.split("?v=")[1].split("&")[0] : v.url.split("/").pop();
            return {
              videoId: vId,
              title: v.title || "Unknown",
              author: v.uploaderName || "Unknown",
              length_seconds: v.duration || 0,
              thumbnail: `https://i.ytimg.com/vi/${vId}/mqdefault.jpg`,
            };
          });
        })()
      );
    }

    for (const instance of invidiousInstances) {
      fallbackTasks.push(
        (async () => {
          const res = await fetch(`${instance}/api/v1/search?q=${encodeURIComponent(q)}&type=video`, {
            signal: AbortSignal.timeout(4000)
          });
          if (!res.ok) throw new Error("HTTP error");
          const data = (await res.json()) as any;
          if (!Array.isArray(data) || !data.length) throw new Error("No data");
          return data.map((v: any) => ({
            videoId: v.videoId,
            title: v.title || "Unknown",
            author: v.author || "Unknown",
            length_seconds: v.lengthSeconds || v.length_seconds || 0,
            thumbnail: `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
          }));
        })()
      );
    }

    try {
      const results = await Promise.any(fallbackTasks);
      if (results && results.length > 0) {
        return res.status(200).json({ results });
      }
    } catch (err) {
      console.error("All fallback YT search instances failed:", err);
    }

    return res.status(500).json({ error: "All search strategies failed. Please try a different query." });
  } catch (error: any) {
    console.error("Backend YT Search Router Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

export default router;
