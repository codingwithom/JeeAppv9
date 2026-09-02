import fs from "fs";
import path from "path";
import * as pyq from "../pyqService.js";

const outDir = "public/data/pyq/papers";
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

async function scrapePaper(exam, paperKey, paperTitle, year) {
  const outPath = path.join(outDir, `${paperKey}.json`);
  if (fs.existsSync(outPath)) {
    console.log(`[Skip] Already exists: ${paperKey}`);
    return;
  }

  console.log(`[Scraping] ${paperKey}...`);
  try {
    const pData = await pyq.getPaperQuestions(exam, paperKey);
    const phySecs = (pData.questions || []).filter(s => (s.title || "").toLowerCase().includes("physics"));
    const phyQuestions = phySecs.flatMap(s => s.questions || []);

    if (phyQuestions.length === 0) {
      console.log(`  [Warn] No physics questions found in ${paperKey}`);
      return;
    }

    const fetchedIds = new Set();
    const questionMap = new Map();

    for (const qs of phyQuestions) {
      if (fetchedIds.has(qs.question_id)) continue;
      try {
        const detail = await pyq.getPaperSingleQuestion(exam, paperKey, qs.question_id);
        const batch = detail.questions || [];
        batch.forEach(q => {
          if (!fetchedIds.has(q.question_id)) {
            fetchedIds.add(q.question_id);
            questionMap.set(q.question_id, {
              question_id: q.question_id,
              paperTitle: q.paperTitle || pData.title || paperTitle,
              year: q.year || year,
              subject: q.subject || "physics",
              chapter: q.chapter || "",
              chapterGroup: q.chapterGroup || "",
              type: q.type || "mcq",
              marks: q.marks || 4,
              negMarks: q.negMarks !== undefined ? q.negMarks : 1,
              content: q.question?.en?.content || q.content,
              options: q.question?.en?.options || q.options || [],
              correct_options: q.question?.en?.correct_options || q.question?.en?.correctOptions || q.correct_options || [],
              explanation: q.question?.en?.explanation || q.explanation || ""
            });
          }
        });
        await new Promise(r => setTimeout(r, 60));
      } catch (err) {
        console.error(`  Error on ${qs.question_id}:`, err.message);
      }
    }

    const orderedQuestions = [];
    phyQuestions.forEach(qs => {
      const found = questionMap.get(qs.question_id);
      if (found) orderedQuestions.push(found);
      else {
        orderedQuestions.push({
          question_id: qs.question_id,
          content: qs.content,
          options: [],
          correct_options: [],
          explanation: ""
        });
      }
    });

    const paperResult = {
      exam,
      paperKey,
      title: pData.title || paperTitle,
      sections: [
        {
          title: "Physics",
          count: orderedQuestions.length,
          questions: orderedQuestions
        }
      ]
    };

    fs.writeFileSync(outPath, JSON.stringify(paperResult, null, 2));
    console.log(`  [Done] Saved ${paperKey}: ${orderedQuestions.length} questions`);
  } catch (err) {
    console.error(`  [Fail] ${paperKey}:`, err.message);
  }
}

async function run() {
  const jmData = JSON.parse(fs.readFileSync("src/data/pyq/jee-main-papers.json"));
  const jaData = JSON.parse(fs.readFileSync("src/data/pyq/jee-advanced-papers.json"));

  const targetYears = ["2023", "2022", "2021", "2020", "2019", "2018", "2017", "2016", "2015"];

  console.log("=== Scraping JEE Main Physics papers ===");
  for (const yearStr of targetYears) {
    const yearGroup = jmData.papers.find(y => String(y.title) === yearStr);
    if (!yearGroup || !yearGroup.papers) continue;
    console.log(`Processing Year ${yearStr} (${yearGroup.papers.length} papers)...`);
    for (const p of yearGroup.papers) {
      await scrapePaper("jee-main", p.key, p.title, parseInt(yearStr, 10));
      await new Promise(r => setTimeout(r, 80));
    }
  }

  console.log("=== Scraping JEE Advanced Physics papers ===");
  for (const yearStr of targetYears) {
    const yearGroup = jaData.papers.find(y => String(y.title) === yearStr);
    if (!yearGroup || !yearGroup.papers) continue;
    console.log(`Processing Year ${yearStr} (${yearGroup.papers.length} papers)...`);
    for (const p of yearGroup.papers) {
      await scrapePaper("jee-advanced", p.key, p.title, parseInt(yearStr, 10));
      await new Promise(r => setTimeout(r, 80));
    }
  }

  console.log("All requested papers scraping completed!");
}

run();
