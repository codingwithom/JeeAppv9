import { getInvidiousInstances, getPipedInstances } from "./youtube";

export interface PlaylistItem {
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;
  youtubeId: string;
  streamUrl: string;
}

export interface PlaylistResult {
  type: string;
  name: string;
  tracks: PlaylistItem[];
}

/**
 * Helper to race a set of promises and resolve with the first successful promise value.
 * Reject only if all promises fail.
 */
async function raceSuccessful<T>(promises: Promise<T>[]): Promise<T> {
  return new Promise((resolve, reject) => {
    let rejectedCount = 0;
    const errors: any[] = [];
    if (promises.length === 0) {
      reject(new Error("No promises to race"));
      return;
    }
    promises.forEach(p => {
      p.then(resolve).catch(err => {
        errors.push(err);
        rejectedCount++;
        if (rejectedCount === promises.length) {
          reject(new Error(`All promises failed: ${errors.map(e => e.message || e).join("; ")}`));
        }
      });
    });
  });
}

/**
 * Fetch helper for individual CORS proxies with automatic timeout support
 */
async function fetchWithProxy(proxyUrl: string, type: "allorigins" | "text"): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 seconds timeout
  try {
    const res = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (type === "allorigins") {
      const data = await res.json();
      if (!data.contents) throw new Error("Empty contents field");
      return data.contents;
    } else {
      return await res.text();
    }
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

/**
 * Cleans HTML entities and other text layouts
 */
function cleanTitleString(t: string): string {
  if (!t) return "";
  return t
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\[\s*\d+\s*\]/g, "")
    .replace(/\(\s*\d+\s*\)/g, "")
    .trim();
}

/**
 * Parses duration strings like "3:45" or "1:02:15" into seconds
 */
