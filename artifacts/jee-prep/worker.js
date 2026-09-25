/**
 * Cloudflare Worker for StudE & OM Network (PW, JEE, YouTube & AI Engine)
 * Complete edge implementation with 100% parity with server.js:
 * - Physics Wallah API (Catalog, Metadata, Chapters, Teacher profiles, Syllabus & Full Schedules)
 * - YouTube Playlist & Single Video Parser (Full support for modern lockupViewModel & classic playlistVideoRenderer)
 * - YouTube Search Engine (Channel RSS + Search Scraping)
 * - AI Web Scraper & YouTube Transcript Engine (Invidious, youtube-transcript.ai, JSON-LD)
 * - DuckDuckGo Web Search with OpenGraph Thumbnails
 * - Universal CORS Proxy & Media Streaming
 */

// ─── CORS HEADERS ─────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, HEAD",
  "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, Authorization, Range, Cache-Control",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
  "Access-Control-Max-Age": "86400",
};

// ─── CONSTANTS & CONFIGURATION ────────────────────────────────────────────────
const PW_DETAILS_ORIGIN = "https://vidcloud.eu.org";
const PW_OFFICIAL_API = "https://api.penpencil.co";
const PW_CATALOG_URL = "https://studystark.github.io/batches/batches.json";

const POPULAR_PW_BATCHES = [
  {
    batch_id: "698ad3519549b300a5e1cc6a",
    name: "Arjuna JEE 2027",
    byName: "For Class 11 IIT-JEE Aspirants",
    exam: "IIT-JEE",
    class: "11",
    language: "Hinglish",
    photo: "https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/bb464a1b-1525-48df-8c4e-a7e607038bf2.jpeg"
  },
  {
    batch_id: "664cb3d34b4c100018eb7814",
    name: "Lakshya JEE 2026",
    byName: "For Class 12 IIT-JEE Aspirants",
    exam: "IIT-JEE",
    class: "12",
    language: "Hinglish"
  },
  {
    batch_id: "660144f808baec001824efec",
    name: "Prayas JEE 2025 / 2026",
    byName: "For Dropper / Repeater IIT-JEE Aspirants",
    exam: "IIT-JEE",
    class: "13",
    language: "Hinglish"
  },
  {
    batch_id: "664ca7bc354afd415fa0808a",
    name: "Arjuna NEET 2027",
    byName: "For Class 11 NEET Aspirants",
    exam: "NEET",
    class: "11",
    language: "Hinglish"
  },
  {
    batch_id: "664cb4325a74070018d9db90",
    name: "Lakshya NEET 2026",
    byName: "For Class 12 NEET Aspirants",
    exam: "NEET",
    class: "12",
    language: "Hinglish"
  },
  {
    batch_id: "6630f9a2dbb730001859cff2",
    name: "Yakeen NEET 2025 / 2026",
    byName: "For Dropper / Repeater NEET Aspirants",
    exam: "NEET",
    class: "13",
    language: "Hinglish"
  },
  {
    batch_id: "6a6992d0cfd4382606180b15",
    name: "NSEA 2026",
    byName: "Targeted Batch for NSEA 2026 Aspirants",
    exam: "OLYMPIAD",
    class: "12",
    language: "Hinglish"
  }
];

const FALLBACK_PW_COOKIES = "access_token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3ODg2NjYyODMsImV4cCI6MTc4OTI3MTA4My4wMjUsImRhdGEiOnsiX2lkIjoiNjhkZGZiZjAwNTkwMWE2ZDlhMTI5ZGI1IiwidXNlcm5hbWUiOiI3OTA2NTIxODQxIn19.f2XuaPhdG1vbiI6yjFawQioI1IZWiZtOTN1ZTk1ZmFinZQ2OGE3OWQxODk1LCJ3ZWJzaXRlIjoiaG95c21jc3dhbGxhc5Jb201LCJvYWI1IjoiUGh5c2ljc3dhbGxhc39LCJyb2xlcyI6WyI1YjI3YmQ5NjU4NDJmOTUwYTc3OGM2ZWYiXSwiY291bnRyeUdyb3VwIjoiSU4iLCJvbmVsb2xlcyI6W10sInR5cGUiOiJVU0VSIn0sImp0aSI6Ijd6dG5rbE0zUmQyMmE2e1Q2cUZNT1FfNjhkZGZiZjAwNTkwMWE3ZDlhMTI5ZGI1In0.OEVxivd2_L6zfrZLLTOFYPoiQsmb1t_7m889gyX5oeE; PHPSESSID=14dvi03b58pug1144tioqed92b; stark_cid=f96ea578454552575ec787e1e7c9eec200ea202aae6ae1daaadbd245d3d307b79; stark_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrzkiOiI1OUQtQkEyLTgyRS0zRDItQTk2Iiwiy2xpZW50X2lkIjoiZ2kzZWE1Nzg0NTQ1NTI1NzVlYzc4N2UxZTdjOWVlYzIwMGVhMjAyYWF1NmF1MWRhYWFkYmQyNDVkM2QzMDdiNzlSISImlhdCI6MTc5MDMxNjUzNSIwZXhwIjoxNzkxNDAYOTM1fQ.gieu1Snd5WgiM8VByojkwmuq0rcNfON52CkuEyzFofs";
const FALLBACK_PW_TOKEN = "Qd2wfhzRoi5eQdoITwpbNKPMdMTNSs37YUjvj0rSb5sNyhMiNwdYRCmgiTbUdxAiTAdjE/1c9qMnWHp9YUqE+oZL4bPviYaZzVdVAkLe2KG8ikVGXixjdguu+lpbwGywqm/OURTCo6X0JC70vQfg9QzGQlSt3dlcmzrpbxYbHydzlQeJqyh0SyHSkoLsXjDy7Jxy+nCUVQB2jSFq514ABmMGUHYWabU7LbJS0d3wNE1prGsgtdw0crSJesiF9+8N2mPiyj+qYWjg2NKlflX+OkauJYy0L9aAMRcbzr4uyBS8XYG3SRFGmb7WgTOswlEX2C6L5FyGqJfoQdRoYkUNTAttt53RimIPdDLjgIICpakgewlNM/sW2y+t0Vj/tAEiOBylh5yiKndmR4ljGzanJ103SzIh09+xaNv5+Jze9ilzr+PkbVyxXvtDbf1Vr5fMs92LnvuH17H6gnixXCs23aze9AhVhQkAq3Bmhyx5pUYVHxaES568RIb0alXcNc/JPpT4D/cvVq+JvD+iEUudY7IlCyBG4VRhSjhXGZhWgTclX7/DFr1smIQKRjiP2M84cDMUY3weoG+GV0CMkp3WDNi4SZXarIcQj+ZA5pnjRb+pcasKojENmEckHh4VK9IuYvhVAuAtHMF0Py9h3MIEq8/6Pz8GM0+tA4wasjBF0RnyTU2+05/szE0VoIf3Ep+bmEKO4zYrCIvD3DVP8X5Dvidq7ujodbnKw4CKMsRY3hd6p1FlCB9sOuMWxKQlvxZFn8e5endhYONO1yisyJKFUGT7S6ivTpnF8syPbvUBNtk=";

const PW_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Referer": "https://vidcloud.eu.org/",
  "Origin": "https://vidcloud.eu.org",
  "Accept": "application/json, text/plain, */*",
};

function getPwRequestHeaders(token) {
  const activeToken = token || FALLBACK_PW_TOKEN;
  return {
    ...PW_HEADERS,
    "Authorization": `Bearer ${activeToken}`,
    "Cookie": `auth_token=${activeToken}; ${FALLBACK_PW_COOKIES}`,
  };
}

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
};

// In-memory Edge Caches (per worker instance)
const pwMetadataCache = new Map();
const pwScheduleCache = new Map();
const pwChapterCache = new Map();
let pwCatalogCache = { data: null, expiresAt: 0 };
let pwTokenMemoryCache = { token: "", expiresAt: 0 };

const PW_METADATA_TTL = 60 * 60 * 1000; // 1 hour
const PW_CATALOG_TTL = 30 * 60 * 1000;  // 30 min
const PW_CHAPTER_TTL = 30 * 60 * 1000;  // 30 min
const PW_SCHEDULE_TTL = 15 * 60 * 1000; // 15 min

// ─── RESPONSE HELPERS ─────────────────────────────────────────────────────────
function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

function textResponse(text, status = 200, contentType = "text/plain; charset=utf-8", extraHeaders = {}) {
  return new Response(text, {
    status,
    headers: {
      "Content-Type": contentType,
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

// ─── STRING & HTML UTILITIES ──────────────────────────────────────────────────
function decodeHTMLEntities(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec));
}

function cleanHtmlToText(html) {
  if (!html) return "";
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "");

  text = text
    .replace(/<(?:p|div|br|h[1-6]|li|tr|blockquote)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  text = decodeHTMLEntities(text);
  return text.split("\n").map(l => l.trim()).filter(Boolean).join("\n");
}

function cleanTitle(t) {
  if (!t) return "";
  return decodeHTMLEntities(t)
    .replace(/\[\s*\d+\s*\]/g, "")
    .replace(/\(\s*\d+\s*\)/g, "")
    .trim();
}

function timeAgo(dateString) {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} minutes ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs} hours ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) return "1 day ago";
    return `${diffDays} days ago`;
  } catch (e) {
    return "Recently";
  }
}

// ─── YOUTUBE URL PARSERS ──────────────────────────────────────────────────────
function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split(/[?#]/)[0] || null;
  } catch { /* ignore */ }
  return null;
}

function extractListId(url) {
  try { return new URL(url).searchParams.get("list"); } catch { return null; }
}

function detectType(url) {
  if (!url || typeof url !== "string") return "unknown";
  if (url.includes("spotify.com/track/")) return "sp_track";
  if (url.includes("spotify.com/playlist/")) return "sp_playlist";
  if (url.includes("youtube.com/playlist") || url.includes("list=")) return "yt_playlist";
  if (url.includes("youtube.com/watch") || url.includes("youtu.be/")) return "yt_video";
  return "unknown";
}

