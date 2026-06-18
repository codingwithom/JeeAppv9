import { Router, type Request, type Response } from "express";
import sharp from "sharp";

const router: Router = Router();

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


async function verifyQuestionLogic(
  apiKey: string,
  questionText: string,
  options: string[],
  subject?: string,
  rawSearchTextSnippet?: string
): Promise<{
  questionText: string;
  correctOptionIndex: number;
  explanation: string;
  options: string[];
  confidence: number;
  consensusAnalysis: string;
}> {
  // Step 1: AI Solves Question Independently
  let independentResult = { independentExplanation: "No independent explanation provided.", independentChoiceIndex: 0 };
  try {
    const solvePrompt = `You are an expert IIT-JEE exam solver and compiler.
Solve the following question independently step-by-step without searching the web or using other guides.
After solving it, select the correct option (0-based index: 0 for A, 1 for B, 2 for C, 3 for D).

Question:
${questionText}

Options:
${options.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join("\n")}

Respond with ONLY a valid JSON object. Do not wrap in markdown code blocks.

JSON format:
{
  "independentExplanation": "Step-by-step mathematical derivation...",
  "independentChoiceIndex": 0
}`;

    const solveRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct:free",
        messages: [{ role: "user", content: solvePrompt }]
      })
    });
    if (solveRes.ok) {
      const solveData: any = await solveRes.json();
      const solveRaw = solveData.choices?.[0]?.message?.content || "{}";
      let solveClean = solveRaw.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
      const firstBrace = solveClean.indexOf('{');
      if (firstBrace !== -1) {
        solveClean = solveClean.substring(firstBrace);
        const lastBrace = solveClean.lastIndexOf('}');
        if (lastBrace !== -1) solveClean = solveClean.substring(0, lastBrace + 1);
      }
      const parsedSolve = JSON.parse(solveClean);
      if (parsedSolve && typeof parsedSolve.independentChoiceIndex === 'number') {
        independentResult = {
          independentExplanation: parsedSolve.independentExplanation || "Solved independently.",
          independentChoiceIndex: parsedSolve.independentChoiceIndex
        };
      }
    }
  } catch (err) {
    console.error("Independent solve failed:", err);
  }

  // Step 2 & 3: Web search verification / Academic source & database check
  const searchSnippet = rawSearchTextSnippet || questionText.substring(0, 150);
  const searchQuery = `${searchSnippet} "JEE" answer key solution`;
  const searchResults = await backendSearch(searchQuery);

  // Step 4, 5 & 6: Consensus Analysis & Final Answer Selection with Confidence Score
  let finalResult = {
    questionText: questionText,
    correctOptionIndex: independentResult.independentChoiceIndex,
    explanation: independentResult.independentExplanation,
    options: options,
    confidence: 85,
    consensusAnalysis: "Verification consensus based on independent AI solver. Search results unavailable or inconclusive."
  };

  try {
    const consensusPrompt = `You are an expert IIT-JEE exam validator and answer verifier.
We need to verify the absolute correct option and answer using independent solve results and web search results (which query academic sites, textbook keys, and archives).

Original Question:
${questionText}

Original Options:
${options.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join("\n")}

1. Independent Solve Analysis:
Independent Choice Index: ${independentResult.independentChoiceIndex} (0=A, 1=B, 2=C, 3=D)
Explanation: ${independentResult.independentExplanation}

2. Web Search Results:
${searchResults}

Your tasks:
1. Conduct a consensus analysis. Compare the independent solve with the web search results. Check for any discrepancy.
2. Select the final correct option index (0-based: 0 for A, 1 for B, 2 for C, 3 for D).
3. Determine a confidence score (0 to 100%) indicating how certain we are of this answer. A high confidence (e.g. 95%+) means both independent solve and web search match perfectly and are clearly correct. If they disagree, investigate which is correct and rate confidence lower (e.g. 70-85%) explaining why.
4. Clean and format the question statement: convert all formulas and equations to LaTeX (using $...$ for inline and $$...$$ for block math), and replace any OCR glitches or box symbols (▢). Keep the original question statement 100% identical in meaning and wording, but correct any spelling or character rendering.
5. If the options array has dummy/generic values like "Option (1)" but the correct mathematical choices are listed inside the question body (e.g. (1) R = ... \\n(2) R = ...), extract those actual mathematical choice strings and return them in the "options" array. Otherwise, keep the options exactly as they are.
6. Write the final comprehensive step-by-step explanation in LaTeX.

Respond with ONLY a valid JSON object. Do not wrap in markdown code blocks.

JSON format:
{
  "questionText": "Cleaned question statement...",
  "correctOptionIndex": number,
  "explanation": "LaTeX explanation...",
  "confidence": number,
  "consensusAnalysis": "Brief summary of consensus..."
}`;

    const consensusRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct:free",
        messages: [{ role: "user", content: consensusPrompt }]
      })
    });
    if (consensusRes.ok) {
      const conData: any = await consensusRes.json();
      const conRaw = conData.choices?.[0]?.message?.content || "{}";
      let conClean = conRaw.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
      const firstBrace = conClean.indexOf('{');
      if (firstBrace !== -1) {
        conClean = conClean.substring(firstBrace);
        const lastBrace = conClean.lastIndexOf('}');
        if (lastBrace !== -1) conClean = conClean.substring(0, lastBrace + 1);
      }
      const parsedCon = JSON.parse(conClean);
      if (parsedCon && typeof parsedCon.correctOptionIndex === 'number') {
        finalResult = {
          questionText: parsedCon.questionText || questionText,
          correctOptionIndex: parsedCon.correctOptionIndex,
          explanation: parsedCon.explanation || "No explanation.",
          options: Array.isArray(parsedCon.options) && parsedCon.options.length === 4 ? parsedCon.options : options,
          confidence: typeof parsedCon.confidence === 'number' ? parsedCon.confidence : 90,
          consensusAnalysis: parsedCon.consensusAnalysis || "Consensus completed."
        };
      }
    }
  } catch (err) {
    console.error("Consensus analysis failed:", err);
  }

  return finalResult;
}

