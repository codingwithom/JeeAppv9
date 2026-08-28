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
 * Fetches standalone video metadata client-side using noembed, oEmbed, and mirror fallbacks.
 * Guaranteed to return a valid PlaylistItem even if all network lookups fail.
 */
export async function fetchVideoMetadataClientSide(youtubeId: string): Promise<PlaylistItem> {
  const cleanId = youtubeId.trim();
  let title = "YouTube Video";
  let artist = "YouTube";
  let duration = 0;
  const thumbnail = `https://img.youtube.com/vi/${cleanId}/hqdefault.jpg`;
  const streamUrl = `https://www.youtube.com/embed/${cleanId}`;

  // 1. Try noembed.com (free, high-reliability CORS-enabled oEmbed proxy)
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${cleanId}`, { signal: controller.signal });
    clearTimeout(t);
    if (res.ok) {
      const data = await res.json();
      if (data && !data.error && data.title) {
        title = cleanTitleString(data.title);
        if (data.author_name) artist = cleanTitleString(data.author_name);
        return { title, artist, thumbnail: data.thumbnail_url || thumbnail, duration, youtubeId: cleanId, streamUrl };
      }
    }
  } catch (e) {}

  // 2. Try Invidious / Piped video endpoint
  try {
    const invidiousList = await getInvidiousInstances();
    const pipedList = getPipedInstances();
    const candidateInstances = [...invidiousList.slice(0, 3), ...pipedList.slice(0, 2)];

    const fetchSingle = async (inst: string) => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 4000);
      try {
        if (inst.includes("piped")) {
          const res = await fetch(`${inst}/streams/${cleanId}`, { signal: controller.signal });
          clearTimeout(t);
          if (!res.ok) throw new Error("Piped fail");
          const d = await res.json();
          return {
            title: cleanTitleString(d.title || title),
            artist: cleanTitleString(d.uploader || artist),
            duration: Number(d.duration || 0),
            thumbnail: d.thumbnailUrl || thumbnail,
            youtubeId: cleanId,
            streamUrl
          };
        } else {
          const res = await fetch(`${inst}/api/v1/videos/${cleanId}`, { signal: controller.signal });
          clearTimeout(t);
          if (!res.ok) throw new Error("Invidious fail");
          const d = await res.json();
          return {
            title: cleanTitleString(d.title || title),
            artist: cleanTitleString(d.author || artist),
            duration: Number(d.lengthSeconds || 0),
            thumbnail: d.videoThumbnails?.[0]?.url || thumbnail,
            youtubeId: cleanId,
            streamUrl
          };
        }
      } catch (err) {
        clearTimeout(t);
        throw err;
      }
    };

    const result = await raceSuccessful(candidateInstances.map(inst => fetchSingle(inst)));
    return result;
  } catch (e) {}

  // 3. Try YouTube oEmbed through CORS proxy
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${cleanId}&format=json`;
    const text = await raceSuccessful([
      fetchWithProxy(`https://api.allorigins.win/raw?url=${encodeURIComponent(oembedUrl)}`, "text"),
      fetchWithProxy(`https://api.allorigins.win/get?url=${encodeURIComponent(oembedUrl)}`, "allorigins"),
      fetchWithProxy(`https://corsproxy.io/?url=${encodeURIComponent(oembedUrl)}`, "text"),
      fetchWithProxy(`https://corsproxy.io/?${encodeURIComponent(oembedUrl)}`, "text"),
      fetchWithProxy(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(oembedUrl)}`, "text")
    ]);
    const d = JSON.parse(text);
    if (d.title) title = cleanTitleString(d.title);
    if (d.author_name) artist = cleanTitleString(d.author_name);
  } catch (e) {}

  return { title, artist, thumbnail, duration, youtubeId: cleanId, streamUrl };
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

  // Also check if there's a video ID embedded in the string
  let embeddedVideoId: string | null = null;
  const vMatch = ytPlaylistId.match(/[?&]v=([^&#]+)/) || ytPlaylistId.match(/youtu\.be\/([^?#]+)/);
  if (vMatch) {
    embeddedVideoId = vMatch[1];
  } else if (playlistId.length === 11 && !playlistId.startsWith("PL") && !playlistId.startsWith("RD")) {
    embeddedVideoId = playlistId;
  }

  // If playlist ID is a YouTube Mix (RD...), Liked (LL), Watch Later (WL), or User Uploads (UL)
  // These are user-specific radio/mixes that cannot be queried as public playlists.
  if (playlistId.startsWith("RD") || playlistId.startsWith("LL") || playlistId.startsWith("WL") || playlistId.startsWith("UL")) {
    if (embeddedVideoId) {
      const single = await fetchVideoMetadataClientSide(embeddedVideoId);
      return {
        type: "playlist",
        name: single.title,
        tracks: [single]
      };
    }
  }

  let playlistName = "YouTube Playlist";
  let tracks: PlaylistItem[] = [];

  // Strategy 1: Fetch raw YouTube Playlist page layout and extract ytInitialData
  try {
    const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
    const htmlText = await raceSuccessful([
      fetchWithProxy(`https://api.allorigins.win/raw?url=${encodeURIComponent(playlistUrl)}`, "text"),
      fetchWithProxy(`https://api.allorigins.win/get?url=${encodeURIComponent(playlistUrl)}`, "allorigins"),
      fetchWithProxy(`https://corsproxy.io/?url=${encodeURIComponent(playlistUrl)}`, "text"),
      fetchWithProxy(`https://corsproxy.io/?${encodeURIComponent(playlistUrl)}`, "text"),
      fetchWithProxy(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(playlistUrl)}`, "text")
    ]);

    const result = extractTracksFromHTML(htmlText);
    tracks = result.tracks;
    if (result.name && result.name !== "YouTube Playlist") playlistName = result.name;
  } catch (htmlErr) {
    console.warn("HTML CORS proxies failed to fetch playlist page, trying RSS XML...", htmlErr);
  }

  // Strategy 2: Fallback to YouTube playlist XML feed
  if (tracks.length === 0) {
    try {
      const feedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;
      const xmlText = await raceSuccessful([
        fetchWithProxy(`https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`, "text"),
        fetchWithProxy(`https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`, "allorigins"),
        fetchWithProxy(`https://corsproxy.io/?url=${encodeURIComponent(feedUrl)}`, "text"),
        fetchWithProxy(`https://corsproxy.io/?${encodeURIComponent(feedUrl)}`, "text"),
        fetchWithProxy(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(feedUrl)}`, "text")
      ]);
      const rssResult = parseXMLFeed(xmlText, playlistName);
      tracks = rssResult.tracks;
      if (rssResult.name && rssResult.name !== "YouTube Playlist") playlistName = rssResult.name;
    } catch (rssErr) {
      console.warn("RSS Feed extraction failed on proxies, trying Mirror instances...", rssErr);
    }
  }

  // Strategy 3: Multi-Tier Resiliency Fallback (Race public Piped and Invidious API instances)
  if (tracks.length === 0) {
    try {
      const piped_instances = getPipedInstances();
      const invidious_instances = await getInvidiousInstances();

      const top_piped = Array.from(new Set(["https://pipedapi.tokhmi.xyz", "https://pipedapi.adminforge.de", "https://piped-api.lunar.icu", ...piped_instances])).slice(0, 4);
      const top_invidious = Array.from(new Set(["https://inv.tux.pizza", "https://invidious.nerdvpn.de", "https://invidious.flokinet.to", "https://vid.puffyan.us", "https://invidious.jing.rocks", "https://invidious.f5.si", ...invidious_instances])).slice(0, 4);

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

  // Strategy 4: If playlist scraping returned empty BUT an embedded video ID was in the URL, return that video!
  if (tracks.length === 0 && embeddedVideoId) {
    try {
      const single = await fetchVideoMetadataClientSide(embeddedVideoId);
      return {
        type: "playlist",
        name: single.title,
        tracks: [single]
      };
    } catch (e) {}
  }

  if (tracks.length === 0) {
    throw new Error("Could not extract playlist. Please ensure the playlist is public or try adding individual video links.");
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

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  author: string;
  length_seconds: number;
  thumbnail: string;
}

/**
 * Searches for YouTube videos across multi-tiered public providers and CORS proxies.
 * Returns up to 50 parsed videos.
 */
export async function searchYouTubeVideos(query: string): Promise<YouTubeSearchResult[]> {
  const q = encodeURIComponent(query.trim());
  if (!q) return [];

  const fetchWithTimeout = async (url: string, timeoutMs: number) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
  };

  const fetchPiped = async (instance: string): Promise<YouTubeSearchResult[]> => {
    const res = await fetchWithTimeout(`${instance}/search?q=${q}&filter=all`, 4500);
    const data = await res.json();
    if (!data?.items?.length) throw new Error("No items in Piped");
    const videos = data.items.filter((item: any) => item.type === "stream" || item.url?.includes("watch?v=") || item.id);
    if (!videos.length) throw new Error("No video streams in Piped");
    return videos.slice(0, 50).map((v: any) => {
      const vId = v.url?.includes("?v=") 
        ? v.url.split("?v=")[1].split("&")[0] 
        : (v.id || v.url?.split("/").pop() || "");
      if (!vId) return null;
      return {
        videoId: vId,
        title: cleanTitleString(v.title || "Unknown"),
        author: cleanTitleString(v.uploaderName || v.uploader || "YouTube"),
        length_seconds: Number(v.duration || v.durationInSec || 0),
        thumbnail: `https://i.ytimg.com/vi/${vId}/hq720.jpg`,
      };
    }).filter((v: YouTubeSearchResult | null): v is YouTubeSearchResult => Boolean(v && v.videoId));
  };

  const fetchInvidious = async (instance: string): Promise<YouTubeSearchResult[]> => {
    const res = await fetchWithTimeout(`${instance}/api/v1/search?q=${q}&type=video`, 4500);
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) throw new Error("No data in Invidious");
    return data.slice(0, 50).map((v: any) => {
      const vId = v.videoId || "";
      if (!vId) return null;
      return {
        videoId: vId,
        title: cleanTitleString(v.title || "Unknown"),
        author: cleanTitleString(v.author || "YouTube"),
        length_seconds: Number(v.lengthSeconds || v.length_seconds || v.duration || 0),
        thumbnail: `https://i.ytimg.com/vi/${vId}/hq720.jpg`,
      };
    }).filter((v: YouTubeSearchResult | null): v is YouTubeSearchResult => Boolean(v && v.videoId));
  };

  const fetchProxyScrape = async (proxyUrl: string): Promise<YouTubeSearchResult[]> => {
    const res = await fetchWithTimeout(proxyUrl, 5000);
    const contentType = res.headers.get("content-type") || "";
    let html = "";
    if (contentType.includes("application/json")) {
      const data = await res.json();
      html = data.contents || "";
    } else {
      html = await res.text();
    }

    const match =
      html.match(/var\s+ytInitialData\s*=\s*(\{[\s\S]+?\});/s) ||
      html.match(/ytInitialData\s*=\s*(\{[\s\S]+?\});/s) ||
      html.match(/window\["ytInitialData"\]\s*=\s*(\{[\s\S]+?\});/s);
    
    if (match) {
      try {
        const ytData = JSON.parse(match[1]);
        const videos: any[] = [];
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

        if (videos.length > 0) {
          return videos.map((v) => {
            const timeStr = v.lengthText?.simpleText || "0:00";
            const parts = timeStr.split(":").map(Number);
            const length_seconds =
              parts.length === 3
                ? parts[0] * 3600 + parts[1] * 60 + parts[2]
                : parts.length === 2
                  ? parts[0] * 60 + parts[1]
                  : parts[0] || 0;

            return {
              videoId: v.videoId,
              title: cleanTitleString(v.title?.runs?.[0]?.text || v.title?.simpleText || "Unknown"),
              author: cleanTitleString(v.ownerText?.runs?.[0]?.text || v.shortBylineText?.runs?.[0]?.text || "YouTube"),
              length_seconds,
              thumbnail: `https://i.ytimg.com/vi/${v.videoId}/hq720.jpg`,
            };
          });
        }
      } catch (e) {}
    }

    // Anchor regex fallback
    const anchorMatches = Array.from(html.matchAll(/href="[^"]*watch\?v=([a-zA-Z0-9_-]{11})[^"]*"/g));
    const fallbackResults: YouTubeSearchResult[] = [];
    const seen = new Set<string>();
    for (const m of anchorMatches) {
      const vId = m[1];
      if (!seen.has(vId) && seen.size < 30) {
        seen.add(vId);
        fallbackResults.push({
          videoId: vId,
          title: `YouTube Video [${vId}]`,
          author: "YouTube",
          length_seconds: 0,
          thumbnail: `https://i.ytimg.com/vi/${vId}/hq720.jpg`,
        });
      }
    }
    if (fallbackResults.length > 0) return fallbackResults;
    throw new Error("No videos parsed from proxy scrape");
  };

  const fetchLocalApi = async (): Promise<YouTubeSearchResult[]> => {
    const apiBase = (typeof import.meta !== "undefined" && import.meta.env?.BASE_URL) ? import.meta.env.BASE_URL.replace(/\/$/, "") : "";
    const res = await fetchWithTimeout(`${apiBase}/api/yt-search?q=${q}`, 4000);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (!Array.isArray(data.results) || !data.results.length) throw new Error("No results");
    return data.results;
  };

  const invidiousInstances = await getInvidiousInstances();
  const pipedInstances = getPipedInstances();

  const searchTasks: Promise<YouTubeSearchResult[]>[] = [
    fetchLocalApi(),
    ...pipedInstances.map(inst => fetchPiped(inst)),
    ...invidiousInstances.map(inst => fetchInvidious(inst)),
    fetchProxyScrape(`https://api.allorigins.win/raw?url=${encodeURIComponent(`https://www.youtube.com/results?search_query=${q}&gl=US&hl=en`)}`),
    fetchProxyScrape(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://www.youtube.com/results?search_query=${q}&gl=US&hl=en`)}`),
    fetchProxyScrape(`https://corsproxy.io/?url=${encodeURIComponent(`https://www.youtube.com/results?search_query=${q}&gl=US&hl=en`)}`),
    fetchProxyScrape(`https://corsproxy.io/?${encodeURIComponent(`https://www.youtube.com/results?search_query=${q}&gl=US&hl=en`)}`),
    fetchProxyScrape(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://www.youtube.com/results?search_query=${q}&gl=US&hl=en`)}`)
  ];

  try {
    const fastest = await raceSuccessful(searchTasks);
    if (fastest && fastest.length > 0) {
      return fastest.slice(0, 50);
    }
  } catch (err) {
    console.warn("Search providers failed:", err);
  }

  throw new Error("No search results found.");
}