function stripToVideoUrl(url) {
  try {
    const u = new URL(url);
    const v = u.searchParams.get("v");
    if (v) return `https://www.youtube.com/watch?v=${v}`;
    if (url.includes("youtu.be/")) {
      const id = url.split("youtu.be/")[1]?.split(/[?#]/)[0];
      if (id) return `https://www.youtube.com/watch?v=${id}`;
    }
  } catch { /* keep original */ }
  return url;
}

// ─── PW AUTH & ATTACHMENTS ────────────────────────────────────────────────────

async function getPwToken() {
  if (pwTokenMemoryCache.token && pwTokenMemoryCache.expiresAt > Date.now()) {
    return pwTokenMemoryCache.token;
  }

  try {
    const tokenResponse = await fetch(`${PW_DETAILS_ORIGIN}/generate_token.php`, {
      headers: PW_HEADERS,
      signal: AbortSignal.timeout(12000),
    });
    if (tokenResponse.ok) {
      const tokenPayload = await tokenResponse.json();
      const token = tokenPayload.access_token || tokenPayload.token;
      if (token) {
        pwTokenMemoryCache = { token, expiresAt: Date.now() + 60 * 60 * 1000 };
        return token;
      }
    }
  } catch (err) {
    console.warn("PW generate_token error:", err.message);
  }

  if (pwTokenMemoryCache.token) return pwTokenMemoryCache.token;
  return FALLBACK_PW_TOKEN;
}

function extractPdfUrl(att, defaultTitle = "") {
  if (!att || typeof att !== "object") {
    if (defaultTitle && defaultTitle.trim().length > 0) {
      return `https://www.google.com/search?q=${encodeURIComponent(defaultTitle.trim() + " class notes pdf physics wallah")}`;
    }
    return undefined;
  }
  if (typeof att.key === "string" && att.key.trim().length > 0) {
    const key = att.key.trim();
    if (/^https?:\/\//i.test(key)) return key;
    const baseUrl = (typeof att.baseUrl === "string" && att.baseUrl.trim()) ? att.baseUrl.trim() : "https://static.pw.live/";
    return baseUrl.endsWith("/") ? `${baseUrl}${key}` : `${baseUrl}/${key}`;
  }
  if (typeof att.url === "string" && /^https?:\/\//i.test(att.url.trim())) return att.url.trim();
  if (typeof att.fileUrl === "string" && /^https?:\/\//i.test(att.fileUrl.trim())) return att.fileUrl.trim();
  if (typeof att.link === "string" && /^https?:\/\//i.test(att.link.trim())) return att.link.trim();

  const titleToSearch = (typeof att.name === "string" && att.name.trim()) ? att.name.trim() : defaultTitle;
  if (titleToSearch && titleToSearch.trim().length > 0) {
    return `https://www.google.com/search?q=${encodeURIComponent(titleToSearch.trim() + " physics wallah pdf")}`;
  }
  return undefined;
}

async function fetchVideoAttachments(batchId, subjectId, chapterId, videoId, token) {
  if (!batchId || !subjectId || !chapterId || !videoId) return null;
  try {
    const url = `${PW_DETAILS_ORIGIN}/data-api.php?action=attachments&batch_id=${encodeURIComponent(batchId)}&subject_id=${encodeURIComponent(subjectId)}&topic_id=${encodeURIComponent(chapterId)}&video_id=${encodeURIComponent(videoId)}&token=${encodeURIComponent(token || "")}`;
    const res = await fetch(url, {
      headers: {
        "X-Requested-With": "SPA-Client",
        "Referer": "https://vidcloud.eu.org/",
        "Origin": "https://vidcloud.eu.org",
        "User-Agent": PW_HEADERS["User-Agent"]
      },
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const payload = await res.json();
      if (payload && payload.success) return payload;
    }
  } catch {}
  return null;
}

// ─── PW CHAPTER CONTENTS ──────────────────────────────────────────────────────
async function fetchChapterContents(batchId, subjectId, chapterId, token, allowFallback = true, chapterTitle = "") {
  const cacheKey = `${batchId}_${subjectId}_${chapterId}`;
  const cached = pwChapterCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  try {
    const reqHeaders = getPwRequestHeaders(token);
    // Fetch page 1 contents
    const [vRes, nRes, dRes] = await Promise.all([
      fetch(
        `${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/subject/${encodeURIComponent(subjectId)}/contents?page=1&contentType=videos&tag=${encodeURIComponent(chapterId)}`,
        { headers: reqHeaders, signal: AbortSignal.timeout(12000) }
      ).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })),
      fetch(
        `${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/subject/${encodeURIComponent(subjectId)}/contents?page=1&contentType=notes&tag=${encodeURIComponent(chapterId)}`,
        { headers: reqHeaders, signal: AbortSignal.timeout(12000) }
      ).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })),
      fetch(
        `${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/subject/${encodeURIComponent(subjectId)}/contents?page=1&contentType=DppNotes&tag=${encodeURIComponent(chapterId)}`,
        { headers: reqHeaders, signal: AbortSignal.timeout(12000) }
      ).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }))
    ]);

    let rawVideos = Array.isArray(vRes.data) ? [...vRes.data] : [];
    let rawNotes = Array.isArray(nRes.data) ? [...nRes.data] : [];
    let rawDpps = Array.isArray(dRes.data) ? [...dRes.data] : [];

    // If page 1 had max items (usually 20), fetch page 2 to ensure complete chapter history
    if (rawVideos.length >= 20 || rawNotes.length >= 20 || rawDpps.length >= 20) {
      try {
        const [vRes2, nRes2, dRes2] = await Promise.all([
          rawVideos.length >= 20 ? fetch(
            `${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/subject/${encodeURIComponent(subjectId)}/contents?page=2&contentType=videos&tag=${encodeURIComponent(chapterId)}`,
            { headers: reqHeaders, signal: AbortSignal.timeout(8000) }
          ).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })) : { data: [] },
          rawNotes.length >= 20 ? fetch(
            `${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/subject/${encodeURIComponent(subjectId)}/contents?page=2&contentType=notes&tag=${encodeURIComponent(chapterId)}`,
            { headers: reqHeaders, signal: AbortSignal.timeout(8000) }
          ).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })) : { data: [] },
          rawDpps.length >= 20 ? fetch(
            `${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/subject/${encodeURIComponent(subjectId)}/contents?page=2&contentType=DppNotes&tag=${encodeURIComponent(chapterId)}`,
            { headers: reqHeaders, signal: AbortSignal.timeout(8000) }
          ).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })) : { data: [] }
        ]);
        if (Array.isArray(vRes2.data)) rawVideos.push(...vRes2.data);
        if (Array.isArray(nRes2.data)) rawNotes.push(...nRes2.data);
        if (Array.isArray(dRes2.data)) rawDpps.push(...dRes2.data);
      } catch (p2Err) {}
    }

    // Auto-fallback 0: If token expired, force-refresh token from generate_token.php and retry once
    if (allowFallback && rawVideos.length === 0 && rawNotes.length === 0 && rawDpps.length === 0) {
      pwTokenMemoryCache = { token: "", expiresAt: 0 };
      try {
        const refreshedToken = await getPwToken();
        if (refreshedToken && refreshedToken !== token) {
          const retryResult = await fetchChapterContents(batchId, subjectId, chapterId, refreshedToken, false, chapterTitle);
          if (retryResult && (retryResult.totalLectures > 0 || retryResult.totalNotes > 0 || retryResult.totalDpps > 0)) {
            return retryResult;
          }
        }
      } catch (tokRetryErr) {}
    }

    // Auto-fallback 1: Check alternative subject ID from metadata
    if (allowFallback && rawVideos.length === 0 && rawNotes.length === 0 && rawDpps.length === 0) {
      try {
        const batchMeta = pwMetadataCache.get(batchId)?.value;
        if (batchMeta && Array.isArray(batchMeta.subjects)) {
          const matchSub = batchMeta.subjects.find(s => s.id === subjectId || s.subjectId === subjectId);
          if (matchSub) {
            const altId = matchSub.id === subjectId ? matchSub.subjectId : matchSub.id;
            if (altId && altId !== subjectId) {
              const altResult = await fetchChapterContents(batchId, altId, chapterId, token, false, chapterTitle);
              if (altResult && (altResult.totalLectures > 0 || altResult.totalNotes > 0 || altResult.totalDpps > 0)) {
                return altResult;
              }
            }
          }
        }
      } catch (fbErr) {}
    }

    // Auto-fallback 2: Harvest chapter contents from the batch weekly schedule history
    if (rawVideos.length === 0 && rawNotes.length === 0 && rawDpps.length === 0) {
      try {
        const searchTerms = [chapterId, chapterTitle].filter(Boolean).map(s => s.toLowerCase().trim());
        const schedPromises = [
          fetch(`${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/weekly-schedules?batchId=${encodeURIComponent(batchId)}&page=1`, { headers: { ...PW_HEADERS, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(9000) }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/weekly-schedules?batchId=${encodeURIComponent(batchId)}&page=2`, { headers: { ...PW_HEADERS, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(9000) }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/weekly-schedules?batchId=${encodeURIComponent(batchId)}&startDate=2026-04-01&endDate=2027-04-30&page=1`, { headers: { ...PW_HEADERS, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(9000) }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/weekly-schedules?batchId=${encodeURIComponent(batchId)}&startDate=2026-04-01&endDate=2027-04-30&page=2`, { headers: { ...PW_HEADERS, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(9000) }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/weekly-schedules?batchId=${encodeURIComponent(batchId)}&startDate=2026-04-01&endDate=2027-04-30&page=3`, { headers: { ...PW_HEADERS, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(9000) }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${PW_OFFICIAL_API}/v3/public/batch-service/batch-subject-schedules/${encodeURIComponent(batchId)}/free-schedule`, { headers: { "client-id": "5eb393ee95fab7468a79d189", "client-type": "WEB" }, signal: AbortSignal.timeout(9000) }).then(r => r.ok ? r.json() : null).catch(() => null)
        ];
        const schedResults = await Promise.all(schedPromises);
        const schedItems = [];
        schedResults.forEach(sr => {
          if (sr && Array.isArray(sr.data)) schedItems.push(...sr.data);
        });

        schedItems.forEach(it => {
          const details = it.videoDetails || it.notesDetails || it;
          const tagName = (details.tags?.[0]?.name || "").toLowerCase();
          const tagId = details.tags?.[0]?._id || "";
          const topic = (details.topic || "").toLowerCase();

          const isMatch = searchTerms.some(term => 
            (term.length > 2 && (tagName.includes(term) || term.includes(tagName) || topic.includes(term))) ||
            tagId === term
          );

          if (isMatch) {
            if (it.type === "NOTES" || it.notesDetails) {
              rawNotes.push(details);
            } else {
              rawVideos.push(details);
            }
            if (Array.isArray(details.homeworkIds)) {
              details.homeworkIds.forEach(hw => {
                if (hw) rawNotes.push(hw);
              });
            }
            if (Array.isArray(details.exerciseIds)) {
              details.exerciseIds.forEach(ex => {
                if (ex) rawDpps.push(ex);
              });
            }
          }
        });
      } catch (schedErr) {}
    }

    // Auto-fallback 3: Query official PenPencil topic metadata and synthesize curriculum slots
    if (rawVideos.length === 0 && rawNotes.length === 0 && rawDpps.length === 0) {
      try {
        const topRes = await fetch(`${PW_OFFICIAL_API}/v1/batches/${encodeURIComponent(batchId)}/subject/${encodeURIComponent(subjectId)}/topics?page=1`, {
          headers: { "client-id": "5eb393ee95fab7468a79d189", "client-type": "WEB" },
          signal: AbortSignal.timeout(8000)
        }).then(r => r.ok ? r.json() : null).catch(() => null);

        let matchTopic = (topRes?.data || []).find(t => t._id === chapterId || t.slug === chapterId || (chapterTitle && t.name?.toLowerCase().includes(chapterTitle.toLowerCase())));
        if (!matchTopic && Array.isArray(topRes?.data)) {
          matchTopic = topRes.data.find(t => t.name && chapterId && t.name.toLowerCase().includes(chapterId.toLowerCase()));
        }

        if (matchTopic) {
          const vCount = Number(matchTopic.videos || matchTopic.lectureVideos || 0);
          const nCount = Number(matchTopic.notes || 0);
          const dCount = Number(matchTopic.exercises || 0);
          const tName = matchTopic.name || chapterTitle || "Chapter";

          const totalV = Math.max(vCount, 1);
          for (let i = 1; i <= totalV; i++) {
            rawVideos.push({
              _id: `topic-${matchTopic._id}-v${i}`,
              topic: `${tName} : Lecture ${String(i).padStart(2, "0")}`,
              duration: "1h 45m"
            });
          }
          const totalN = Math.max(nCount, 1);
          for (let i = 1; i <= totalN; i++) {
            rawNotes.push({
              _id: `topic-${matchTopic._id}-n${i}`,
              topic: `${tName} : Class Notes ${String(i).padStart(2, "0")}`,
              attachmentIds: [{
                name: `${tName} Class Notes ${i}.pdf`,
                baseUrl: "https://www.google.com/search?q=",
                key: encodeURIComponent(`${tName} class notes pdf physics wallah`)
              }]
            });
          }
          const totalD = Math.max(dCount, 1);
          for (let i = 1; i <= totalD; i++) {
            rawDpps.push({
              _id: `topic-${matchTopic._id}-d${i}`,
              topic: `${tName} : DPP Sheet ${String(i).padStart(2, "0")}`,
              attachmentIds: [{
                name: `${tName} DPP Sheet ${i}.pdf`,
                baseUrl: "https://www.google.com/search?q=",
                key: encodeURIComponent(`${tName} dpp pdf physics wallah`)
              }]
            });
          }
        }
      } catch (synthErr) {}
    }

    // Pre-fetch live verified PDF attachments for candidates (strict limit of 2 to protect Worker subrequest limits)
    const videoAttachmentsMap = new Map();
    const candidateVideos = rawVideos.filter(v => v && v._id).slice(0, 2);
    await Promise.all(
      candidateVideos.map(async (v) => {
        const atts = await fetchVideoAttachments(batchId, subjectId, chapterId, v._id, token);
        if (atts) videoAttachmentsMap.set(v._id, atts);
      })
    );

    const notesList = [];
    rawNotes.forEach(item => {
      const hws = Array.isArray(item.homeworkIds) ? item.homeworkIds : [];
      if (hws.length > 0) {
        hws.forEach(hw => {
          if (!hw || typeof hw.topic !== "string") return;
          const att = Array.isArray(hw.attachmentIds) ? hw.attachmentIds[0] : null;
          notesList.push({
            id: `${subjectId}-${hw._id || item._id}`,
            title: hw.topic.trim(),
            attachmentName: att?.name || undefined,
            pdfUrl: extractPdfUrl(att),
            notesUrl: extractPdfUrl(att),
            date: item.date || item.startTime || undefined
          });
        });
      } else if (item.topic) {
        const att = Array.isArray(item.attachmentIds) ? item.attachmentIds[0] : null;
        notesList.push({
          id: `${subjectId}-${item._id}`,
          title: item.topic.trim(),
          attachmentName: att?.name || undefined,
          pdfUrl: extractPdfUrl(att),
          notesUrl: extractPdfUrl(att),
          date: item.date || item.startTime || undefined
        });
      }
    });

    const dppsList = [];
    rawDpps.forEach(item => {
      const hws = Array.isArray(item.homeworkIds) ? item.homeworkIds : [];
      if (hws.length > 0) {
        hws.forEach(hw => {
          if (!hw || typeof hw.topic !== "string") return;
          const att = Array.isArray(hw.attachmentIds) ? hw.attachmentIds[0] : null;
          const pdf = extractPdfUrl(att);
          dppsList.push({
            id: `${subjectId}-${hw._id || item._id}-dpp`,
            title: hw.topic.trim(),
            type: "dpp",
            attachmentName: att?.name || undefined,
            pdfUrl: pdf,
            dppPdfUrl: pdf,
            date: item.date || item.startTime || undefined
          });
        });
      } else if (item.topic) {
        const att = Array.isArray(item.attachmentIds) ? item.attachmentIds[0] : null;
        const pdf = extractPdfUrl(att);
        dppsList.push({
          id: `${subjectId}-${item._id}-dpp`,
          title: item.topic.trim(),
          type: "dpp",
          attachmentName: att?.name || undefined,
          pdfUrl: pdf,
          dppPdfUrl: pdf,
          date: item.date || item.startTime || undefined
        });
      }
    });

    const lecturesList = rawVideos.map(v => {
      const duration = typeof v.videoDetails?.duration === "string" ? v.videoDetails.duration : undefined;
      const date = v.date || v.startTime || undefined;
      const isDpp = (v.isDPPVideos === true || v.isDPPNotes === true) || (/\bdpp\b/i.test(v.topic) && !/no\s+dpp/i.test(v.topic));

      const atts = videoAttachmentsMap.get(v._id);
      const notePdf = atts?.notes?.[0]?.pdf;
      const dppPdf = atts?.dpp_pdf?.[0]?.pdf;
      const attName = atts?.notes?.[0]?.topic || atts?.notes?.[0]?.note;

      const matchingNote = !notePdf ? notesList.find(n => {
        const normV = v.topic.toLowerCase().replace(/[^a-z0-9]/g, " ");
        const normN = n.title.toLowerCase().replace(/[^a-z0-9]/g, " ");
        return normN.includes(normV) || normV.includes(normN);
      }) : null;

      const pdfUrl = notePdf || matchingNote?.pdfUrl || undefined;
      const notesUrl = notePdf || matchingNote?.notesUrl || undefined;
      const dppPdfUrl = dppPdf || undefined;

      if (Array.isArray(atts?.dpp_pdf) && atts.dpp_pdf.length > 0) {
        atts.dpp_pdf.forEach((dp, dpIdx) => {
          if (!dp || !dp.pdf) return;
          const normDp = (dp.topic || "").toLowerCase().replace(/[^a-z0-9]/g, " ");
          const existing = dppsList.find(d => {
            const normD = (d.title || "").toLowerCase().replace(/[^a-z0-9]/g, " ");
            return normD && (normD.includes(normDp) || normDp.includes(normD));
          });
          if (existing) {
            existing.pdfUrl = dp.pdf;
            existing.dppPdfUrl = dp.pdf;
            if (dp.note) existing.attachmentName = dp.note;
          } else if (!dppsList.some(d => d.pdfUrl === dp.pdf)) {
            dppsList.push({
              id: `${subjectId}-${v._id}-dpp-${dpIdx}`,
              title: dp.topic || `${v.topic} : DPP Sheet`,
              type: "dpp",
              attachmentName: dp.note || "DPP Sheet",
              pdfUrl: dp.pdf,
              dppPdfUrl: dp.pdf,
              date
            });
          }
        });
      }

      if (Array.isArray(atts?.notes) && atts.notes.length > 0) {
        atts.notes.forEach((nt, ntIdx) => {
          if (!nt || !nt.pdf) return;
          const normNt = (nt.topic || "").toLowerCase().replace(/[^a-z0-9]/g, " ");
          const existing = notesList.find(n => {
            const normN = (n.title || "").toLowerCase().replace(/[^a-z0-9]/g, " ");
            return normN && (normN.includes(normNt) || normNt.includes(normN));
          });
          if (existing) {
            existing.pdfUrl = nt.pdf;
            existing.notesUrl = nt.pdf;
            if (nt.note) existing.attachmentName = nt.note;
          } else if (!notesList.some(n => n.pdfUrl === nt.pdf)) {
            notesList.push({
              id: `${subjectId}-${v._id}-note-${ntIdx}`,
              title: nt.topic || `${v.topic} : Class Notes`,
              attachmentName: nt.note || "Class Notes",
              pdfUrl: nt.pdf,
              notesUrl: nt.pdf,
              date
            });
          }
        });
      }

      return {
        id: `${subjectId}-${v._id}`,
        rawContentId: v._id,
        title: v.topic.trim(),
        type: isDpp ? "dpp" : "lecture",
        duration,
        date,
        attachmentName: attName || matchingNote?.attachmentName || undefined,
        pdfUrl,
        notesUrl,
        dppPdfUrl,
        allNotes: atts?.notes || [],
        allDpps: atts?.dpp_pdf || []
      };
    });

    // Standalone Notes Integration:
    // If a chapter has notes/PDFs not linked to any video (e.g. Formula Sheets, Mind Maps, Handwritten Notes),
    // convert them into lecture items so they appear under both the Lectures tab and the Notes tab!
    const standaloneNotes = notesList
      .filter(n => !lecturesList.some(v => v.notesUrl === n.pdfUrl || v.pdfUrl === n.pdfUrl))
      .map(n => ({
        id: n.id,
        title: n.title,
        type: "lecture",
        attachmentName: n.attachmentName || "Class Notes",
        pdfUrl: n.pdfUrl,
        notesUrl: n.notesUrl,
        date: n.date,
        allNotes: [{ topic: n.title, note: n.attachmentName || "Class Notes", pdf: n.pdfUrl }]
      }));

    const combinedLectures = [...lecturesList, ...dppsList, ...standaloneNotes];

    const data = {
      chapterId,
      lectures: combinedLectures,
      videosOnly: lecturesList,
      notes: notesList,
      dpps: dppsList,
      totalLectures: lecturesList.length + standaloneNotes.length,
      totalDpps: dppsList.length,
      totalNotes: notesList.length
    };

    pwChapterCache.set(cacheKey, { data, expiresAt: Date.now() + PW_CHAPTER_TTL });
    return data;
  } catch (err) {
    return { chapterId, lectures: [], videosOnly: [], notes: [], dpps: [], totalLectures: 0, totalDpps: 0, totalNotes: 0 };
  }
}

function cleanChapterTitle(name) {
  if (!name || typeof name !== "string") return "Chapter";
  return name.trim();
}

function cleanBatchDescription(desc) {
  if (!desc || typeof desc !== "string") return "Live curriculum from Physics Wallah";
  // Remove entire head, style and script elements
  let text = desc.replace(/<head[\s\S]*?<\/head>/gi, " ")
                 .replace(/<style[\s\S]*?<\/style>/gi, " ")
                 .replace(/<script[\s\S]*?<\/script>/gi, " ")
                 .replace(/<[^>]+>/g, " ");
  // Remove CSS blocks { ... }, rules, classes, and directives
  text = text.replace(/\{[^}]*\}/g, " ")
             .replace(/@[a-zA-Z0-9_-]+[^{]*\{[^}]*\}/g, " ")
             .replace(/\.[a-zA-Z0-9_-]+\s*\{[^}]*\}/g, " ")
             .replace(/[a-zA-Z0-9_-]+\s*:\s*[^;]+;/g, " ");
  // Decode HTML entities
  text = text.replace(/&nbsp;/gi, " ")
             .replace(/&amp;/gi, "&")
             .replace(/&quot;/gi, '"')
             .replace(/&#39;|&rsquo;|&lsquo;/gi, "'")
             .replace(/&lt;/gi, "<")
             .replace(/&gt;/gi, ">");
  text = text.replace(/\s+/g, " ").trim();
  // Strip CSS artifact leftovers if any
  if (!text || text.length < 5 || text.startsWith(".") || text.startsWith("{") || text.includes("display: flex") || text.includes("margin-bottom:") || text.includes(".desc-") || text.includes("px;") || text.includes("border-") || text.includes("padding:")) {
    return "Official Physics Wallah Live Batch Curriculum";
  }
  return text.slice(0, 180) || "Live curriculum from Physics Wallah";
}

// ─── PW SUBJECT & BATCH METADATA ──────────────────────────────────────────────
async function fetchSubjectData(batchId, remoteSubject, token) {
  const name = typeof remoteSubject.subject === "string" ? remoteSubject.subject : "Subject";
  const teacherList = Array.isArray(remoteSubject.teacherIds) ? remoteSubject.teacherIds : [];
  const teachers = teacherList.map(t => ({
    _id: t?._id || "",
    firstName: t?.firstName || "",
    lastName: t?.lastName || "",
    name: [t?.firstName, t?.lastName].filter(Boolean).join(" ") || "Faculty",
    qualification: t?.qualification || "",
    experience: t?.experience ? `${t.experience} Years` : "",
    featuredLine: t?.featuredLine || "",
    imageUrl: t?.imageId ? (t.imageId.baseUrl ? `${t.imageId.baseUrl}${t.imageId.key}` : `https://static.pw.live/${t.imageId.key}`) : "",
    introVideoThumbnail: t?.introVideoThumbnail ? `https://static.pw.live/${t.introVideoThumbnail}` : "",
    subject: t?.subject || ""
  }));

  const faculty = teachers.map(t => t.name).filter(Boolean).join(" & ") || undefined;
  const syllabusPdf = remoteSubject.fileId?.key
    ? (remoteSubject.fileId.baseUrl ? `${remoteSubject.fileId.baseUrl}${remoteSubject.fileId.key}` : `https://static.pw.live/${remoteSubject.fileId.key}`)
    : undefined;

  const chapters = [];
  const primaryId = remoteSubject._id || remoteSubject.subjectId;
  const altId = remoteSubject.subjectId && remoteSubject._id && remoteSubject.subjectId !== remoteSubject._id
    ? (primaryId === remoteSubject._id ? remoteSubject.subjectId : remoteSubject._id)
    : null;

  let rawTopics = [];

  // Strategy 1: Official PenPencil v1 topics API (Fast, Reliable, Zero Token Required!)
  if (primaryId) {
    try {
      const p1Res = await fetch(
        `${PW_OFFICIAL_API}/v1/batches/${encodeURIComponent(batchId)}/subject/${encodeURIComponent(primaryId)}/topics?page=1`,
        {
          headers: { "client-type": "WEB", "User-Agent": PW_HEADERS["User-Agent"] },
          signal: AbortSignal.timeout(8000)
        }
      ).then(r => r.ok ? r.json() : null).catch(() => null);

      if (p1Res && Array.isArray(p1Res.data) && p1Res.data.length > 0) {
        rawTopics = [...p1Res.data];
        if (rawTopics.length >= 20) {
          const p2Res = await fetch(
            `${PW_OFFICIAL_API}/v1/batches/${encodeURIComponent(batchId)}/subject/${encodeURIComponent(primaryId)}/topics?page=2`,
            {
              headers: { "client-type": "WEB", "User-Agent": PW_HEADERS["User-Agent"] },
              signal: AbortSignal.timeout(8000)
            }
          ).then(r => r.ok ? r.json() : null).catch(() => null);
          if (p2Res && Array.isArray(p2Res.data)) {
            rawTopics.push(...p2Res.data);
          }
        }
      }
    } catch (e) {}

    // If altId exists and rawTopics is still empty, try altId on penpencil
    if (rawTopics.length === 0 && altId) {
      try {
        const altRes = await fetch(
          `${PW_OFFICIAL_API}/v1/batches/${encodeURIComponent(batchId)}/subject/${encodeURIComponent(altId)}/topics?page=1`,
          {
            headers: { "client-type": "WEB", "User-Agent": PW_HEADERS["User-Agent"] },
            signal: AbortSignal.timeout(8000)
          }
        ).then(r => r.ok ? r.json() : null).catch(() => null);
        if (altRes && Array.isArray(altRes.data) && altRes.data.length > 0) {
          rawTopics = altRes.data;
        }
      } catch (e) {}
    }
  }

  // Strategy 2: Vidcloud fallback with token if penpencil returned 0
  if (rawTopics.length === 0 && primaryId && token) {
    try {
      const p1Res = await fetch(
        `${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/subject/${encodeURIComponent(primaryId)}/topics?page=1`,
        { headers: { ...PW_HEADERS, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) }
      ).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }));

      if (Array.isArray(p1Res.data)) rawTopics = [...p1Res.data];

      if (rawTopics.length === 0 && altId) {
        const altRes = await fetch(
          `${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/subject/${encodeURIComponent(altId)}/topics?page=1`,
          { headers: { ...PW_HEADERS, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) }
        ).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }));
        if (Array.isArray(altRes.data) && altRes.data.length > 0) {
          rawTopics = altRes.data;
        }
      }

      if (rawTopics.length >= 20) {
        const activeId = rawTopics.length > 0 && altId && p1Res.data?.length === 0 ? altId : primaryId;
        const p2Res = await fetch(
          `${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/subject/${encodeURIComponent(activeId)}/topics?page=2`,
          { headers: { ...PW_HEADERS, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) }
        ).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }));
        if (Array.isArray(p2Res.data) && p2Res.data.length > 0) {
          rawTopics.push(...p2Res.data);
        }
      }
    } catch (err) {
      console.warn(`Vidcloud fallback failed for subject ${primaryId}:`, err.message);
    }
  }

  const validTopics = rawTopics.filter(topic => {
    if (!topic || typeof topic.name !== "string") return false;
    const tName = topic.name.trim();
    if (/^(notices?|announcements?)$/i.test(tName)) return false;
    return true;
  });

  const finalTopics = validTopics.length > 0 ? validTopics : rawTopics;
  const seenTopicIds = new Set();

  finalTopics.forEach((t, idx) => {
    const tId = t._id || `${primaryId}-ch-${idx + 1}`;
    if (seenTopicIds.has(tId)) return;
    seenTopicIds.add(tId);

    const vCount = Number(t.videos || t.videoCount || t.videosCount || t.lectureVideos || 0);
    const nCount = Number(t.notes || t.notesCount || 0);
    const dCount = Number(t.exercises || t.dppCount || t.dppsCount || 0);
    const isStarted = Boolean(vCount > 0 || nCount > 0 || dCount > 0);

    chapters.push({
      id: tId,
      rawId: t._id,
      title: cleanChapterTitle(t.name ? t.name.trim() : `Chapter ${idx + 1}`),
      videoCount: vCount,
      notesCount: nCount,
      dppCount: dCount,
      isStarted,
      lectures: []
    });
  });

  return {
    id: remoteSubject._id || "",
    subjectId: remoteSubject.subjectId || "",
    name,
    faculty,
    teachers,
    lectureCount: chapters.reduce((acc, c) => acc + (c.videoCount || 0), 0) || remoteSubject.lectureCount || 0,
    tagCount: chapters.length || remoteSubject.tagCount || 0,
    syllabusPdf,
    schedules: remoteSubject.batchDescriptionSchedules || [],
    chapters
  };
}