function parseDurationString(str: string): number {
  const parts = str.split(":").map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

/**
 * Robust JSON extractor that counts braces to handle any layout newlines or semicolons
 */
function extractJSONFromHTML(html: string, varName: string): any {
  const index = html.indexOf(varName);
  if (index === -1) return null;

  const startIndex = html.indexOf("{", index);
  if (startIndex === -1) return null;

  let braceCount = 0;
  let inStringDouble = false;
  let inStringSingle = false;
  let escape = false;

  for (let i = startIndex; i < html.length; i++) {
    const char = html[i];
    
    if (escape) {
      escape = false;
      continue;
    }
    if (char === "\\") {
      escape = true;
      continue;
    }
    if (char === '"' && !inStringSingle) {
      inStringDouble = !inStringDouble;
      continue;
    }
    if (char === "'" && !inStringDouble) {
      inStringSingle = !inStringSingle;
      continue;
    }

    if (!inStringDouble && !inStringSingle) {
      if (char === "{") {
        braceCount++;
      } else if (char === "}") {
        braceCount--;
        if (braceCount === 0) {
          const jsonStr = html.slice(startIndex, i + 1);
          try {
            return JSON.parse(jsonStr);
          } catch (e) {
            console.warn("Brace-counted JSON parse failed:", e);
            return null;
          }
        }
      }
    }
  }
  return null;
}

/**
 * Recursively scans standard objects to extract any video renderer definitions (e.g. playlistVideoRenderer)
 */
function findVideosInJson(obj: any, results: any[] = []): any[] {
  if (!obj || typeof obj !== "object") return results;
  
  if (obj.playlistVideoRenderer) {
    results.push({ type: "playlistVideo", data: obj.playlistVideoRenderer });
  } else if (obj.videoRenderer) {
    results.push({ type: "video", data: obj.videoRenderer });
  } else {
    for (const key of Object.keys(obj)) {
      findVideosInJson(obj[key], results);
    }
  }
  return results;
}

/**
 * Extracts and maps metadata from raw YouTube playlist HTML page contents
 */
function extractTracksFromHTML(html: string): { name: string; tracks: PlaylistItem[] } {
  let name = "YouTube Playlist";
  const titleMatch = html.match(/<title>(.*?) - YouTube<\/title>/) || html.match(/<meta\s+name="title"\s+content="([^"]+)"/);
  if (titleMatch) {
    name = cleanTitleString(titleMatch[1]);
  }

  const tracks: PlaylistItem[] = [];
  const seenIds = new Set<string>();

  // Extract and parse initial data JSON via brace-counting
  const json = extractJSONFromHTML(html, "ytInitialData");
  if (json) {
    try {
      const videoItems = findVideosInJson(json);
      for (const item of videoItems) {
        const d = item.data;
        const videoId = d.videoId || d.contentId;
        if (!videoId || seenIds.has(videoId)) continue;

        let title = "Unknown Video";
        if (d.title?.runs?.[0]?.text) {
          title = d.title.runs[0].text;
        } else if (d.title?.simpleText) {
          title = d.title.simpleText;
        } else if (d.title?.content) {
          title = d.title.content;
        }

        let artist = "YouTube";
        if (d.shortBylineText?.runs?.[0]?.text) {
          artist = d.shortBylineText.runs[0].text;
        } else if (d.longBylineText?.runs?.[0]?.text) {
          artist = d.longBylineText.runs[0].text;
        } else if (d.ownerText?.runs?.[0]?.text) {
          artist = d.ownerText.runs[0].text;
        }

        const duration = Number(d.lengthSeconds || (d.lengthText?.simpleText ? parseDurationString(d.lengthText.simpleText) : 0)) || 0;

        seenIds.add(videoId);
        tracks.push({
          title: cleanTitleString(title),
          artist: cleanTitleString(artist),
          thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          duration,
          youtubeId: videoId,
          streamUrl: `https://www.youtube.com/embed/${videoId}`
        });
      }
    } catch (e) {
      console.warn("Failed to process ytInitialData JSON inside HTML scraper:", e);
    }
  }

  // Fallback anchor tag regex match (if JSON parse failed or yielded empty tracks)
  if (tracks.length === 0) {
    try {
      const matches = html.matchAll(/href="[^"]*watch\?v=([a-zA-Z0-9_-]{11})[^"]*"/g);
      for (const m of matches) {
        const videoId = m[1];
        if (!seenIds.has(videoId) && seenIds.size < 100) {
          seenIds.add(videoId);
          tracks.push({
            title: `YouTube Video [${videoId}]`,
            artist: "YouTube",
            thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            duration: 0,
            youtubeId: videoId,
            streamUrl: `https://www.youtube.com/embed/${videoId}`
          });
        }
      }
    } catch (e) {
      console.warn("Anchor regex fallback matching failed:", e);
    }
  }

  return { name, tracks };
}

/**
 * Robust XML helper to get node text value checking tags both directly and without namespaces
 */
function getElementVal(parent: Element, tagName: string): string {
  let nodes = parent.getElementsByTagName(tagName);
  if (nodes.length > 0 && nodes[0].textContent) return nodes[0].textContent.trim();
  
  if (tagName.includes(":")) {
    const localName = tagName.split(":")[1];
    nodes = parent.getElementsByTagName(localName);
    if (nodes.length > 0 && nodes[0].textContent) return nodes[0].textContent.trim();
    
    try {
      nodes = parent.getElementsByTagNameNS("*", localName);
      if (nodes.length > 0 && nodes[0].textContent) return nodes[0].textContent.trim();
    } catch (e) {}
  }
  return "";
}

/**
 * Parses YouTube XML RSS feed using browser native DOMParser
 */
