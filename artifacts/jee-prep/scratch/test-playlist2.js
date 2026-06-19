const cleanTitle = (t) => {
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
};

const isPlaceHolder = (t) => {
  const lower = t.toLowerCase();
  return lower.includes("deleted video") || lower.includes("private video") || lower.includes("hidden video");
};

const extractFieldFromBlock = (block, keyName) => {
  const keyIdx = block.indexOf(`"${keyName}"`);
  if (keyIdx === -1) return "";
  
  const textIdx = block.indexOf('"text"', keyIdx);
  const simpleTextIdx = block.indexOf('"simpleText"', keyIdx);
  const contentIdx = block.indexOf('"content"', keyIdx);
  
  let valIdx = -1;
  let searchWord = "";
  
  const indices = [
    { idx: textIdx, word: '"text"' },
    { idx: simpleTextIdx, word: '"simpleText"' },
    { idx: contentIdx, word: '"content"' }
  ].filter(item => item.idx !== -1).sort((a, b) => a.idx - b.idx);
  
  if (indices.length > 0) {
    valIdx = indices[0].idx;
    searchWord = indices[0].word;
  }
  
  if (valIdx === -1) return "";
  
  const quoteStart = block.indexOf('"', valIdx + searchWord.length + 1);
  if (quoteStart === -1) return "";
  
  let escape = false;
  let quoteEnd = -1;
  for (let i = quoteStart + 1; i < block.length; i++) {
    const char = block[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      quoteEnd = i;
      break;
    }
  }
  if (quoteEnd === -1) return "";
  
  const rawStringLiteral = block.slice(quoteStart, quoteEnd + 1);
  try {
    return JSON.parse(rawStringLiteral);
  } catch (e) {
    return rawStringLiteral.slice(1, -1);
  }
};

const scrapePlaylistHtml = async (ytPlaylistId) => {
  const targetUrl = `https://www.youtube.com/playlist?list=${ytPlaylistId}`;
  console.log('Fetching:', targetUrl);
  const response = await fetch(targetUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9"
    }
  });
  if (!response.ok) throw new Error(`HTTP error ${response.status}`);
  const html = await response.text();

  let playlistName = "YouTube Playlist";
  const titleMatch = html.match(/<title>(.*?) - YouTube<\/title>/) 
    || html.match(/<meta\s+name="title"\s+content="([^"]+)"/);
  if (titleMatch) playlistName = cleanTitle(titleMatch[1]);

  const tracks = [];
  const seenIds = new Set();

  const rendererKeys = [
    "playlistVideoRenderer",
    "playlistVideoListRenderer",
    "gridVideoRenderer",
    "videoRenderer",
    "watchCardRichVideoRenderer",
    "lockupViewModel"
  ];

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
            if (videoObj) {
              const vId = videoObj.videoId || videoObj.contentId;
              if (vId && !seenIds.has(vId)) {
                const rawTitle = videoObj.title?.runs?.[0]?.text || videoObj.title?.simpleText || videoObj.title?.content || videoObj.metadata?.lockupMetadataViewModel?.title?.content || videoObj.title || "";
                const rawArtist = videoObj.shortBylineText?.runs?.[0]?.text || videoObj.ownerText?.runs?.[0]?.text || videoObj.longBylineText?.runs?.[0]?.text || videoObj.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content || "YouTube";
                
                const tStr = cleanTitle(rawTitle);
                if (isPlaceHolder(tStr)) {
                  pos += key.length + 2;
                  continue;
                }
                
                const title = tStr || `YouTube Video [${vId}]`;
                seenIds.add(vId);
                
                tracks.push({
                  title,
                  artist: cleanTitle(rawArtist) || "YouTube",
                  youtubeId: vId
                });
              }
            }
          } catch (e) {
            // fallback
          }
        }
      }
      pos += key.length + 2;
    }
  }

  return { name: playlistName, tracks };
};

scrapePlaylistHtml('PLb46HKXjZzCmunt-49hfTfbqMsbZRtXsL')
  .then(res => {
    console.log('Result name:', res.name);
    console.log('Result tracks length:', res.tracks.length);
    console.log('First 5 tracks:', res.tracks.slice(0, 5));
  })
  .catch(err => {
    console.error('Error:', err);
  });