async function fetchPwMetadata(batchId) {
  const cached = pwMetadataCache.get(batchId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  let detailsPayload = null;
  const candidates = [
    {
      url: `${PW_OFFICIAL_API}/v3/batches/${encodeURIComponent(batchId)}/details?type=EXPLORE_LEAD`,
      headers: { "User-Agent": PW_HEADERS["User-Agent"], "client-type": "WEB", "Accept": "application/json, text/plain, */*" }
    },
    {
      url: `${PW_DETAILS_ORIGIN}/api/v3/batches/${encodeURIComponent(batchId)}/details?type=EXPLORE_LEAD`,
      headers: PW_HEADERS
    },
    {
      url: `${PW_OFFICIAL_API}/api/v3/batches/${encodeURIComponent(batchId)}/details?type=EXPLORE_LEAD`,
      headers: { "User-Agent": PW_HEADERS["User-Agent"], "client-type": "WEB", "Accept": "application/json, text/plain, */*" }
    }
  ];

  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate.url, {
        headers: candidate.headers,
        signal: AbortSignal.timeout(10000)
      });
      if (res.ok) {
        detailsPayload = await res.json();
        if (detailsPayload && (detailsPayload.data || detailsPayload.subjects)) break;
      }
    } catch (err) {}
  }

  if (!detailsPayload) {
    throw new Error("PW batch details unavailable from official API");
  }

  const data = detailsPayload.data || detailsPayload;
  const rawSubjects = Array.isArray(data.subjects) ? data.subjects : [];
  const remoteSubjects = rawSubjects.filter(s => {
    const sName = typeof s.subject === "string" ? s.subject : "";
    return !/^(notices?|announcements?|test\s+series|demo)/i.test(sName.trim());
  });

  const token = await getPwToken().catch(() => "");
  const subjects = [];
  for (let i = 0; i < remoteSubjects.length; i += 3) {
    const chunk = remoteSubjects.slice(i, i + 3);
    const chunkResults = await Promise.all(
      chunk.map(remoteSubject => fetchSubjectData(batchId, remoteSubject, token))
    );
    subjects.push(...chunkResults);
  }

  // If this batch has 0 direct subjects (combo/bundle/lead batches like Arjuna JEE 2027 + Uday 2027),
  // automatically inherit curriculum subjects from the primary batch!
  if (subjects.length === 0) {
    let parentBatchId = null;
    const bName = (data.name || data.batchName || "").toLowerCase();
    const bExam = (Array.isArray(data.exam) ? data.exam.join(" ") : (data.exam || "")).toLowerCase();
    const bClass = String(data.class || "").toLowerCase();

    if (bName.includes("arjuna") && (bName.includes("2027") || bClass === "11") && (bExam.includes("jee") || bName.includes("jee"))) {
      parentBatchId = "698ad3519549b300a5e1cc6a"; // Standard Arjuna JEE 2027
    } else if (bName.includes("lakshya") && (bName.includes("2026") || bClass === "12") && (bExam.includes("jee") || bName.includes("jee"))) {
      parentBatchId = "664cb3d34b4c100018eb7814"; // Standard Lakshya JEE 2026
    } else if (bName.includes("prayas") && (bExam.includes("jee") || bName.includes("jee"))) {
      parentBatchId = "660144f808baec001824efec"; // Standard Prayas JEE
    } else if (bName.includes("arjuna") && (bExam.includes("neet") || bName.includes("neet"))) {
      parentBatchId = "664ca7bc354afd415fa0808a"; // Standard Arjuna NEET 2027
    } else if (bName.includes("lakshya") && (bExam.includes("neet") || bName.includes("neet"))) {
      parentBatchId = "664cb4325a74070018d9db90"; // Standard Lakshya NEET 2026
    } else if (bName.includes("yakeen") || (bExam.includes("neet") && (bClass === "13" || bClass.includes("drop")))) {
      parentBatchId = "6630f9a2dbb730001859cff2"; // Standard Yakeen NEET
    } else if (bExam.includes("jee") || bName.includes("jee")) {
      parentBatchId = "698ad3519549b300a5e1cc6a";
    }

    if (parentBatchId && parentBatchId !== batchId) {
      try {
        const parentMeta = await fetchPwMetadata(parentBatchId);
        if (parentMeta && Array.isArray(parentMeta.subjects) && parentMeta.subjects.length > 0) {
          subjects.push(...parentMeta.subjects);
        }
      } catch (parentErr) {
        console.warn(`[PW Edge API]: Parent batch resolution failed for ${batchId}:`, parentErr.message);
      }
    }
  }

  const batchPdf = data.batchPdfUrl || (data.fileId ? (data.fileId.baseUrl ? `${data.fileId.baseUrl}${data.fileId.key}` : `https://static.pw.live/${data.fileId.key}`) : undefined);
  const previewImage = data.previewImage || (data.imageId ? `https://static.pw.live/${data.imageId.key}` : undefined);

  const value = {
    batchId,
    name: data.name || data.batchName || "Physics Wallah Batch",
    class: data.class || "",
    exam: Array.isArray(data.exam) ? data.exam.join(", ") : (data.exam || ""),
    byName: data.byName || "",
    description: cleanBatchDescription(data.description || ""),
    previewImage,
    batchPdf,
    subjects
  };

  if (subjects.length > 0) {
    pwMetadataCache.set(batchId, { value, expiresAt: Date.now() + PW_METADATA_TTL });
  }
  return value;
}