function parseXMLFeed(xmlText: string, defaultName: string): PlaylistResult {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");
  
  let name = defaultName;
  const feedTitle = xmlDoc.getElementsByTagName("title")[0]?.textContent;
  if (feedTitle) {
    name = feedTitle.trim();
  }
  
  const entries = xmlDoc.getElementsByTagName("entry");
  const tracks: PlaylistItem[] = [];
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    
    let videoId = getElementVal(entry, "yt:videoId");
    if (!videoId) {
      const idText = getElementVal(entry, "id");
      if (idText.startsWith("yt:video:")) {
        videoId = idText.replace("yt:video:", "");
      }
    }
    
    if (!videoId) {
      const linkNodes = entry.getElementsByTagName("link");
      for (let j = 0; j < linkNodes.length; j++) {
        const href = linkNodes[j].getAttribute("href");
        if (href) {
          const m = href.match(/(?:watch\?v=|embed\/|shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
          if (m) {
            videoId = m[1];
            break;
          }
        }
      }
    }
    
    if (!videoId) continue;
    
    const title = getElementVal(entry, "title") || "Unknown Video";
    
    let artist = "YouTube";
    const authorNode = entry.getElementsByTagName("author")[0];
    if (authorNode) {
      const nameNode = authorNode.getElementsByTagName("name")[0];
      if (nameNode && nameNode.textContent) {
        artist = nameNode.textContent.trim();
      }
    }
    
    tracks.push({
      title,
      artist,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      duration: 0,
      youtubeId: videoId,
      streamUrl: `https://www.youtube.com/embed/${videoId}`
    });
  }
  
  return { type: "playlist", name, tracks };
}

/**
 * Pure client-side parsing system that extracts YouTube playlist data.
 * Races multiple open CORS proxies to scrap playlist page HTML and falls back to
 * XML RSS feed, and finally to raced public API mirrors (Piped/Invidious) as a last-resort.
 */
export async function fetchPlaylistClientSide(ytPlaylistId: string): Promise<PlaylistResult> {
  let playlistId = ytPlaylistId.trim();
  
  // Extract clean playlist ID if a full URL was provided
  if (playlistId.includes("list=")) {
    const match = playlistId.match(/[?&]list=([^&#]+)/);
    if (match) playlistId = match[1];
  } else if (playlistId.includes("http://") || playlistId.includes("https://") || playlistId.includes("/")) {
    const match = playlistId.match(/playlist\/([^?&#]+)/) || playlistId.match(/playlists\/([^?&#]+)/);
    if (match) playlistId = match[1];
  }

  let playlistName = "YouTube Playlist";
  let tracks: PlaylistItem[] = [];

  // Strategy 1: Fetch raw YouTube Watch / Playlist page layout and extract ytInitialData (holds up to 100 items)
  try {
    const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
    const htmlText = await raceSuccessful([
      fetchWithProxy(`https://api.allorigins.win/get?url=${encodeURIComponent(playlistUrl)}`, "allorigins"),
      fetchWithProxy(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(playlistUrl)}`, "text"),
      fetchWithProxy(`https://corsproxy.io/?url=${encodeURIComponent(playlistUrl)}`, "text")
    ]);

    const result = extractTracksFromHTML(htmlText);
    tracks = result.tracks;
    playlistName = result.name;
  } catch (htmlErr) {
    console.warn("All HTML CORS proxies failed to fetch playlist page, using RSS XML fallback...", htmlErr);
  }

  // Strategy 2: Fallback to YouTube playlist XML feed (usually returns max 15 items)
  if (tracks.length === 0) {
    try {
      const feedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;
      const xmlText = await raceSuccessful([
        fetchWithProxy(`https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`, "allorigins"),
        fetchWithProxy(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(feedUrl)}`, "text"),
        fetchWithProxy(`https://corsproxy.io/?url=${encodeURIComponent(feedUrl)}`, "text")
      ]);
      const rssResult = parseXMLFeed(xmlText, playlistName);
      tracks = rssResult.tracks;
      playlistName = rssResult.name;
    } catch (rssErr) {
      console.warn("RSS Feed extraction failed on all proxies, trying Mirror instances next...", rssErr);
    }
  }

  // Strategy 3: Multi-Tier Resiliency Fallback (Race public Piped and Invidious API instances)
  if (tracks.length === 0) {
    try {
      const piped_instances = getPipedInstances();
      const invidious_instances = await getInvidiousInstances();

      const top_piped = Array.from(new Set(["https://pipedapi.adminforge.de", "https://pipedapi.tokhmi.xyz", ...piped_instances])).slice(0, 3);
      const top_invidious = Array.from(new Set(["https://vid.puffyan.us", "https://invidious.jing.rocks", "https://invidious.f5.si", ...invidious_instances])).slice(0, 3);

      interface MirrorResult {
        name: string;
        tracks: PlaylistItem[];
      }

      const fetchMirror = async (instance: string, type: "invidious" | "piped"): Promise<MirrorResult> => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        try {
          if (type === "piped") {
            const res = await fetch(`${instance}/playlists/${playlistId}`, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error(`Piped mirror failed: HTTP ${res.status}`);
            const data = await res.json();
            const name = data.name || "YouTube Playlist";
            if (!data.relatedStreams || !Array.isArray(data.relatedStreams)) throw new Error("Invalid Piped mirror schema");
            const mappedTracks = data.relatedStreams.map((v: any) => {
              const youtubeId = v.url 
                ? (v.url.includes("?v=") 
                    ? v.url.split("?v=")[1].split("&")[0] 
                    : v.url.split("/").pop()) 
                : "";
              if (!youtubeId) return null;
              const duration = Number(v.duration || v.durationInSec || v.lengthSeconds || 0);
              return {
                title: cleanTitleString(v.title || "Unknown Video"),
                artist: cleanTitleString(v.uploaderName || "YouTube"),
                thumbnail: v.thumbnail || `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`,
                duration,
                youtubeId,
                streamUrl: `https://www.youtube.com/embed/${youtubeId}`
              };
            }).filter(Boolean) as PlaylistItem[];
            return { name, tracks: mappedTracks };
          } else {
            const res = await fetch(`${instance}/api/v1/playlists/${playlistId}`, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error(`Invidious mirror failed: HTTP ${res.status}`);
            const data = await res.json();
            const name = data.title || "YouTube Playlist";
            if (!data.videos || !Array.isArray(data.videos)) throw new Error("Invalid Invidious mirror schema");
            const mappedTracks = data.videos.map((v: any) => {
              const youtubeId = v.videoId || "";
              if (!youtubeId) return null;
              const duration = Number(v.lengthSeconds || v.durationInSec || v.duration || 0);
              return {
                title: cleanTitleString(v.title || "Unknown Video"),
                artist: cleanTitleString(v.author || "YouTube"),
                thumbnail: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
                duration,
                youtubeId,
                streamUrl: `https://www.youtube.com/embed/${youtubeId}`
              };
            }).filter(Boolean) as PlaylistItem[];
            return { name, tracks: mappedTracks };
          }
        } catch (err) {
          clearTimeout(timeoutId);
          throw err;
        }
      };

      const mirrorPromises: Promise<MirrorResult>[] = [];
      for (const inst of top_piped) {
        mirrorPromises.push(fetchMirror(inst, "piped"));
      }
      for (const inst of top_invidious) {
        mirrorPromises.push(fetchMirror(inst, "invidious"));
      }

      const mirrorRes = await raceSuccessful(mirrorPromises);
      tracks = mirrorRes.tracks;
      playlistName = mirrorRes.name;
    } catch (mirrorErr) {
      console.error("All fallback mirror strategies failed:", mirrorErr);
    }
  }

  if (tracks.length === 0) {
    throw new Error("Could not extract playlist using client-side XML/HTML scraping or API mirror fallbacks.");
  }

  // Deduplicate and enforce 150 safety threshold limit
  const seenIds = new Set<string>();
  const uniqueTracks = tracks.filter(t => {
    if (!t.youtubeId) return false;
    if (seenIds.has(t.youtubeId)) return false;
    seenIds.add(t.youtubeId);
    return true;
  });

  return {
    type: "playlist",
    name: playlistName,
    tracks: uniqueTracks.slice(0, 150)
  };
}
