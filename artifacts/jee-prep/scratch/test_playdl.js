import * as playdl from "play-dl";

async function test() {
  try {
    const q = "T-Series";
    console.log("Searching YouTube for:", q);
    const results = await playdl.search(q, { limit: 5, source: { youtube: "video" } });
    console.log("Search results count:", results.length);
    if (results.length > 0) {
      console.log("First result detail:", {
        id: results[0].id,
        title: results[0].title,
        views: results[0].views,
        duration: results[0].durationInSec,
        uploadedAt: results[0].uploadedAt,
        thumbnail: results[0].thumbnails?.[0]?.url,
        channel: results[0].channel?.name
      });
    }
  } catch(err) {
    console.error("Test failed:", err);
  }
}

test();