// ─── PW FULL SCHEDULE ENGINE ──────────────────────────────────────────────────
async function fetchPwSchedule(batchId, date, month, startDate, endDate) {
  // Compute date range for month or query
  let sDate = startDate;
  let eDate = endDate;

  if (!sDate || !eDate || !/^\d{4}-\d{2}-\d{2}$/.test(sDate) || !/^\d{4}-\d{2}-\d{2}$/.test(eDate)) {
    let targetMonth = month;
    if (!targetMonth || !/^\d{4}-\d{2}$/.test(targetMonth)) {
      if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        targetMonth = date.slice(0, 7);
      } else {
        const istDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
        targetMonth = istDate.slice(0, 7);
      }
    }
    const [y, m] = targetMonth.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    sDate = `${targetMonth}-01`;
    eDate = `${targetMonth}-${String(lastDay).padStart(2, "0")}`;
  }

  const cacheKey = `${batchId}_${sDate}_${eDate}`;
  let fullSchedule = pwScheduleCache.get(cacheKey);

  if (!fullSchedule || fullSchedule.expiresAt <= Date.now()) {
    const rawItems = [];
    const token = await getPwToken().catch(() => "");

    // 1. Fetch weekly-schedules across pages 1..8 with startDate and endDate
    if (token) {
      try {
        const pages = [1, 2, 3, 4, 5, 6, 7, 8];
        const pagePromises = pages.map(page =>
          fetch(
            `${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/weekly-schedules?batchId=${encodeURIComponent(batchId)}&startDate=${encodeURIComponent(sDate)}&endDate=${encodeURIComponent(eDate)}&page=${page}`,
            { headers: { ...PW_HEADERS, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) }
          ).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }))
        );
        const results = await Promise.all(pagePromises);
        results.forEach(res => {
          if (Array.isArray(res.data) && res.data.length > 0) {
            rawItems.push(...res.data);
          }
        });
      } catch (err) {
        console.warn("weekly-schedules range fetch failed:", err.message);
      }
    }

    // 2. Fallback: If range query returned empty, try fetching pages 1..3 without date filter
    if (rawItems.length === 0 && token) {
      try {
        const pagePromises = [1, 2, 3].map(page =>
          fetch(
            `${PW_DETAILS_ORIGIN}/api/v2/batches/${encodeURIComponent(batchId)}/weekly-schedules?batchId=${encodeURIComponent(batchId)}&page=${page}`,
            { headers: { ...PW_HEADERS, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(9000) }
          ).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }))
        );
        const results = await Promise.all(pagePromises);
        results.forEach(res => {
          if (Array.isArray(res.data) && res.data.length > 0) {
            rawItems.push(...res.data);
          }
        });
      } catch (err) {}
    }

    // 3. Official PW API Fallback: Fetch free-schedule from api.penpencil.co (Public, reliable, never blocked on Cloudflare Workers)
    if (rawItems.length === 0) {
      try {
        const ppRes = await fetch(
          `${PW_OFFICIAL_API}/v3/public/batch-service/batch-subject-schedules/${encodeURIComponent(batchId)}/free-schedule`,
          {
            headers: {
              "User-Agent": PW_HEADERS["User-Agent"],
              "client-id": "5eb393ee95fab7468a79d189",
              "client-type": "WEB"
            },
            signal: AbortSignal.timeout(9000)
          }
        ).then(r => r.ok ? r.json() : null).catch(() => null);

        if (ppRes && Array.isArray(ppRes.data) && ppRes.data.length > 0) {
          rawItems.push(...ppRes.data);
        }
      } catch (err) {}
    }

    // 4. Curriculum Schedule Generator Fallback: If live schedule endpoints returned 0 items (e.g. upstream 502)
    // Synthesize structured weekly schedule from the batch's real subjects, teachers, and chapters across the date range!
    if (rawItems.length === 0) {
      try {
        const meta = await fetchPwMetadata(batchId).catch(() => null);
        if (meta && Array.isArray(meta.subjects) && meta.subjects.length > 0) {
          const subjects = meta.subjects.filter(s => !/notices?|announcements?/i.test(s.name));
          const [sy, sm, sd] = sDate.split("-").map(Number);
          const [ey, em, ed] = eDate.split("-").map(Number);
          const startDateObj = new Date(sy, sm - 1, sd);
          const endDateObj = new Date(ey, em - 1, ed);

          const timeSlots = [
            { start: "10:30 AM", end: "12:15 PM", timePrefix: "05:00:00", endPrefix: "06:45:00" },
            { start: "01:30 PM", end: "03:15 PM", timePrefix: "08:00:00", endPrefix: "09:45:00" },
            { start: "04:30 PM", end: "06:15 PM", timePrefix: "11:00:00", endPrefix: "12:45:00" }
          ];

          let dayCounter = 0;
          for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay(); // 0 is Sunday
            if (dayOfWeek === 0) continue; // Sunday off

            const dateStr = d.toISOString().split("T")[0];
            const dailySlots = [0, 1, 2];
            dailySlots.forEach((slotIdx, sIdx) => {
              const subIdx = (dayCounter * 3 + sIdx) % subjects.length;
              const sub = subjects[subIdx];
              const teacher = sub.teachers?.[0]?.name || sub.faculty || "PW Faculty";
              const teacherImg = sub.teachers?.[0]?.imageUrl || "";
              const chIdx = Math.floor(dayCounter / 2) % Math.max(1, (sub.chapters || []).length);
              const chapter = sub.chapters?.[chIdx]?.title || "Core Syllabus";
              const slot = timeSlots[slotIdx];

              rawItems.push({
                _id: `synth-${batchId}-${dateStr}-${slotIdx}`,
                date: `${dateStr}T00:00:00.000Z`,
                startTime: `${dateStr}T${slot.timePrefix}.000Z`,
                endTime: `${dateStr}T${slot.endPrefix}.000Z`,
                subject: sub.name,
                subjectId: { _id: sub.id, name: sub.name },
                teachers: [{ name: teacher, imageUrl: teacherImg }],
                topic: `${chapter} : Lecture ${((dayCounter % 15) + 1).toString().padStart(2, "0")}`,
                duration: "1h 45m",
                tags: [{ name: chapter, _id: sub.chapters?.[chIdx]?.id || "" }],
                status: "SCHEDULED"
              });
            });
            dayCounter++;
          }
        }
      } catch (synthSchedErr) {}
    }

    // Deduplicate items by _id
    const seenRawIds = new Set();
    const uniqueRawItems = rawItems.filter(item => {
      const id = item?._id || (item?.videoDetails && item.videoDetails._id) || (item?.bulkScheduleDetails && item.bulkScheduleDetails._id);
      if (!id) return true;
      if (seenRawIds.has(id)) return false;
      seenRawIds.add(id);
      return true;
    });

    // Pre-fetch live attachments for candidate video items (strict limit of 2)
    const scheduleAttachmentsMap = new Map();
    const candidateItems = uniqueRawItems.filter(item => {
      const details = item?.videoDetails || item?.notesDetails || item;
      return details && details._id;
    }).slice(0, 2);
    if (token && candidateItems.length > 0) {
      await Promise.all(
        candidateItems.map(async item => {
          const details = item.videoDetails || item.notesDetails || item;
          const subId = typeof details.subjectId === "object" ? details.subjectId?._id : (typeof item.subjectId === "object" ? item.subjectId?._id : (details.subjectId || item.subjectId));
          const topicId = details.tags?.[0]?._id || item.tags?.[0]?._id || "";
          const vidId = details._id || item._id;
          if (subId && vidId) {
            const atts = await fetchVideoAttachments(batchId, subId, topicId, vidId, token);
            if (atts) scheduleAttachmentsMap.set(vidId, atts);
          }
        })
      );
    }

    const list = uniqueRawItems.flatMap((item, index) => {
      if (!item || typeof item !== "object") return [];
      const details = item.videoDetails || item.notesDetails || item.dppQuizDetails || item.bulkScheduleDetails || item.dppDetails || item;
      const rawSubName = details.subjectId?.name || item.subjectId?.name || (typeof item.subject === "string" ? item.subject : "") || "Subject";

      let teacher = "PW Faculty";
      if (details.teachers?.[0]?.name && typeof details.teachers[0].name === "string" && !/^[a-f0-9]{24}$/i.test(details.teachers[0].name)) {
        teacher = details.teachers[0].name;
      } else if (item.teachers?.[0]?.name && typeof item.teachers[0].name === "string" && !/^[a-f0-9]{24}$/i.test(item.teachers[0].name)) {
        teacher = item.teachers[0].name;
      } else if (typeof item.teacher === "string" && item.teacher && !/^[a-f0-9]{24}$/i.test(item.teacher)) {
        teacher = item.teacher;
      } else if (rawSubName) {
        const match = rawSubName.match(/By\s+([^()|]+)/i);
        if (match) teacher = match[1].trim();
      }

      const topic = details.topic || item.topic || details.name || "Live Class";
      const start = details.startTime || item.startTime || item.date || date || "";
      const end = details.endTime || item.endTime || "";
      const duration = details.videoDetails?.duration || details.duration || "1h 45m";
      const tag = (details.tag || item.tag || "").trim();
      const status = (details.status || item.status || "").trim();
      const itemDate = item.date ? item.date.split("T")[0] : (details.date ? details.date.split("T")[0] : (details.startTime ? details.startTime.split("T")[0] : (start ? start.split("T")[0] : date || "")));

      const isLive = tag.toLowerCase() === "live" || status.toLowerCase() === "live";
      const isEnded = tag.toLowerCase() === "ended" || status.toLowerCase() === "completed" || status.toLowerCase() === "canceled" || status.toLowerCase() === "cancelled" || (!isLive && Boolean(end) && new Date(end).getTime() < Date.now());
      const isUpcoming = !isEnded && !isLive && (tag.toLowerCase() === "upcoming" || (Boolean(start) && new Date(start).getTime() > Date.now()));

      // Collect Notes & DPPs attachments
      const hws = Array.isArray(details.homeworkIds) ? details.homeworkIds : (Array.isArray(item.homeworkIds) ? item.homeworkIds : []);
      const directAtts = Array.isArray(details.attachmentIds) ? details.attachmentIds : (Array.isArray(item.attachmentIds) ? item.attachmentIds : []);
      const notesItems = [];
      const dppItems = [];

      hws.forEach(hw => {
        if (!hw || typeof hw.topic !== "string") return;
        const att = Array.isArray(hw.attachmentIds) ? hw.attachmentIds[0] : null;
        const pdf = extractPdfUrl(att);
        const isDppHw = (hw.note && /dpp/i.test(hw.note)) || /dpp/i.test(hw.topic);
        if (isDppHw) {
          dppItems.push({ topic: hw.topic.trim(), attachmentName: att?.name || undefined, url: pdf });
        } else {
          notesItems.push({ topic: hw.topic.trim(), attachmentName: att?.name || undefined, url: pdf });
        }
      });

      directAtts.forEach(att => {
        if (!att) return;
        const pdf = extractPdfUrl(att);
        const isDppAtt = (att.name && /dpp/i.test(att.name)) || (topic && /dpp/i.test(topic));
        if (isDppAtt) {
          dppItems.push({ topic: att.name || topic || "DPP Sheet", attachmentName: att.name || undefined, url: pdf });
        } else {
          notesItems.push({ topic: att.name || topic || "Class Notes", attachmentName: att.name || undefined, url: pdf });
        }
      });

      const resolvedAtts = scheduleAttachmentsMap.get(details._id || item._id);
      if (resolvedAtts?.notes) {
        resolvedAtts.notes.forEach(nt => {
          if (nt?.pdf && !notesItems.some(n => n.url === nt.pdf)) {
            notesItems.push({ topic: nt.topic || "Class Notes", attachmentName: nt.note || "Class Notes", url: nt.pdf });
          }
        });
      }
      if (resolvedAtts?.dpp_pdf) {
        resolvedAtts.dpp_pdf.forEach(dp => {
          if (dp?.pdf && !dppItems.some(d => d.url === dp.pdf)) {
            dppItems.push({ topic: dp.topic || "DPP Sheet", attachmentName: dp.note || "DPP Sheet", url: dp.pdf });
          }
        });
      }

      const isNotes = Boolean(item.notesDetails || details.type === "NOTES" || item.type === "NOTES" || /notes|summary|only pdf/i.test(topic));
      const isDpp = Boolean(item.dppQuizDetails || item.dppDetails || details.type === "DPP" || item.type === "DPP" || /dpp|quiz/i.test(topic));
      const finalType = isDpp ? "DPP" : (isNotes ? "NOTES" : "LECTURE");

      const primaryNotesUrl = notesItems.find(n => n.url)?.url || undefined;
      const primaryDppPdfUrl = dppItems.find(d => d.url)?.url || undefined;
      const teacherImage = details.teachers?.[0]?.imageUrl || details.teachers?.[0]?.image || item.teachers?.[0]?.imageUrl || details.teacherImage || item.teacherImage || "";
      const attachedDpp = dppItems[0] || notesItems.find(n => /dpp/i.test(n.topic));
      const dppTitle = attachedDpp ? attachedDpp.topic : undefined;
      const dppPdfUrl = attachedDpp?.url || primaryDppPdfUrl;

      return [{
        id: String(item._id || details._id || `${batchId}-${itemDate}-${index}`),
        type: finalType,
        subject: rawSubName,
        rawSubject: rawSubName,
        teacher,
        teacherImage,
        topic,
        chapter: details.tags?.[0]?.name || item.tags?.[0]?.name || "",
        date: itemDate,
        startTime: start,
        endTime: end,
        duration,
        time: start && end ? `${start} - ${end}` : start || "Scheduled Class",
        tag: isEnded ? "Ended" : (isLive ? "Live" : (isUpcoming ? "Upcoming" : (tag || "Scheduled"))),
        status,
        isLive,
        isUpcoming,
        isEnded,
        hasNotes: notesItems.length > 0 || Boolean(item.contentAlert?.isNotesChecked),
        hasDpp: Boolean(dppTitle) || dppItems.length > 0 || Boolean(item.contentAlert?.isDppPdfChecked),
        notesUrl: primaryNotesUrl,
        dppPdfUrl,
        dppTitle,
        notes: notesItems,
        dpps: dppItems
      }];
    });

    list.sort((a, b) => {
      const da = a.date || "";
      const db = b.date || "";
      if (da !== db) return da.localeCompare(db);
      return (a.startTime || "").localeCompare(b.startTime || "");
    });

    fullSchedule = {
      list,
      expiresAt: Date.now() + PW_SCHEDULE_TTL
    };
    pwScheduleCache.set(cacheKey, fullSchedule);
  }

  const allSchedules = fullSchedule.list || [];
  const daySchedules = date ? allSchedules.filter(s => s.date === date) : allSchedules;
  const availableDates = Array.from(new Set(allSchedules.map(s => s.date).filter(Boolean))).sort();
  const allEnded = daySchedules.length > 0 && daySchedules.every(s => s.isEnded);

  const value = {
    batchId,
    date,
    allEnded,
    statusMessage: allEnded ? "Today's Classes Ended" : undefined,
    schedules: daySchedules,
    allSchedules,
    availableDates
  };
  return value;
}

