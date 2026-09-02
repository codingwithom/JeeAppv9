import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_DIR = path.join(__dirname, "data", "pyq_cache");

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// SvelteKit devalue unflatten implementation
export function unflatten(parsed) {
  if (!parsed || !Array.isArray(parsed)) return parsed;
  const values = parsed;
  const hydrated = new Array(values.length);
  function hydrate(index) {
    if (index === -1) return undefined;
    if (hydrated[index] !== undefined) return hydrated[index];
    const value = values[index];
    if (value === null || typeof value !== "object") return (hydrated[index] = value);
    if (Array.isArray(value)) {
      const array = new Array(value.length);
      hydrated[index] = array;
      for (let i = 0; i < value.length; i += 1) {
        if (value[i] !== -1) array[i] = hydrate(value[i]);
      }
      return array;
    }
    const object = {};
    hydrated[index] = object;
    for (const key in value) {
      if (value[key] !== -1) object[key] = hydrate(value[key]);
    }
    return object;
  }
  return hydrate(0);
}

export function fetchExamSideJson(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://questions.examside.com/"
      },
      timeout: 12000
    };

    const req = https.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith("/")) {
          redirectUrl = "https://questions.examside.com" + redirectUrl;
        }
        return resolve(fetchExamSideJson(redirectUrl));
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
      }

      let raw = "";
      res.on("data", chunk => raw += chunk);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.nodes && Array.isArray(parsed.nodes)) {
            let dataNode = null;
            for (let i = parsed.nodes.length - 1; i >= 0; i--) {
              if (parsed.nodes[i] && parsed.nodes[i].data) {
                dataNode = parsed.nodes[i];
                break;
              }
            }
            if (dataNode && dataNode.data) {
              const pageData = unflatten(dataNode.data);
              resolve(pageData);
            } else {
              resolve(parsed);
            }
          } else {
            resolve(parsed);
          }
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
  });
}

function getCachePath(key) {
  const safeKey = key.replace(/[^a-zA-Z0-9_\-]/g, "_");
  return path.join(CACHE_DIR, `${safeKey}.json`);
}

export function getCached(key) {
  try {
    const p = getCachePath(key);
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, "utf-8");
      return JSON.parse(content);
    }
  } catch (e) {
    console.error("Cache read error:", e);
  }
  return null;
}

export function setCached(key, data) {
  if (data === undefined || data === null) return;
  try {
    const p = getCachePath(key);
    fs.writeFileSync(p, JSON.stringify(data), "utf-8");
  } catch (e) {
    console.error("Cache write error:", e);
  }
}

// 1. Get papers list for an exam (jee-main or jee-advanced)
export async function getPapersList(exam = "jee-main") {
  const cacheKey = `papers_${exam}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const url = `https://questions.examside.com/past-years/year-wise/jee/${exam}/__data.json`;
  const data = await fetchExamSideJson(url);
  
  const result = {
    exam,
    title: data.title || (exam === "jee-main" ? "JEE Main" : "JEE Advanced"),
    papers: data.papers || []
  };

  setCached(cacheKey, result);
  return result;
}

// 2. Get questions list inside a specific paper
export async function getPaperQuestions(exam = "jee-main", paperKey) {
  const cacheKey = `paper_${exam}_${paperKey}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const url = `https://questions.examside.com/past-years/year-wise/jee/${exam}/${paperKey}/__data.json`;
  const data = await fetchExamSideJson(url);

  const result = {
    exam,
    paperKey,
    title: data.title || paperKey,
    paper: data.paper || null,
    papers: data.papers || [],
    questions: data.questions || []
  };

  setCached(cacheKey, result);
  return result;
}

// 3. Get single paper question detail
export async function getPaperSingleQuestion(exam = "jee-main", paperKey, questionId) {
  const cacheKey = `pq_${exam}_${paperKey}_${questionId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const url = `https://questions.examside.com/past-years/year-wise/jee/${exam}/${paperKey}/${questionId}/__data.json`;
  const data = await fetchExamSideJson(url);

  setCached(cacheKey, data);
  return data;
}

// 4. Get chapters list for a subject
export async function getChaptersList(exam = "jee-main", subject = "physics") {
  const cacheKey = `chapters_${exam}_${subject}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const url = `https://questions.examside.com/past-years/jee/${exam}/${subject}/__data.json`;
  const data = await fetchExamSideJson(url);

  const result = {
    exam,
    subject,
    title: data.title || "Physics",
    chapterGroups: data.subject?.chapterGroups || [],
    chapters: data.subject?.chapters || []
  };

  setCached(cacheKey, result);
  return result;
}

// 5. Get chapter questions list
export async function getChapterQuestions(exam = "jee-main", subject = "physics", chapterKey) {
  const cacheKey = `chapter_q_${exam}_${subject}_${chapterKey}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const url = `https://questions.examside.com/past-years/jee/${exam}/${subject}/${chapterKey}/__data.json`;
  const data = await fetchExamSideJson(url);

  const result = {
    exam,
    subject,
    chapterKey,
    title: data.title || chapterKey,
    chapter: data.chapter || null,
    questions: data.questions || []
  };

  setCached(cacheKey, result);
  return result;
}

// 6. Get single question details by permalink
export async function getQuestionByPermalink(permalink) {
  const cacheKey = `single_q_${permalink}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const url = `https://questions.examside.com/past-years/jee/question/${permalink}/__data.json`;
  const data = await fetchExamSideJson(url);

  setCached(cacheKey, data);
  return data;
}
