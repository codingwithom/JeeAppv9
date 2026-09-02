import fs from "fs";
import path from "path";
import * as pyqService from "../pyqService.js";

const papersToScrape = [
  // JEE Main 2026
  { exam: "jee-main", key: "jee-main-2026-online-6th-april-evening-shift" },
  { exam: "jee-main", key: "jee-main-2026-online-6th-april-morning-shift" },
  { exam: "jee-main", key: "jee-main-2026-online-5th-april-morning-shift" },
  { exam: "jee-main", key: "jee-main-2026-online-5th-april-evening-shift" },
  { exam: "jee-main", key: "jee-main-2026-online-31st-jan-morning-shift" },
  { exam: "jee-main", key: "jee-main-2026-online-31st-jan-evening-shift" },
  { exam: "jee-main", key: "jee-main-2026-online-1st-feb-morning-shift" },
  { exam: "jee-main", key: "jee-main-2026-online-1st-feb-evening-shift" },

  // JEE Main 2025
  { exam: "jee-main", key: "jee-main-2025-online-8th-april-evening-shift" },
  { exam: "jee-main", key: "jee-main-2025-online-7th-april-morning-shift" },
  { exam: "jee-main", key: "jee-main-2025-online-7th-april-evening-shift" },
  { exam: "jee-main", key: "jee-main-2025-online-27th-jan-morning-shift" },
  { exam: "jee-main", key: "jee-main-2025-online-27th-jan-evening-shift" },

  // JEE Main 2024
  { exam: "jee-main", key: "jee-main-2024-online-27th-jan-morning-shift" },
  { exam: "jee-main", key: "jee-main-2024-online-27th-jan-evening-shift" },
  { exam: "jee-main", key: "jee-main-2024-online-29th-jan-morning-shift" },
  { exam: "jee-main", key: "jee-main-2024-online-30th-jan-morning-shift" },

  // JEE Advanced 2025 & 2024
  { exam: "jee-advanced", key: "jee-advanced-2025-paper-1-online" },
  { exam: "jee-advanced", key: "jee-advanced-2025-paper-2-online" },
  { exam: "jee-advanced", key: "jee-advanced-2024-paper-1-online" },
  { exam: "jee-advanced", key: "jee-advanced-2024-paper-2-online" }
];

async function scrapePaper(exam, paperKey) {
  const outPath = `public/data/pyq/papers/${paperKey}.json`;
  if (fs.existsSync(outPath)) {
    console.log(`[Skip] Already exists: ${paperKey}`);
    return;
  }

  console.log(`[Start] Scraping ${paperKey}...`);
  try {
    const paperData = await pyqService.getPaperQuestions(exam, paperKey);
    const phySec = paperData.questions?.find(s => s.title?.toLowerCase() === "physics");
    if (!phySec) {
      console.log(`[Warn] No physics section in ${paperKey}`);
      return;
    }

    const fullQuestions = [];
    const fetchedIds = new Set();

    for (let i = 0; i < phySec.questions.length; i++) {
      const qSummary = phySec.questions[i];
      if (fetchedIds.has(qSummary.question_id)) continue;

      try {
        const detail = await pyqService.getPaperSingleQuestion(exam, paperKey, qSummary.question_id);
        const batch = detail.questions || [];
        batch.forEach(q => {
          if (!fetchedIds.has(q.question_id)) {
            fetchedIds.add(q.question_id);
            fullQuestions.push({
              question_id: q.question_id,
              paperTitle: q.paperTitle || paperData.title,
              year: q.year,
              subject: q.subject,
              chapter: q.chapter,
              chapterGroup: q.chapterGroup,
              type: q.type,
              marks: q.marks,
              negMarks: q.negMarks,
              content: q.question?.en?.content || q.content,
              options: q.question?.en?.options || [],
              correct_options: q.question?.en?.correct_options || q.question?.en?.correctOptions || [],
              explanation: q.question?.en?.explanation || ""
            });
          }
        });
        await new Promise(r => setTimeout(r, 250));
      } catch (err) {
        console.error(`  Error on ${qSummary.question_id}:`, err.message);
      }
    }

    const result = {
      exam,
      paperKey,
      title: paperData.title,
      sections: [
        {
          title: "Physics",
          count: fullQuestions.length,
          questions: fullQuestions
        }
      ]
    };

    fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
    console.log(`[Done] Saved ${paperKey} with ${fullQuestions.length} physics questions.`);
  } catch (err) {
    console.error(`[Fail] Could not scrape ${paperKey}:`, err.message);
  }
}

async function main() {
  console.log(`Starting scrape of ${papersToScrape.length} papers...`);
  for (const item of papersToScrape) {
    await scrapePaper(item.exam, item.key);
    await new Promise(r => setTimeout(r, 400));
  }
  console.log("All paper scraping finished!");
}

main();
