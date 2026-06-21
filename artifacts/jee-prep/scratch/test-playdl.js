import playdl from 'play-dl';

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
    if (diffDays === 1) return `1 day ago`;
    return `${diffDays} days ago`;
  } catch (e) {
    return "Recently";
  }
}

async function test(query) {
  console.log(`\n--- Testing Query: "${query}" ---`);
  try {
    let results = [];
    const channelMatch = query.match(/^(.*?)\s+latest\s+video$/i) || query.match(/^(.*?)\s+latest\s+uploads?$/i);
    if (channelMatch) {
      const channelName = channelMatch[1].trim();
      console.log(`[YT Search] Channel request detected for name: ${channelName}`);
      
      const channelSearch = await playdl.search(channelName, { limit: 1, source: { youtube: "channel" } });
      if (channelSearch && channelSearch.length > 0) {
        const channel = channelSearch[0];
        console.log(`[YT Search] Found channel: ${channel.name} (${channel.id})`);
        
        const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`;
        const feedRes = await fetch(feedUrl);
        if (feedRes.ok) {
          const xmlText = await feedRes.text();
          const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
          let match;
          const parsed = [];
          while ((match = entryRegex.exec(xmlText)) !== null) {
            const entryContent = match[1];
            const idMatch = entryContent.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
            const titleMatch = entryContent.match(/<title>([^<]+)<\/title>/);
            const publishedMatch = entryContent.match(/<published>([^<]+)<\/published>/);
            
            if (idMatch && titleMatch) {
              const videoId = idMatch[1];
              const published = publishedMatch ? publishedMatch[1] : "";
              parsed.push({
                videoId,
                title: titleMatch[1],
                author: channel.name,
                length_seconds: 0,
                thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                views: "N/A",
                uploadedAt: published ? timeAgo(published) : "Recently"
              });
            }
          }
          
          if (parsed.length > 0) {
            console.log(`[YT Search] Found ${parsed.length} RSS entries. Fetching metadata for top 2...`);
            for (let i = 0; i < Math.min(2, parsed.length); i++) {
              try {
                const info = await playdl.video_info(`https://www.youtube.com/watch?v=${parsed[i].videoId}`);
                if (info && info.video_details) {
                  const vd = info.video_details;
                  parsed[i].length_seconds = vd.durationInSec || 0;
                  parsed[i].views = vd.views ? (vd.views >= 1000000 ? (vd.views / 1000000).toFixed(1) + "M" : vd.views >= 1000 ? (vd.views / 1000).toFixed(0) + "K" : vd.views.toString()) : "N/A";
                }
              } catch (err) {
                console.warn(`[YT Search] Failed to fetch video info for ${parsed[i].videoId}:`, err.message);
              }
            }
            results = parsed;
          }
        }
      }
    }
    
    if (results.length === 0) {
      console.log("[YT Search] Channel lookup failed or query is generic. Performing standard search...");
      const searchRes = await playdl.search(query, { limit: 5, source: { youtube: "video" } });
      results = searchRes.map(v => ({
        videoId: v.id || "",
        title: v.title || "Unknown",
        author: v.channel?.name || "Unknown",
        length_seconds: v.durationInSec || 0,
        thumbnail: v.thumbnails?.at(-1)?.url || `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`,
        views: v.views ? (v.views >= 1000000 ? (v.views / 1000000).toFixed(1) + "M" : v.views >= 1000 ? (v.views / 1000).toFixed(0) + "K" : v.views.toString()) : "N/A",
        uploadedAt: v.uploadedAt || "Recently"
      }));
    }
    
    console.log("Final top results:");
    console.log(results.slice(0, 3));
  } catch (e) {
    console.error("Error:", e);
  }
}

async function run() {
  await test("T-Series latest video");
  await test("class 11th physics chapter 1 JEE oneshot");
}

run();