router.post("/extract-page", async (req: Request, res: Response) => {
  try {
    const { imageDataUrl, model, questionNumbers } = req.body;
    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return res.status(400).json({ error: "Missing or invalid imageDataUrl" });
    }

    const apiKey = req.headers.authorization?.replace("Bearer ", "") || process.env.OPENROUTER_API_KEY || "";
    if (!apiKey) {
      return res.status(401).json({ error: "Missing OpenRouter API Key" });
    }

    const base64Data = imageDataUrl.split(",")[1] || imageDataUrl;
    const modelName = model || "google/gemini-2.5-flash";

    const filterClause = questionNumbers && typeof questionNumbers === "string" && questionNumbers.trim().length > 0
      ? `\nCRITICAL DIRECTIVE: Extract ONLY the questions corresponding to numbers: ${questionNumbers.trim()} from the test paper. Do NOT extract any other questions. For example, if questionNumbers is "1, 2, 6", extract question 1, question 2, and question 6.\n`
      : "";

    const promptText = `You are a strict JEE Advanced question parser.
Your task is to scan the provided image of a test paper page and locate questions.${filterClause}
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
      // Crop images
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

      // Answer Verification using multi-step validation
      const verification = await verifyQuestionLogic(
        apiKey,
        q.text || q.rawSearchTextSnippet || "",
        q.options || [],
        q.subject,
        q.rawSearchTextSnippet
      );

      verifiedQuestions.push({
        id: `q_${q.subject.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        text: verification.questionText || q.text || q.rawSearchTextSnippet || "",
        options: verification.options || q.options,
        correctOptionIndex: verification.correctOptionIndex,
        explanation: verification.explanation,
        confidence: verification.confidence,
        consensusAnalysis: verification.consensusAnalysis,
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
});

router.post("/verify-question", async (req: Request, res: Response) => {
  try {
    const { questionText, options, subject, rawSearchTextSnippet } = req.body;
    if (!questionText || !Array.isArray(options)) {
      return res.status(400).json({ error: "Missing questionText or options" });
    }
    const apiKey = req.headers.authorization?.replace("Bearer ", "") || process.env.OPENROUTER_API_KEY || "";
    if (!apiKey) {
      return res.status(401).json({ error: "Missing OpenRouter API Key" });
    }

    const verification = await verifyQuestionLogic(apiKey, questionText, options, subject, rawSearchTextSnippet);
    return res.status(200).json(verification);
  } catch (err: any) {
    console.error("Verify question endpoint failed:", err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});

export default router;

