import { Request, Response } from 'express';

// Original Smart Search Logic (YouTube Data API v3 proxy)
export const smartSearch = async (req: Request, res: Response) => {
  try {
    const { q, mode } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: "Missing search query" });
    }

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

    const rankedResults = rawItems.map((item: any) => {
      let score = 100; // Base score
      
      const title = (item.title || "").toLowerCase();
      const queryTokens = q.toLowerCase().split(/\s+/);
      queryTokens.forEach(token => {
        if (title.includes(token)) {
          score += 25;
        }
      });
      
      if (title.includes(q.toLowerCase())) score += 50;

      const uploadStr = (item.uploaded || "").toLowerCase();
      if (uploadStr.includes("hour") || uploadStr.includes("minute") || uploadStr.includes("today")) {
        score += 60;
      } else if (uploadStr.includes("day") || uploadStr.includes("week")) {
        score += 40;
      } else if (uploadStr.includes("month")) {
        score += 15;
      } else if (uploadStr.includes("year")) {
        const years = parseInt(uploadStr.match(/\d+/)?.[0] || "1", 10);
        if (mode === "academic") {
          score -= (years * 5); 
        } else {
          score -= (years * 15);
        }
      }

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

    rankedResults.sort((a: any, b: any) => b.score - a.score);

    return res.status(200).json({
      primaryVideo: rankedResults[0] || null,
      alternatives: rankedResults.slice(1, 5)
    });
  } catch (error: any) {
    console.error("Smart Search Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// Thumbnail Proxy Endpoint
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

// Backend Search Helper
async function backendSearch(query: string): Promise<string> {
  try {
    const encoded = encodeURIComponent(query);
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encoded}`;
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    if (!response.ok) return "No search results.";
    const html = await response.text();
    if (!html.includes("result results_links")) {
      return "No search results.";
    }
    const parts = html.split('class="result results_links');
    let searchSummaries = "";
    parts.slice(1, 5).forEach((part, idx) => {
      const hrefMatch = part.match(/class="result__a"[^>]*href="([^"]+)"/);
      const titleMatch = part.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/);
      const snippetMatch = part.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
      
      let url = hrefMatch ? hrefMatch[1] : "";
      if (url.startsWith("/l/") || url.includes("uddg=")) {
        const match = url.match(/[?&]uddg=([^&]+)/);
        if (match) url = decodeURIComponent(match[1]);
      }
      const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "").trim() : "";
      const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, "").trim() : "";
      searchSummaries += `[Source ${idx + 1}] Title: ${title}\nURL: ${url}\nSnippet: ${snippet}\n\n`;
    });
    return searchSummaries;
  } catch (err) {
    console.error("DDG search error:", err);
    return "No search results available.";
  }
}

async function cropImageWithSharp(
  base64Data: string,
  bounds: { top: number; left: number; width: number; height: number }
): Promise<string> {
  try {
    const sharp = (await import("sharp")).default as any;
    const buffer = Buffer.from(base64Data, "base64");
    const image = sharp(buffer);
    const metadata = await image.metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    
    const x = Math.max(0, Math.min(width - 1, Math.round((bounds.left / 100) * width)));
    const y = Math.max(0, Math.min(height - 1, Math.round((bounds.top / 100) * height)));
    const w = Math.max(1, Math.min(width - x, Math.round((bounds.width / 100) * width)));
    const h = Math.max(1, Math.min(height - y, Math.round((bounds.height / 100) * height)));
    
    const cropBuffer = await image
      .extract({ left: x, top: y, width: w, height: h })
      .png()
      .toBuffer();
      
    return `data:image/png;base64,${cropBuffer.toString("base64")}`;
  } catch (err) {
    console.error("Sharp crop failed:", err);
    return "";
  }
}

// Visual Quiz Extraction Controller Endpoint
export const extractPageQuestions = async (req: Request, res: Response) => {
  try {
    const { imageDataUrl, model } = req.body;
    if (!imageDataUrl || typeof imageDataUrl !== 'string') {
      return res.status(400).json({ error: "Missing or invalid imageDataUrl" });
    }

    const apiKey = req.headers.authorization?.replace("Bearer ", "") || process.env.OPENROUTER_API_KEY || "";
    if (!apiKey) {
      return res.status(401).json({ error: "Missing OpenRouter API Key" });
    }

    const base64Data = imageDataUrl.split(",")[1] || imageDataUrl;
    const modelName = model || "google/gemini-2.5-flash";

    const promptText = `You are a strict JEE Advanced question parser.
Your task is to scan the provided image of a test paper page and locate questions.
Classify each question type: "STANDARD_MCQ", "STATEMENT_BASED", or "MATCH_THE_FOLLOWING".

You must output coordinates as strict percentage boundary objects '{ "top": number, "left": number, "width": number, "height": number }' representing the location of the question on the page.
- top: percentage from top of the page (0 to 100)
- left: percentage from left of the page (0 to 100)
- width: percentage width of the page (0 to 100)
- height: percentage height of the page (0 to 100)

Return a JSON array of objects. Each object MUST match this JSON schema:
{
  "questionType": "STANDARD_MCQ" | "STATEMENT_BASED" | "MATCH_THE_FOLLOWING",
  "text": "The full, complete question text verbatim from the page. Do NOT truncate or summarize. Keep all formulas, variables, and descriptions exactly as written.",
  "rawSearchTextSnippet": "First 100 characters of clean text content of this question verbatim for search engine lookup",
  "questionImageBounds": {
    "top": number,
    "left": number,
    "width": number,
    "height": number
  },
  "hasIsolatedDiagram": boolean, // True ONLY if there is a physical drawing, graph, or geometry asset (like the Boomerang diagram) inside the question block area.
  "diagramBounds": {
    "top": number,
    "left": number,
    "width": number,
    "height": number
  } | null,
  "hasEmbeddedOptions": boolean, // True ONLY if the question body includes internal structural options (like List I / List II matrices, Match the Column tables, or Roman numeral statements i, ii, iii).
  "embeddedOptionsBounds": {
    "top": number,
    "left": number,
    "width": number,
    "height": number
  } | null,
  "options": [string, string, string, string],
  "correctOptionIndex": number, // The 0-based index of the correct option (0 for A, 1 for B, 2 for C, 3 for D) based on the test paper content (if marked) or your scientific knowledge.
  "subject": "Physics" | "Chemistry" | "Maths",
  "difficulty": "Easy" | "Medium" | "Hard"
}

Ensure all formulas inside options are formatted in standard KaTeX/LaTeX syntax. Do not output raw markdown blocks or introductory/concluding text, return ONLY the raw JSON array.`;

    const payload = {
      model: modelName,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: promptText
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Data}`
              }
            }
          ]
        }
      ]
    };

    const visionResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!visionResponse.ok) {
      throw new Error(`Vision OCR request failed: ${visionResponse.statusText}`);
    }

    const data: any = await visionResponse.json();
    const rawText = data.choices?.[0]?.message?.content || "[]";
    
    let cleaned = rawText.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    const firstBracket = cleaned.indexOf('[');
    if (firstBracket !== -1) {
      cleaned = cleaned.substring(firstBracket);
      const lastBracket = cleaned.lastIndexOf(']');
      if (lastBracket !== -1) {
        cleaned = cleaned.substring(0, lastBracket + 1);
      }
    }

    const questionsList = JSON.parse(cleaned);
    if (!Array.isArray(questionsList)) {
      throw new Error("Invalid output structure from vision model");
    }

    const verifiedQuestions = [];
    for (const q of questionsList) {
      // Backend-side Sharp Programmatic Cropping
      let questionCropUrl = "";
      let diagramCropUrl: string | null = null;
      let embeddedOptionsCropUrl: string | null = null;

      if (q.questionImageBounds) {
        questionCropUrl = await cropImageWithSharp(base64Data, q.questionImageBounds);
      }
      if (q.hasIsolatedDiagram && q.diagramBounds) {
        diagramCropUrl = await cropImageWithSharp(base64Data, q.diagramBounds);
      }
      if (q.hasEmbeddedOptions && q.embeddedOptionsBounds) {
        embeddedOptionsCropUrl = await cropImageWithSharp(base64Data, q.embeddedOptionsBounds);
      }

      // Answer Verification using web search results
      const searchQuery = `${q.rawSearchTextSnippet} "JEE Advanced" answer key solution`;
      const searchResults = await backendSearch(searchQuery);

      const verifyPrompt = `You are an expert IIT-JEE exam validator and answer verifier.
We have a JEE question and options extracted from a PDF/URL source page.
We need to verify the absolute correct option and answer using web search results containing online keys, forum answers (Toppr, ...), or textbook keys.

Question Text Snippet:
${q.rawSearchTextSnippet}

Options:
${q.options.map((opt: string, i: number) => `${String.fromCharCode(65 + i)}) ${opt}`).join("\n")}

Web Search results for this question:
${searchResults}

Your tasks:
1. Review the web search results. Check how this question is solved online and which option (A, B, C, or D) is correct.
2. Determine the exact 0-based index of the correct option (0 for A, 1 for B, 2 for C, 3 for D).
3. Write a comprehensive, step-by-step mathematically correct explanation in LaTeX.

Respond with ONLY a valid JSON object. Do not wrap in markdown code blocks.

JSON format:
{
  "correctOptionIndex": 1,
  "explanation": "Verified explanation text with LaTeX..."
}`;

      const verifyPayload = {
        model: "meta-llama/llama-3.3-70b-instruct:free",
        messages: [{ role: "user", content: verifyPrompt }]
      };

      let correctOptionIndex: number | undefined = typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : undefined;
      let explanation: string | undefined = undefined;
      try {
        const verifyRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey.trim()}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(verifyPayload)
        });
        if (verifyRes.ok) {
          const verifyData: any = await verifyRes.json();
          const verifyRaw = verifyData.choices?.[0]?.message?.content || "{}";
          let verifyClean = verifyRaw.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
          const firstBrace = verifyClean.indexOf('{');
          if (firstBrace !== -1) {
            verifyClean = verifyClean.substring(firstBrace);
            const lastBrace = verifyClean.lastIndexOf('}');
            if (lastBrace !== -1) {
              verifyClean = verifyClean.substring(0, lastBrace + 1);
            }
          }
          const parsedVerify = JSON.parse(verifyClean);
          if (typeof parsedVerify.correctOptionIndex === 'number') {
            correctOptionIndex = parsedVerify.correctOptionIndex;
          }
          if (parsedVerify.explanation) {
            explanation = parsedVerify.explanation;
          }
        }
      } catch (err) {
        console.error("Verification failed for question:", err);
      }

      verifiedQuestions.push({
        id: `q_${q.subject.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        text: q.text || q.rawSearchTextSnippet || "",
        options: q.options,
        correctOptionIndex,
        explanation,
        difficulty: q.difficulty || "Medium",
        subject: q.subject || "Physics",
        questionType: q.questionType || "STANDARD_MCQ",
        questionCropUrl,
        hasEmbeddedOptions: q.hasEmbeddedOptions || false,
        embeddedOptionsCropUrl,
        hasIsolatedDiagram: q.hasIsolatedDiagram || false,
        diagramCropUrl
      });
    }

    return res.status(200).json({ questions: verifiedQuestions });
  } catch (error: any) {
    console.error("Quiz Generation Extraction Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};