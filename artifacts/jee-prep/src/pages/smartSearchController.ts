import { Request, Response } from 'express';

// LAYER 2: THE BACKEND FILTERING & METRIC RANKING API
export const smartSearch = async (req: Request, res: Response) => {
  try {
    const { q, mode } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: "Missing search query" });
    }

    // Fetch raw search results from live sources (Mocking YouTube Data API v3 via Piped for cost-free access)
    const encodedQuery = encodeURIComponent(q);
    const instances = [
      "https://pipedapi.smnz.de",
      "https://pipedapi.tokhmi.xyz",
      "https://pipedapi.drgns.space",
      "https://pipedapi.kavin.rocks"
    ];
    
    let data: any = null;
    for (const instance of instances) {
        try {
            const searchResponse = await fetch(`${instance}/search?q=${encodedQuery}&filter=all`);
            if (searchResponse.ok) {
                data = await searchResponse.json();
                break;
            }
        } catch (e) {
            console.warn(`Instance ${instance} failed`);
        }
    }

    if (!data || !data.items) {
      throw new Error("Failed to fetch raw search results from all sources");
    }

    const rawItems = data.items.filter((item: any) => item.type === "stream");

    // IMPLEMENT THE SMART RANKING ALGORITHM
    const rankedResults = rawItems.map((item: any) => {
      let score = 100; // Base score
      
      // 1. Relevance mapping (Keyword matches in title vs query)
      const title = (item.title || "").toLowerCase();
      const queryTokens = q.toLowerCase().split(/\s+/);
      queryTokens.forEach(token => {
        if (title.includes(token)) {
          score += 25;
        }
      });
      
      // Boost if exact phrase matches
      if (title.includes(q.toLowerCase())) score += 50;

      // 2. Recency penalty/bonus (Days since published)
      const uploadStr = (item.uploaded || "").toLowerCase();
      if (uploadStr.includes("hour") || uploadStr.includes("minute") || uploadStr.includes("today")) {
        score += 60; // High recency bonus
      } else if (uploadStr.includes("day") || uploadStr.includes("week")) {
        score += 40; // Medium recency bonus
      } else if (uploadStr.includes("month")) {
        score += 15; // Low recency bonus
      } else if (uploadStr.includes("year")) {
        // Recency penalty for older content (unless academic mode values foundational content)
        const years = parseInt(uploadStr.match(/\d+/)?.[0] || "1", 10);
        if (mode === "academic") {
          score -= (years * 5); 
        } else {
          score -= (years * 15);
        }
      }

      // 3. Engagement weights (Sort by views and like ratios)
      const views = item.views || 0;
      if (views > 5000000) score += 60;
      else if (views > 1000000) score += 45;
      else if (views > 100000) score += 25;
      else if (views > 10000) score += 10;

      return {
        videoId: item.url.includes("?v=") ? item.url.split("?v=")[1].split("&")[0] : item.url.split("/").pop(),
        title: item.title,
        channelName: item.uploaderName,
        publishedDate: item.uploaded || "Unknown date",
        views: views,
        thumbnail: item.thumbnail,
        score
      };
    });

    // Sort by score descending
    rankedResults.sort((a: any, b: any) => b.score - a.score);

    // OUTPUT STRUCTURE
    return res.status(200).json({
      primaryVideo: rankedResults[0] || null,
      alternatives: rankedResults.slice(1, 5) // Up to 4 alternative video items
    });
  } catch (error: any) {
    console.error("Smart Search Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// Proxy endpoint to bypass hotlinking restrictions (CORS)
export const proxyThumbnail = async (req: Request, res: Response) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).send("Missing URL parameter");
    }

    const imageRes = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } });
    if (!imageRes.ok) throw new Error(`Failed to fetch image: ${imageRes.statusText}`);

    const contentType = imageRes.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    
    res.setHeader("Cache-Control", "public, max-age=86400");
    const arrayBuffer = await imageRes.arrayBuffer();
    return res.status(200).send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error("Proxy Error:", error);
    return res.status(500).send("Error proxying image");
  }
};