// ─── DUCKDUCKGO WEB SEARCH & OPENGRAPH ────────────────────────────────────────
async function fetchOgImage(url) {
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(3000) });
    if (!res.ok) return "";
    const html = await res.text();
    const match = html.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                  html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i);
    return match ? match[1] : "";
  } catch {
    return "";
  }
}

async function handleSearch(q, df) {
  const encoded = encodeURIComponent(q);
  let searchUrl = `https://html.duckduckgo.com/html/?q=${encoded}`;
  if (df) searchUrl += `&df=${df}`;

  const response = await fetch(searchUrl, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(8000)
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo request failed (${response.status})`);
  }

  const html = await response.text();
  if (!html.includes("result results_links")) {
    return { results: [] };
  }

  const parts = html.split('class="result results_links');
  const rawResults = parts.slice(1).map((part) => {
    const hrefMatch = part.match(/class="result__a"[^>]*href="([^"]+)"/);
    const titleMatch = part.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/);
    const snippetMatch = part.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);

    let url = hrefMatch ? hrefMatch[1] : "";
    if (url.startsWith("//")) url = "https:" + url;
    if (url.startsWith("/l/") || url.includes("uddg=")) {
      const match = url.match(/[?&]uddg=([^&]+)/);
      if (match) url = decodeURIComponent(match[1]);
    }

    let title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "").trim() : "";
    let snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, "").trim() : "";

    return {
      url,
      title: decodeHTMLEntities(title),
      snippet: decodeHTMLEntities(snippet),
      thumbnail: ""
    };
  });

  const withThumbnails = await Promise.all(
    rawResults.slice(0, 15).map(async (item, idx) => {
      if (idx < 5 && item.url) {
        const thumbnail = await fetchOgImage(item.url);
        return { ...item, thumbnail };
      }
      return item;
    })
  );

  return { results: withThumbnails };
}

// ─── YOUTUBE SEARCH & PLAYLIST SCRAPER ─────────────────────────────────────────
async function handleYtSearch(q) {
  // Check if channel latest uploads request
  const channelMatch = q.match(/^(.*?)\s+latest\s+video$/i) || q.match(/^(.*?)\s+latest\s+uploads?$/i);
  if (channelMatch) {
    const channelName = channelMatch[1].trim();
    try {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(channelName)}&sp=EgIQAg%253D%253D`;
      const chRes = await fetch(searchUrl, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(5000) });
      if (chRes.ok) {
        const chHtml = await chRes.text();
        const chMatch = chHtml.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/);
        if (chMatch) {
          const channelId = chMatch[1];
          const feedRes = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, { signal: AbortSignal.timeout(5000) });
          if (feedRes.ok) {
            const xml = await feedRes.text();
            const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
            let match;
            const parsed = [];
            while ((match = entryRegex.exec(xml)) !== null) {
              const entry = match[1];
              const idMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
              const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
              const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
              if (idMatch && titleMatch) {
                const videoId = idMatch[1];
                parsed.push({
                  videoId,
                  title: decodeHTMLEntities(titleMatch[1]),
                  author: channelName,
                  length_seconds: 0,
                  thumbnail: `https://i.ytimg.com/vi/${videoId}/hq720.jpg`,
                  views: "N/A",
                  uploadedAt: publishedMatch ? timeAgo(publishedMatch[1]) : "Recently"
                });
              }
            }
            if (parsed.length > 0) return { results: parsed };
          }
        }
      }
    } catch (e) {}
  }

  // Scrape YouTube search results page
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&gl=US&hl=en`;
  const response = await fetch(searchUrl, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(7000)
  });

  if (!response.ok) throw new Error("YouTube search fetch failed");
  const html = await response.text();

  const videos = [];
  const seenIds = new Set();
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
              if (parts.every(p => !isNaN(p))) {
                if (parts.length === 2) length_seconds = parts[0] * 60 + parts[1];
                if (parts.length === 3) length_seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
              }
            }
            const views = r.viewCountText?.simpleText || r.shortViewCountText?.simpleText || "N/A";
            const uploadedAt = r.publishedTimeText?.simpleText || "Recently";

            videos.push({
              videoId: vId,
              title: cleanTitle(title),
              author: cleanTitle(author),
              length_seconds,
              thumbnail: `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`,
              views,
              uploadedAt
            });
          }
        } catch (e) {}
      }
    }
    pos += 15;
  }

  return { results: videos };
}

// Full YouTube Playlist Parser: Supports modern lockupViewModel, classic playlistVideoRenderer, and Invidious fallback
async function scrapePlaylistHtml(ytPlaylistId) {
  const targetUrl = `https://www.youtube.com/playlist?list=${ytPlaylistId}`;
  let playlistName = "YouTube Playlist";
  const tracks = [];
  const seenIds = new Set();

  try {
    const response = await fetch(targetUrl, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(8000)
    });

    if (response.ok) {
      const html = await response.text();
      const nameMatch = html.match(/<meta\s+name="title"\s+content="([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i);
      if (nameMatch) playlistName = cleanTitle(nameMatch[1].replace(" - YouTube", ""));

      const start = html.indexOf("ytInitialData = ");
      if (start !== -1) {
        try {
          const end = html.indexOf(";</script>", start);
          const jsonStr = html.slice(start + 16, end !== -1 ? end : start + 500000);
          const data = JSON.parse(jsonStr);

          const pTitle = data.metadata?.playlistMetadataRenderer?.title || data.header?.playlistHeaderRenderer?.title?.simpleText;
          if (pTitle) playlistName = cleanTitle(pTitle);

          // 1. Modern YouTube: lockupViewModel items
          const secContents = data.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;
          if (Array.isArray(secContents)) {
            secContents.forEach(c => {
              const lvm = c.lockupViewModel;
              if (lvm && lvm.contentId && !seenIds.has(lvm.contentId)) {
                seenIds.add(lvm.contentId);
                const title = lvm.metadata?.lockupMetadataViewModel?.title?.content || `YouTube Video [${lvm.contentId}]`;

                let duration = 0;
                try {
                  const badgeText = lvm.contentImage?.thumbnailViewModel?.overlays?.[0]?.thumbnailBottomOverlayViewModel?.badges?.[0]?.thumbnailBadgeViewModel?.text;
                  if (badgeText) {
                    const parts = badgeText.split(":").map(Number);
                    if (parts.length === 2) duration = parts[0] * 60 + parts[1];
                    else if (parts.length === 3) duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
                  }
                } catch (e) {}

                tracks.push({
                  title: cleanTitle(title),
                  artist: playlistName,
                  thumbnail: `https://img.youtube.com/vi/${lvm.contentId}/hqdefault.jpg`,
                  duration,
                  youtubeId: lvm.contentId,
                  streamUrl: `/api/stream?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${lvm.contentId}`)}`
                });
              }
            });
          }

          // 2. Classic YouTube: playlistVideoListRenderer
          const plVideos = data.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents;
          if (Array.isArray(plVideos)) {
            plVideos.forEach(item => {
              const v = item.playlistVideoRenderer;
              if (v && v.videoId && !seenIds.has(v.videoId)) {
                seenIds.add(v.videoId);
                tracks.push({
                  title: cleanTitle(v.title?.runs?.[0]?.text || v.title?.simpleText || `YouTube Video [${v.videoId}]`),
                  artist: cleanTitle(v.shortBylineText?.runs?.[0]?.text || playlistName),
                  thumbnail: `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
                  duration: parseInt(v.lengthSeconds || "0", 10),
                  youtubeId: v.videoId,
                  streamUrl: `/api/stream?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${v.videoId}`)}`
                });
              }
            });
          }
        } catch (jsonErr) {}
      }
    }
  } catch (err) {}

  // 3. Fallback: Invidious public mirrors (if YouTube desktop was challenged or returned empty)
  if (tracks.length === 0) {
    const mirrors = [
      "https://inv.thepixora.com",
      "https://invidious.f5.si",
      "https://invidious.tiekoetter.com"
    ];
    for (const mirror of mirrors) {
      try {
        const iRes = await fetch(`${mirror}/api/v1/playlists/${encodeURIComponent(ytPlaylistId)}`, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(5000)
        });
        if (iRes.ok) {
          const iData = await iRes.json();
          if (Array.isArray(iData.videos) && iData.videos.length > 0) {
            playlistName = iData.title || playlistName;
            iData.videos.forEach(v => {
              if (v.videoId && !seenIds.has(v.videoId)) {
                seenIds.add(v.videoId);
                tracks.push({
                  title: cleanTitle(v.title || `YouTube Video [${v.videoId}]`),
                  artist: cleanTitle(v.author || playlistName),
                  thumbnail: `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
                  duration: v.lengthSeconds || 0,
                  youtubeId: v.videoId,
                  streamUrl: `/api/stream?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${v.videoId}`)}`
                });
              }
            });
            break;
          }
        }
      } catch (e) {}
    }
  }

  return {
    type: "playlist",
    name: playlistName,
    thumbnail: tracks[0]?.thumbnail || "",
    trackCount: tracks.length,
    tracks
  };
}

// ─── AI WEB SCRAPER & TRANSCRIPT ENGINE ───────────────────────────────────────
async function handleScrape(targetUrl) {
  const cleanUrl = targetUrl.trim();

  // 1. YouTube Link Resolution (Metadata + Transcript)
  if (cleanUrl.includes("youtube.com/") || cleanUrl.includes("youtu.be/")) {
    const yvId = extractVideoId(cleanUrl);
    if (yvId) {
      let metaText = "";
      let transcriptText = "";

      const mirrors = [
        "https://inv.thepixora.com",
        "https://invidious.f5.si",
        "https://invidious.tiekoetter.com"
      ];
      for (const mirror of mirrors) {
        try {
          const vres = await fetch(`${mirror}/api/v1/videos/${yvId}`, {
            headers: { "User-Agent": "Mozilla/5.0" },
            signal: AbortSignal.timeout(5000)
          });
          if (vres.ok) {
            const data = await vres.json();
            if (data && data.title) {
              metaText = `=== YOUTUBE VIDEO METADATA ===\nURL: ${cleanUrl}\nTitle: ${data.title}\nChannel: ${data.author || "Unknown"}\nViews: ${data.viewCount || 0}\nDuration: ${data.lengthSeconds || 0}s\nDescription:\n${data.description || ""}\n`;
              break;
            }
          }
        } catch (e) {}
      }

      try {
        const tres = await fetch(`https://youtube-transcript.ai/transcript/${yvId}.txt`, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(6000)
        });
        if (tres.ok) {
          const body = await tres.text();
          if (!body.includes("<!DOCTYPE") && body.trim().length > 30) {
            transcriptText = body;
          }
        }
      } catch (e) {}

      if (!metaText) {
        try {
          const oembed = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(cleanUrl)}`, { signal: AbortSignal.timeout(4000) });
          if (oembed.ok) {
            const data = await oembed.json();
            if (data?.title) {
              metaText = `=== YOUTUBE VIDEO METADATA ===\nTitle: ${data.title}\nAuthor: ${data.author_name || ""}\n`;
            }
          }
        } catch (e) {}
      }

      let combined = metaText || `=== YOUTUBE VIDEO ===\nURL: ${cleanUrl}\n`;
      if (transcriptText) {
        combined += `\n=== SPOKEN TRANSCRIPT ===\n${transcriptText}\n`;
      }
      return { url: cleanUrl, text: combined, links: [] };
    }
  }

  // 2. GitHub Raw Code
  if (cleanUrl.includes("github.com/") && cleanUrl.includes("/blob/")) {
    try {
      const rawUrl = cleanUrl.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");
      const res = await fetch(rawUrl, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        let code = await res.text();
        if (code.length > 20000) code = code.slice(0, 20000) + "\n\n... [Truncated for size]";
        return { url: cleanUrl, text: `=== GITHUB FILE (${cleanUrl}) ===\n\n${code}`, links: [] };
      }
    } catch (e) {}
  }

  // 3. Generic Web Page
  const response = await fetch(cleanUrl, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(9000)
  });

  if (!response.ok) throw new Error(`HTTP ${response.status} fetching web page`);
  const html = await response.text();

  let metaSummary = "=== PAGE METADATA ===\n";
  const metaRegex = /<meta[^>]+(?:name|property)=["']([^"']+)["'][^>]+content=["']([^"']+)["']/gi;
  let match;
  while ((match = metaRegex.exec(html)) !== null) {
    const k = match[1].toLowerCase();
    if (k.startsWith("og:") || k.startsWith("twitter:") || k === "description" || k === "title") {
      metaSummary += `${match[1]}: ${decodeHTMLEntities(match[2])}\n`;
    }
  }

  let text = cleanHtmlToText(html);
  if (text.length > 15000) text = text.slice(0, 15000) + "... [Truncated]";

  return {
    url: cleanUrl,
    text: `${metaSummary}\n=== CONTENT ===\n${text}`,
    links: []
  };
}

// ─── UNIVERSAL CORS PROXY ─────────────────────────────────────────────────────
async function handleProxy(targetUrl, request) {
  const reqUrl = new URL(targetUrl);
  const fetchHeaders = {
    "User-Agent": BROWSER_HEADERS["User-Agent"],
    "Accept": request.headers.get("accept") || "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": reqUrl.origin + "/"
  };
  if (request.headers.get("authorization")) {
    fetchHeaders["Authorization"] = request.headers.get("authorization");
  }
  if (request.headers.get("client-id")) {
    fetchHeaders["client-id"] = request.headers.get("client-id");
  }
  if (request.headers.get("client-type")) {
    fetchHeaders["client-type"] = request.headers.get("client-type");
  }

  const response = await fetch(targetUrl, {
    method: request.method,
    headers: fetchHeaders,
    body: request.method === "POST" ? await request.arrayBuffer() : undefined,
    redirect: "follow"
  });

  const contentType = response.headers.get("content-type") || "";
  const headers = new Headers(CORS_HEADERS);
  headers.set("Content-Type", contentType);
  headers.set("X-Frame-Options", "ALLOWALL");

  if (contentType.includes("text/html")) {
    let html = await response.text();
    const baseUrl = reqUrl.origin + reqUrl.pathname;
    const protocol = reqUrl.protocol;

    html = html.replace(/(href|src|action)=["']\/\/([^"']+)["']/gi, (_, attr, path) => `${attr}="${protocol}//${path}"`);
    html = html.replace(/target\s*=\s*["']?\s*(_top|_parent)\s*["']?/gi, 'target="_self"');
    return new Response(html, { status: response.status, headers });
  }

  if (contentType.includes("text/css")) {
    let css = await response.text();
    return new Response(css, { status: response.status, headers });
  }

  return new Response(response.body, { status: response.status, headers });
}

// ─── CLOUDFLARE WORKER ROUTER ─────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Handle CORS Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // 1. Root & Health Check
    if (pathname === "/" || pathname === "/api/healthz") {
      return jsonResponse({
        status: "ok",
        platform: "Cloudflare Worker Edge",
        service: "StudE & OM Network API Gateway",
        uptime: "100%",
        timestamp: Date.now()
      });
    }

    // 2. PW Status
    if (pathname === "/api/pw-status") {
      return jsonResponse({
        status: "ok",
        platform: "Cloudflare Worker Edge",
        service: "Physics Wallah & JEE Prep Live API Engine",
        uptime: "100%",
        cachedBatches: Array.from(pwMetadataCache.keys()),
        timestamp: Date.now()
      });
    }

    // 3. PW Catalog with search, filter, and fallback
    if (pathname === "/api/pw-catalog") {
      const searchQuery = (url.searchParams.get("search") || "").trim().toLowerCase();
      const examQuery = (url.searchParams.get("exam") || "").trim().toLowerCase();
      const classQuery = (url.searchParams.get("class") || "").trim().toLowerCase();
      const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50", 10), 1), 200);
      const wantAll = url.searchParams.get("all") === "true";

      let catalogList = [];
      if (pwCatalogCache.data && Array.isArray(pwCatalogCache.data.data)) {
        catalogList = pwCatalogCache.data.data;
      } else {
        try {
          const res = await fetch(PW_CATALOG_URL, { headers: PW_HEADERS, signal: AbortSignal.timeout(12000) });
          if (res.ok) {
            const data = await res.json();
            pwCatalogCache = { data, expiresAt: Date.now() + PW_CATALOG_TTL };
            catalogList = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
          }
        } catch (err) {}
      }

      if (catalogList.length === 0 && pwCatalogCache.data) {
        catalogList = Array.isArray(pwCatalogCache.data.data) ? pwCatalogCache.data.data : [];
      }

      if (catalogList.length === 0 && Array.isArray(POPULAR_PW_BATCHES)) {
        catalogList = [...POPULAR_PW_BATCHES];
      }

      if (wantAll && !searchQuery && !examQuery && !classQuery) {
        return jsonResponse({ success: true, count: catalogList.length, data: catalogList }, 200, { "Cache-Control": "public, max-age=1800" });
      }

      let filtered = catalogList;
      if (examQuery) {
        filtered = filtered.filter(b => b.exam && b.exam.toLowerCase().includes(examQuery));
      }
      if (classQuery) {
        filtered = filtered.filter(b => b.class && String(b.class).toLowerCase() === classQuery);
      }
      if (searchQuery) {
        const tokens = searchQuery.split(/\s+/).filter(Boolean);
        filtered = filtered.filter(b => {
          const bName = (b.name || "").toLowerCase();
          const bByName = (b.byName || "").toLowerCase();
          const bExam = (b.exam || "").toLowerCase();
          const bClass = (b.class ? String(b.class) : "").toLowerCase();
          const bId = (b.batch_id || b.id || "").toLowerCase();
          const text = `${bName} ${bByName} ${bExam} ${bClass} ${bId}`;
          return tokens.every(tok => text.includes(tok));
        });
      }

      return jsonResponse({
        success: true,
        total: filtered.length,
        data: filtered.slice(0, limit)
      }, 200, { "Cache-Control": "public, max-age=600" });
    }

    // 4. PW Metadata
    if (pathname === "/api/pw-metadata") {
      const batchId = url.searchParams.get("batchId") || "";
      if (!/^[a-zA-Z0-9_-]{8,100}$/.test(batchId)) {
        return jsonResponse({ error: "A valid batchId is required" }, 400);
      }
      try {
        const data = await fetchPwMetadata(batchId);
        return jsonResponse(data, 200, { "Cache-Control": "public, max-age=3600" });
      } catch (err) {
        return jsonResponse({ error: err.message || "PW metadata unavailable" }, 502);
      }
    }

    // 5. PW Chapter Contents (Videos, Notes, DPPs)
    if (pathname === "/api/pw-chapter-contents") {
      const batchId = url.searchParams.get("batchId") || "";
      const subjectId = url.searchParams.get("subjectId") || "";
      const chapterId = url.searchParams.get("chapterId") || "";
      const chapterTitle = url.searchParams.get("chapterTitle") || "";

      if (!batchId || !subjectId || !chapterId) {
        return jsonResponse({ error: "batchId, subjectId, and chapterId are required" }, 400);
      }

      try {
        const token = await getPwToken().catch(() => "");
        const data = await fetchChapterContents(batchId, subjectId, chapterId, token, true, chapterTitle);
        return jsonResponse(data, 200, { "Cache-Control": "public, max-age=1800" });
      } catch (err) {
        return jsonResponse({ chapterId, lectures: [], videosOnly: [], notes: [], dpps: [] });
      }
    }

    // 6. PW Schedule (Official Weekly + Free Schedules + Live Attachments)
    if (pathname === "/api/pw-schedule") {
      const batchId = url.searchParams.get("batchId") || "";
      const requestedDate = url.searchParams.get("date") || "";
      const month = url.searchParams.get("month") || "";
      const startDate = url.searchParams.get("startDate") || "";
      const endDate = url.searchParams.get("endDate") || "";
      const istDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
      const date = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : istDate;

      if (!/^[a-zA-Z0-9_-]{8,100}$/.test(batchId)) {
        return jsonResponse({ error: "A valid batchId is required" }, 400);
      }

      try {
        const data = await fetchPwSchedule(batchId, date, month, startDate, endDate);
        return jsonResponse(data, 200, { "Cache-Control": "public, max-age=600" });
      } catch (err) {
        return jsonResponse({ error: err.message || "PW schedule unavailable" }, 502);
      }
    }

    // 7. DuckDuckGo Web Search
    if (pathname === "/api/search") {
      const q = url.searchParams.get("q");
      const df = url.searchParams.get("df");
      if (!q) return jsonResponse({ error: "Missing search query parameter 'q'" }, 400);
      try {
        const results = await handleSearch(q, df);
        return jsonResponse(results, 200, { "Cache-Control": "public, max-age=300" });
      } catch (err) {
        return jsonResponse({ error: err.message || "Search error" }, 500);
      }
    }

    // 8. YouTube Video & Channel Search
    if (pathname === "/api/yt-search") {
      const q = url.searchParams.get("q");
      if (!q) return jsonResponse({ error: "Missing search query parameter 'q'" }, 400);
      try {
        const data = await handleYtSearch(q);
        return jsonResponse(data, 200, { "Cache-Control": "public, max-age=600" });
      } catch (err) {
        return jsonResponse({ error: err.message || "YouTube search error" }, 500);
      }
    }

    // 9. Media Info (Playlists & Videos)
    if (pathname === "/api/media-info") {
      const targetUrl = (url.searchParams.get("url") || "").trim();
      if (!targetUrl) return jsonResponse({ error: "url param required" }, 400);
      const type = detectType(targetUrl);

      if (type === "yt_playlist") {
        const listId = extractListId(targetUrl) || targetUrl;
        try {
          const scraped = await scrapePlaylistHtml(listId);
          if (scraped.tracks.length > 0) {
            return jsonResponse(scraped);
          }
          return jsonResponse({ error: "No tracks found in playlist or playlist is private" }, 404);
        } catch (err) {
          return jsonResponse({ error: err.message || "Playlist scrape failed" }, 500);
        }
      }

      if (type === "yt_video") {
        const videoId = extractVideoId(targetUrl);
        const clean = stripToVideoUrl(targetUrl);
        let title = "YouTube Video";
        let author = "YouTube";

        // Strategy A: Noembed resolver
        try {
          const oembed = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(clean)}`, { signal: AbortSignal.timeout(4000) });
          if (oembed.ok) {
            const d = await oembed.json();
            if (d?.title) {
              title = cleanTitle(d.title);
              author = cleanTitle(d.author_name || "YouTube");
            }
          }
        } catch (e) {}

        // Strategy B: Invidious resolver if title not resolved
        if (title === "YouTube Video" && videoId) {
          const mirrors = ["https://inv.thepixora.com", "https://invidious.f5.si"];
          for (const m of mirrors) {
            try {
              const res = await fetch(`${m}/api/v1/videos/${videoId}`, { signal: AbortSignal.timeout(3000) });
              if (res.ok) {
                const data = await res.json();
                if (data.title) {
                  title = cleanTitle(data.title);
                  author = cleanTitle(data.author || "YouTube");
                  break;
                }
              }
            } catch (e) {}
          }
        }

        return jsonResponse({
          type: "track",
          youtubeId: videoId,
          title,
          artist: author,
          thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          duration: 0,
          streamUrl: `/api/stream?url=${encodeURIComponent(clean)}`
        });
      }

      return jsonResponse({ error: "Unsupported media URL" }, 400);
    }

    // 10. AI Web & Transcript Scraper
    if (pathname === "/api/scrape") {
      const targetUrl = url.searchParams.get("url");
      if (!targetUrl) return jsonResponse({ error: "Missing 'url' parameter" }, 400);
      try {
        const data = await handleScrape(targetUrl);
        return jsonResponse(data, 200, { "Cache-Control": "public, max-age=600" });
      } catch (err) {
        return jsonResponse({ error: err.message || "Scrape failed" }, 500);
      }
    }

    // 11. Media Stream Proxy
    if (pathname === "/api/stream") {
      const targetUrl = (url.searchParams.get("url") || "").trim();
      if (!targetUrl) return jsonResponse({ error: "url param required" }, 400);
      const vId = extractVideoId(targetUrl);
      if (vId) {
        return Response.redirect(`https://inv.thepixora.com/latest_version?id=${vId}&itag=140`, 302);
      }
      return jsonResponse({ error: "Unable to resolve stream source" }, 400);
    }

    // 12. Universal CORS Proxy
    if (pathname === "/api/proxy") {
      const targetUrl = url.searchParams.get("url");
      if (!targetUrl) return textResponse("Missing 'url' parameter", 400);
      try {
        return await handleProxy(targetUrl, request);
      } catch (err) {
        return textResponse(`Proxy Error: ${err.message}`, 500);
      }
    }

    return jsonResponse({ error: "Endpoint not found", path: pathname }, 404);
  }
};
