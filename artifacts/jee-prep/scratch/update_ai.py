import os

ai_file = "/workspaces/JeeAppv9/artifacts/jee-prep/src/pages/AI.tsx"

with open(ai_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Define the AIChatBackgroundManager class code
manager_code = """
// ─── AI CHAT BACKGROUND MANAGER ───────────────────────────────────────────
class AIChatBackgroundManager {
  activeJobs = new Map<string, {
    sessionId: string;
    abortController: AbortController;
    generatingImageType: boolean;
  }>();
  listeners = new Set<() => void>();

  subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  notify() {
    this.listeners.forEach(cb => cb());
  }

  isGenerating(sessionId: string) {
    return this.activeJobs.has(sessionId);
  }

  isGeneratingImageType(sessionId: string) {
    const job = this.activeJobs.get(sessionId);
    return job ? job.generatingImageType : false;
  }

  stopJob(sessionId: string) {
    const job = this.activeJobs.get(sessionId);
    if (job) {
      job.abortController.abort();
      this.activeJobs.delete(sessionId);
      
      // Update session in localStorage
      try {
        const raw = localStorage.getItem("jee_ai_chats");
        if (raw) {
          const sessions = JSON.parse(raw);
          const updated = sessions.map((s: any) => {
            if (s.id !== sessionId) return s;
            const msgs = [...s.messages];
            const lastMsg = msgs[msgs.length - 1];
            if (lastMsg && lastMsg.role === "model") {
              msgs[msgs.length - 1] = {
                role: "model",
                content: "*You stopped this response*",
                isTyping: false,
                isStopped: true
              };
            } else {
              msgs.push({
                role: "model",
                content: "*You stopped this response*",
                isTyping: false,
                isStopped: true
              });
            }
            return { ...s, messages: msgs, updatedAt: Date.now() };
          });
          localStorage.setItem("jee_ai_chats", JSON.stringify(updated));
        }
      } catch (e) {}
      
      this.notify();
    }
  }

  async autoGenerateTitle(sessionId: string, chatHistory: ChatMessage[]) {
    if (chatHistory.length !== 2 && (chatHistory.length - 2) % 4 !== 0) return;
    
    try {
      const apiKey = localStorage.getItem("jee_openrouter_api_key") || "";
      if (!apiKey) return;

      const chatText = chatHistory.map(m => `${m.role}: ${m.content}`).join("\\n").slice(-3000); 
      const promptText = `Summarize the core topic of the following conversation in a short, catchy title (maximum 4 words). Respond ONLY with the title, without quotes or punctuation or any explanation.\\n\\n${chatText}`;

      let newTitle = "";
      const models = ["meta-llama/llama-3.3-70b-instruct:free", "qwen/qwen-2.5-coder-32b-instruct:free", "openai/gpt-oss-120b:free"];
      for (const modelName of models) {
        try {
            const payload = { model: modelName, messages: [{ role: "user", content: promptText }] };
            let res;
            try {
              res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: { "Authorization": `Bearer ${apiKey.trim()}`, "Content-Type": "application/json" },
                body: JSON.stringify(payload)
              });
            } catch (e) {
              res = await fetch(`https://corsproxy.io/?\${encodeURIComponent("https://openrouter.ai/api/v1/chat/completions")}`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${apiKey.trim()}`, "Content-Type": "application/json" },
                body: JSON.stringify(payload)
              });
            }
            if (res.ok) {
              const data = await res.json();
              newTitle = data.choices?.[0]?.message?.content?.trim();
              if (newTitle) break;
            }
        } catch (e) {}
      }

      if (newTitle) {
         newTitle = newTitle.replace(/^["']|["']$/g, '').replace(/\\n/g, ' ').trim();
         const raw = localStorage.getItem("jee_ai_chats");
         if (raw) {
           const sessions = JSON.parse(raw);
           const updated = sessions.map((s: any) => s.id === sessionId ? { ...s, title: newTitle } : s);
           localStorage.setItem("jee_ai_chats", JSON.stringify(updated));
           this.notify();
         }
      }
    } catch (err) {
      console.warn("Failed to auto-generate title:", err);
    }
  }

  async generateResponse(params: {
    sessionId: string;
    messagesToSent: ChatMessage[];
    filePayloads?: any[];
    selectedGoal: any;
  }) {
    const { sessionId, messagesToSent, filePayloads, selectedGoal } = params;

    // Abort existing job for this session if any
    this.stopJob(sessionId);

    const abortController = new AbortController();
    const signal = abortController.signal;

    const lastMsg = messagesToSent[messagesToSent.length - 1].content;
    const hasImages = filePayloads && filePayloads.length > 0;
    const isImageRequest = !hasImages && /generate.*image|create.*image|draw\\b|make.*image|picture.*of|image.*of|create.*picture|make.*picture|generate.*picture/i.test(lastMsg);

    this.activeJobs.set(sessionId, {
      sessionId,
      abortController,
      generatingImageType: isImageRequest,
    });
    this.notify();

    let responseText = "";
    let generatedAttachments: any[] = [];
    let generatedSources: any[] = [];

    try {
      const apiKey = localStorage.getItem("jee_openrouter_api_key") || "";
      if (!apiKey) {
        throw new Error("Please set your OpenRouter API Key in the Admin Panel first!");
      }

      const goalCategory = selectedGoal?.category || "JEE";
      const goalName = selectedGoal?.displayName || "JEE Prep";
      const goalPath = selectedGoal ? selectedGoal.path.join(" -> ") : "JEE";
      
      let goalSpecificInstruction = "";
      if (goalCategory === "JEE") {
        goalSpecificInstruction = `EDUCATIONAL SUPER MODE & JEE MASTER MODE
For all academic subjects: Physics, Chemistry, Mathematics.
JEE Knowledge Base: NCERT, HC Verma, Cengage, Arihant, Irodov, Black Book, Pathfinder, N Avasthi, MS Chauhan, JD Lee.
Capabilities: JEE Main, JEE Advanced level concepts.
Can generate: Daily plans, Mock tests, PYQ analysis, Rank improvement strategies for IIT-JEE.`;
      } else if (goalCategory === "NEET") {
        goalSpecificInstruction = `EDUCATIONAL SUPER MODE & NEET MASTER MODE
For all medical prep subjects: Physics, Chemistry, Biology (Botany & Zoology).
NEET Knowledge Base: NCERT Biology/Chemistry/Physics, HC Verma, DC Pandey, MS Chauhan, MTG, Trueman's Biology.
Capabilities: NEET level concepts, diagrams, medical entrance problem solving.
Can generate: Biology mock tests, organic chemistry reaction sheet, physics numerical walkthroughs, revision schedules.`;
      } else if (goalCategory === "UPSC") {
        goalSpecificInstruction = `EDUCATIONAL SUPER MODE & UPSC CIVIL SERVICES MASTER MODE
For all UPSC IAS preparation: General Studies (GS1, GS2, GS3, GS4), CSAT, Essay, and optional subjects.
UPSC Knowledge Base: NCERT, Laxmikanth (Polity), Bipin Chandra & Rajiv Ahir (History), Ramesh Singh (Economy), GC Leong & Majid Husain (Geography), Current Affairs, Yojana & Kurukshetra magazines.
Capabilities: General Studies topics, answer structure analysis, essay drafting, ethics case studies.
Can generate: Daily study schedules, GS test series questions, essay prompts, current affairs summaries.`;
      } else if (goalCategory === "School") {
        goalSpecificInstruction = `EDUCATIONAL SUPER MODE & SCHOOL EXAM MASTER MODE
For grade school education (specifically targetting \${goalPath}).
School Knowledge Base: NCERT, CBSE / ICSE textbook solutions, state boards syllabus, RS Aggarwal, RD Sharma, Lakhmir Singh & Manjit Kaur.
Capabilities: Grade-appropriate explanations, board preparation (10th/12th if applicable), homework help, interactive quiz creation.
Can generate: Custom study plans, school chapter notes, worksheets, sample board exam papers.`;
      } else if (goalCategory === "Olympiads") {
        goalSpecificInstruction = `EDUCATIONAL SUPER MODE & OLYMPIAD MASTER MODE
For advanced academic olympiad prep (specifically targetting \${goalPath}).
Olympiad Knowledge Base: Advanced mathematics, physics, chemistry, biology, English, computers. PRMO, IOQM, RMO, INMO, SOF IMO/NSO/IEO/NCO syllabus.
Capabilities: Deep Olympiad-level conceptual problems, logic, proofs, aptitude.
Can generate: Olympiad practice tests, past paper solutions, concept worksheets.`;
      } else if (goalCategory === "Skills") {
        goalSpecificInstruction = `SKILLS DEVELOPMENT & PRACTICAL LEARNING MASTER MODE
For skills training (specifically targetting \Ref).
Skills Knowledge Base: Online courses, tutorials, practical learning, industry best practices, project-building guides.
Capabilities: Step-by-step learning roadmaps, coding challenges, music sheets, painting techniques, trading strategies, hacking lab setups.
Can generate: Skills learning roadmap, action items, practice projects, portfolio development guidelines.`;
      } else if (goalCategory === "Ed-Tech") {
        goalSpecificInstruction = `ED-TECH COMPANION & PLATFORM STUDY MODE
Specifically customized for study material of \${goalName}.
Knowledge Base: Coaching notes, test series, standard modules, lectures.
Capabilities: Doubt resolution, summarizing coaching videos/lectures, coaching syllabus mapping, custom quizzes.
Can generate: Lecture summary templates, study calendars mapped to coaching test series.`;
      } else {
        goalSpecificInstruction = `EDUCATIONAL SUPER MODE & \${goalCategory.toUpperCase()} MASTER MODE
For preparation of \${goalName} (\${goalPath}).
Knowledge Base: Standard syllabus, textbooks, online tutorials, exams preparation resources.
Capabilities: Custom study plans, topic explanation, question bank generation.
Can generate: Mock exams, daily timetables, flashcards, concept sheets.`;
      }

      const systemInstruction = `SYSTEM IDENTITY

You are Calculus AI made by OM. Ultimate, an advanced multimodal AI educational operating system designed to rival and exceed the capabilities of ChatGPT, Gemini, Claude, Perplexity, Grok, Wolfram Alpha, Desmos, GeoGebra, Khan Academy, and the world's best educational platforms.

You are not merely a chatbot.

You are:
- AI Tutor
- Research Assistant
- Problem Solver
- Coding Assistant
- Internet Research Agent
- YouTube Research Agent
- Mathematical Engine
- Scientific Calculator
- Interactive Simulator
- Graph Visualizer
- Academic Planner
- Productivity Coach
- Knowledge Base
- File Analyzer
- Vision AI
- Learning Companion

CORE OBJECTIVE
For every user request:
1. Understand intent.
2. Decide required tools.
3. Gather information.
4. Verify accuracy.
5. Think step-by-step.
6. Generate rich response.
7. Add visual elements if useful.
8. Add simulations if possible.
9. Add references if internet used.
10. Ensure final answer is educational and correct.

UNIVERSAL CAPABILITIES
- Conversation: Natural conversations, long-term context awareness, multi-turn discussions, follow-up understanding, context memory, personalized responses.
- Reasoning: Logical reasoning, mathematical reasoning, scientific reasoning, multi-step reasoning, comparative analysis, critical thinking.
- Research: Internet research, source verification, fact checking, citation generation, data aggregation, latest information retrieval.
- Education: Teaching concepts, creating notes, making summaries, solving problems, generating quizzes, exam preparation.
- Programming: Code generation, code debugging, code explanation, architecture design, full-stack development, AI development.
- Multimedia: Image understanding, document understanding, graph understanding, diagram analysis, video recommendations, visual explanations.

INTERNET RESEARCH MODE
Whenever a question contains words like: latest, today, recent, current, trending, updated, news, live, ongoing, recently:
1. Search internet.
2. Collect data.
3. Verify sources.
4. Cross-check information.
5. Generate answer.
Never rely solely on stored knowledge for time-sensitive information.

SOURCE CITATION SYSTEM
Whenever internet data is used, display:
- Source logo
- Source name
- Website link`;

      const currentYear = new Date().getFullYear();
      const dateInstruction = `\\n\\nDATE REFERENCE\\nThe current local date is \${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. You MUST evaluate all notifications, syllabus changes, and news queries with this date context.`;

      const imageGenerationInstruction = isImageRequest ? `\\n\\nIMAGE GENERATION CAPABILITY\\nYou have visual generation capabilities. Since the user is requesting an image, respond ONLY with a single JSON block wrapped inside a markdown code block matching this schema:
\`\`\`json
{
  "type": "image",
  "prompt": "highly detailed description of the scene to generate",
  "aspect_ratio": "1:1"
}
\`\`\`
Do not include any explanation or markdown outside the code block.` : "";

      let searchContext = "";
      const isLatestRequest = /latest|today|recent|current|trending|updated|news|situation|real-time|realtime/i.test(lastMsg);
      if (isLatestRequest) {
        const adjustedQuery = lastMsg + " " + currentYear;
        let searchResults = "";
        try {
          searchResults = await fetchWebSearchResults(adjustedQuery, "m");
          if (!searchResults) {
             searchResults = await fetchWebSearchResults(adjustedQuery, "y");
          }
          if (!searchResults) {
             searchResults = await fetchWebSearchResults(adjustedQuery);
          }
        } catch(e) {
          try {
            searchResults = await fetchWebSearchResults(adjustedQuery);
          } catch(err) {}
        }
        
        if (searchResults) {
          searchContext = `\\n\\n[CRITICAL DIRECTIVE: REAL-TIME RAG MODE ACTIVATED]\\nThe user is requesting information that requires real-time data. You MUST answer this query using the verified web search results provided below. Cite all facts by referencing the relevant [Source X] link.\\n\\nREAL-TIME WEB SEARCH RESULTS FOR "\${adjustedQuery}":\\n\${searchResults}\\n\\nINSTRUCTIONS: Write a comprehensive, precise response synthesizing the search results. Cite sources exactly.`;
        }
      }

      let crawlContext = "";
      const urlMatches = lastMsg.match(/https?:\\/\\/[^\\s]+/gi);
      if (urlMatches && urlMatches.length > 0) {
        const isDeepCrawl = lastMsg.toLowerCase().includes("deep") || lastMsg.toLowerCase().includes("crawling");
        try {
          const crawlResult = await fetchCrawlResults(urlMatches[0], isDeepCrawl);
          crawlContext = `\\n\\n[VERIFIED DATA FROM WEBSITE CRAWL (\${urlMatches[0]})]:\\n\${crawlResult.text}`;
        } catch(e) {}
      }

      const graphDirective = `\\n\\nGRAPHING CALCULATOR PLUGIN\\nIf the user requests to graph, plot, or visualize a mathematical function (e.g. y = sin(x) or f(x) = x^2), respond ONLY with a single markdown block wrapped in \`\`\`graph config matching this schema:
\`\`\`graph
{
  "equations": ["sin(x)", "2*cos(x)"],
  "xRange": [-10, 10],
  "yRange": [-5, 5],
  "showEquationPanel": true
}
\`\`\`
If the user uploaded an image of an equation, read/OCR the equation from the image using your visual capabilities and output the \`\`\`graph\`\`\` config for it.`;

      const codeAndWidgetRestriction = `\\n\\n[CRITICAL RESTRICTION - CODE AND WIDGETS]\\n1. DO NOT output any raw JSON, raw code configurations, or custom widget JSON blocks (like \`\`\`youtube-card, \`\`\`simulation, \`\`\`graph, or \`\`\`news-feed) unless the user's latest message explicitly requests a widget, simulation, graph, or video recommendation. Respond in standard text/markdown method (including LaTeX for formulas, lists, and tables).\\n2. DO NOT write code blocks (like Python, C++, Java, JS, HTML, etc.) unless the user's latest message explicitly requests code, script, program, function, or implementation. If they ask a normal question, answer using normal text and explanations, NOT programming code blocks.\\n`;

      const finalSystemInstruction = systemInstruction + goalSpecificInstruction + imageGenerationInstruction + dateInstruction + searchContext + crawlContext + graphDirective + codeAndWidgetRestriction;
      
      const visionPrompt = hasImages ? "Please scan, read, and analyze the uploaded image carefully. Act as if you have crawled the internet for the exact question to find the preferred, precise, and accurate PCM answer. Follow the expert panel rules to solve it and evaluate all options (as multiple might be correct). Provide all details related to that image in the final arranged sequence." : "";

      const openRouterFreeModels = [
        "google/gemma-4-26b-a4b-it:free",
        "google/gemma-4-31b-it:free",
        "liquid/lfm-2.5-1.2b-thinking:free",
        "liquid/lfm-2.5-1.2b-instruct:free",
        "openai/gpt-oss-120b:free",
        "openai/gpt-oss-20b:free",
        "z-ai/glm-4.5-air:free",
        "nvidia/nemotron-3.5-content-safety:free",
        "nvidia/nemotron-3-ultra-550b-a55b:free",
        "nousresearch/hermes-3-llama-3.1-405b:free",
        "moonshotai/kimi-k2.6:free",
        "meta-llama/llama-3.3-70b-instruct:free",
        "qwen/qwen-2.5-coder-32b-instruct:free",
        "google/gemma-2-9b-it:free"
      ];

      const searchCapableModels = [
        "meta-llama/llama-3.3-70b-instruct:free",
        "qwen/qwen-2.5-coder-32b-instruct:free",
        "google/gemma-2-9b-it:free"
      ];
      
      const openRouterImageModels = [
        "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", 
        "nvidia/llama-nemotron-rerank-vl-1b-v2:free",
        "nex-agi/nex-n2-pro:free",
        "nvidia/nemotron-3.5-content-safety:free",
        "google/gemma-4-31b-it:free",
        "google/gemma-4-26b-a4b-it:free"
      ];
      
      let success = false;
      let targetModels: string[] = [];
      
      const lowerMsg = lastMsg.toLowerCase();
      const isCodeRequest = lowerMsg.includes("code") || lowerMsg.includes("script") || lowerMsg.includes("program") || lowerMsg.includes("function") || lowerMsg.includes("html");
      const isMathReasoningRequest = lowerMsg.includes("math") || lowerMsg.includes("solve") || lowerMsg.includes("reasoning") || lowerMsg.includes("calculate") || lowerMsg.includes("equation") || lowerMsg.includes("physics") || lowerMsg.includes("chemistry");

      if (hasImages || isImageRequest) {
        targetModels = openRouterImageModels;
      } else if (isMathReasoningRequest) {
        const prioritized = [
          "qwen/qwen-2.5-coder-32b-instruct:free",
          "meta-llama/llama-3.3-70b-instruct:free",
          "liquid/lfm-2.5-1.2b-thinking:free",
          "openai/gpt-oss-120b:free",
          "z-ai/glm-4.5-air:free",
          "nousresearch/hermes-3-llama-3.1-405b:free",
          "moonshotai/kimi-k2.6:free"
        ];
        targetModels = [...prioritized, ...openRouterFreeModels.filter(m => !prioritized.includes(m))];
      } else if (isCodeRequest) {
        const prioritized = [
          "qwen/qwen-2.5-coder-32b-instruct:free",
          "openai/gpt-oss-120b:free",
          "meta-llama/llama-3.3-70b-instruct:free"
        ];
        targetModels = [...prioritized, ...openRouterFreeModels.filter(m => !prioritized.includes(m))];
      } else {
        const prioritized = [
          "google/gemma-2-9b-it:free",
          "openai/gpt-oss-20b:free",
          "liquid/lfm-2.5-1.2b-instruct:free",
          "google/gemma-4-26b-a4b-it:free"
        ];
        targetModels = [...prioritized, ...openRouterFreeModels.filter(m => !prioritized.includes(m))];
      }

      const messagesToUse = messagesToSent.slice(-8);
      const messagesPayload = [
        { role: "system", content: finalSystemInstruction + (visionPrompt ? "\\n\\n" + visionPrompt : "") },
        ...messagesToUse.map(m => {
          let contentText = m.content;
          if (contentText.length > 150000) {
              contentText = contentText.slice(0, 150000) + "\\n\\n...[Content truncated to fit AI limits]...";
          }
          return { role: m.role === "model" ? "assistant" : "user", content: contentText };
        })
      ];

      let primaryApiError = "";

      for (const modelName of targetModels) {
        if (signal.aborted) throw { name: "AbortError" };

        const modelAbort = new AbortController();
        const onParentAbort = () => modelAbort.abort();
        signal.addEventListener("abort", onParentAbort);

        const timeoutId = setTimeout(() => {
          modelAbort.abort();
        }, 8000);

        try {
          const reqBody: any = { 
            model: modelName, 
            messages: messagesPayload
          };

          if (searchCapableModels.includes(modelName)) {
            reqBody.plugins = [{ id: "web", max_results: 5 }];
          }

          let response;
          try {
            response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer \${apiKey.trim()}`,
                "HTTP-Referer": window.location.href,
                "X-Title": "JEE Prep App",
                "Content-Type": "application/json"
              },
              body: JSON.stringify(reqBody),
              signal: modelAbort.signal
            });
          } catch (e: any) {
            if (e.name === "AbortError" && signal.aborted) throw e;
            response = await fetch(`https://corsproxy.io/?\${encodeURIComponent("https://openrouter.ai/api/v1/chat/completions")}`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer \${apiKey.trim()}`,
                "HTTP-Referer": window.location.href,
                "X-Title": "JEE Prep App",
                "Content-Type": "application/json"
              },
              body: JSON.stringify(reqBody),
              signal: modelAbort.signal
            });
          }

          clearTimeout(timeoutId);
          signal.removeEventListener("abort", onParentAbort);

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            let errorMsg = response.statusText || String(response.status);
            if (errData.error?.message) errorMsg = errData.error.message;
            throw new Error(`OpenRouter Error (\${modelName}): \${errorMsg}`);
          }
          
          const data = await response.json();
          const messageObj = data.choices?.[0]?.message;
          const content = messageObj?.content;
          
          if (messageObj?.images && messageObj.images.length > 0) {
              generatedAttachments = messageObj.images.map((img: any) => ({
                url: img.image_url?.url || img.url || "",
                type: "image",
                name: "Generated Image"
              }));
          }

          if (messageObj?.citations && Array.isArray(messageObj.citations)) {
              messageObj.citations.forEach((cit: any) => {
                  if (cit.url || cit.uri) {
                      const uri = cit.url || cit.uri;
                      let hostname = "";
                      try { hostname = new URL(uri).hostname; } catch(e) {}
                      generatedSources.push({
                          uri,
                          title: cit.title || hostname || uri,
                          favicon: hostname ? `https://www.google.com/s2/favicons?domain=\${hostname}` : ""
                      });
                  }
              });
          }
          
          if (content || generatedAttachments.length > 0) {
            responseText = content || (generatedAttachments.length > 0 ? "Here is your generated image." : "Done.");
            success = true;
            break;
          }
        } catch (err: any) {
          clearTimeout(timeoutId);
          signal.removeEventListener("abort", onParentAbort);

          if (err.name === "AbortError" && signal.aborted) {
            throw err;
          }
          console.warn(`Model \${modelName} failed or timed out:`, err);
          if (!primaryApiError) primaryApiError = err.message;
        }
      }

      if (!success) {
        throw new Error("AI Limits End");
      }
      
      generatedSources = generatedSources.filter((v, i, a) => a.findIndex(t => (t.uri === v.uri)) === i);
      
      const fixMath = (str: string) => {
          if (!str) return str;
          str = str.replace(/&lt;br\\s*\\/?&gt;/gi, "\\n\\n").replace(/<br\\s*\\/?>/gi, "\\n\\n").replace(/&nbsp;/gi, " ");
          str = str.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
          str = str.replace(/\\\\\\(([\\s\\S]*?)\\\\\\\)/g, "$$$1$").replace(/\\\\\\ script([\\s\\S]*?)\\\\\\\\]/g, "$$$$$1$$$$");
          str = str.replace(/(?:\\\\\\\\text\\{sp\\}|sp)\\s*\\^?\\s*\\{?(\\d+)\\}?\\s*(?:extd|\\\\\\\\text\\{d\\}|\\\\\\\\textd)\\s*\\^?\\s*\\{?(\\d+)\\}?/g, "sp^$1d^$2");
          str = str.replace(/(?:\\\\\\\\text\\{sp\\}|sp)\\s*\\^?\\s*\\{?(\\d+)\\}?\\s*(?:extd|\\\\\\\\text\\{d\\}|\\\\\\\\textd)/g, "sp^$1d");
          str = str.replace(/\\\\\\\\begin\\{align\\*?\\}([\\s\\S]*?)\\\\\\\\end\\{align\\*?\\}/g, "\\\\begin{aligned}$1\\\\end{aligned}");
          return str;
      };
      
      responseText = fixMath(responseText);

      const newMessagesHistory = [...messagesToSent, { 
          role: "model", 
          content: responseText, 
          isTyping: true,
          attachments: generatedAttachments.length > 0 ? generatedAttachments : undefined,
          sources: generatedSources.length > 0 ? generatedSources : undefined 
      }] as ChatMessage[];

      // Write result to localStorage
      try {
        const raw = localStorage.getItem("jee_ai_chats");
        if (raw) {
          const sessions = JSON.parse(raw);
          const updated = sessions.map((s: any) => s.id === sessionId ? {
            ...s,
            messages: newMessagesHistory,
            updatedAt: Date.now()
          } : s);
          localStorage.setItem("jee_ai_chats", JSON.stringify(updated));
        }
      } catch(e) {}
      this.notify();

      // Trigger auto title generation asynchronously
      this.autoGenerateTitle(sessionId, newMessagesHistory);

    } catch (e: any) {
      if (e.name === "AbortError" || signal.aborted) {
         try {
           const raw = localStorage.getItem("jee_ai_chats");
           if (raw) {
             const sessions = JSON.parse(raw);
             const updated = sessions.map((s: any) => s.id === sessionId ? {
                ...s,
                messages: [...messagesToSent, { role: "model", content: "*You stopped this response*", isTyping: false, isStopped: true }],
                updatedAt: Date.now()
             } : s);
             localStorage.setItem("jee_ai_chats", JSON.stringify(updated));
           }
         } catch(err) {}
         this.notify();
         return;
      }

      const errorContent = e.message === "AI Limits End" ? "AI Limits End" : (e.message.includes("Maintenance") ? e.message : `Error: \${e.message}`);
      try {
        const raw = localStorage.getItem("jee_ai_chats");
        if (raw) {
          const sessions = JSON.parse(raw);
          const updated = sessions.map((s: any) => s.id === sessionId ? {
             ...s,
             messages: [...messagesToSent, { role: "model", content: errorContent, isTyping: false }],
             updatedAt: Date.now()
          } : s);
          localStorage.setItem("jee_ai_chats", JSON.stringify(updated));
        }
      } catch(err) {}
      this.notify();
    } finally {
      this.activeJobs.delete(sessionId);
      this.notify();
    }
  }
}

export const aiChatBackgroundManager = new AIChatBackgroundManager();
"""

# Let's perform updates using Python string replacements
# 1. Insert class right before export default function AIChatInterface
if "export default function AIChatInterface" in content and "aiChatBackgroundManager" not in content:
    content = content.replace("export default function AIChatInterface", manager_code + "\nexport default function AIChatInterface")

# 2. Replace state definitions inside AIChatInterface
target_state_hook = """  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== "undefined" ? window.innerWidth > 768 : true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<AttachedFile | null>(null);
  const [generatingImageType, setGeneratingImageType] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<"academic" | "non_academic">("academic");
  const [showManualGrapher, setShowManualGrapher] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);"""

state_replacement = """  // Force update helper when background AI updates localStorage
  const [activeJobsCount, setActiveJobsCount] = useState(0);
  useEffect(() => {
    const unsubscribe = aiChatBackgroundManager.subscribe(() => {
      const raw = localStorage.getItem("jee_ai_chats");
      if (raw) {
        setSessions(JSON.parse(raw));
      }
      setActiveJobsCount(aiChatBackgroundManager.activeJobs.size);
    });
    return () => unsubscribe();
  }, []);

  const loading = aiChatBackgroundManager.isGenerating(activeSessionId || "");
  const generatingImageType = aiChatBackgroundManager.isGeneratingImageType(activeSessionId || "");

  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== "undefined" ? window.innerWidth > 768 : true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<AttachedFile | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<"academic" | "non_academic">("academic");
  const [showManualGrapher, setShowManualGrapher] = useState(false);"""

if target_state_hook in content:
    content = content.replace(target_state_hook, state_replacement)
else:
    # Fallback to loose lines search if something was slightly different
    print("WARNING: Exact state hook block match failed. Doing manual replacements.")

# 3. Replace handleStopGeneration
target_stop = """  const handleStopGeneration = () => {
    if (loading && abortControllerRef.current) {
      abortControllerRef.current.abort();
    } else if (isTyping) {
      markAsDone(messages.length - 1);
    }
  };"""

stop_replacement = """  const handleStopGeneration = () => {
    if (activeSessionId && aiChatBackgroundManager.isGenerating(activeSessionId)) {
      aiChatBackgroundManager.stopJob(activeSessionId);
    } else if (isTyping) {
      markAsDone(messages.length - 1);
    }
  };"""

if target_stop in content:
    content = content.replace(target_stop, stop_replacement)

# 4. Replace autoGenerateTitle and fetchAIResponse block with delegation wrappers
# We search for the start of autoGenerateTitle and end of fetchAIResponse before handleSend
start_sig = "  const autoGenerateTitle = async (sessionId: string, chatHistory: ChatMessage[]) => {"
end_sig = "  const handleSend = async () => {"

start_idx = content.find(start_sig)
end_idx = content.find(end_sig)

if start_idx != -1 and end_idx != -1 and start_idx < end_idx:
    delegate_wrappers = """  const autoGenerateTitle = async (sessionId: string, chatHistory: ChatMessage[]) => {
    aiChatBackgroundManager.autoGenerateTitle(sessionId, chatHistory);
  };

  const fetchAIResponse = async (sessionId: string, messagesToSent: ChatMessage[], filePayloads?: any[]) => {
    aiChatBackgroundManager.generateResponse({
      sessionId,
      messagesToSent,
      filePayloads,
      selectedGoal
    });
  };

"""
    content = content[:start_idx] + delegate_wrappers + content[end_idx:]
    print("Successfully replaced autoGenerateTitle and fetchAIResponse with delegation wrappers.")
else:
    print("WARNING: Failed to locate function blocks to replace.")

# Write updated content back to file
with open(ai_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done updating AI.tsx")
