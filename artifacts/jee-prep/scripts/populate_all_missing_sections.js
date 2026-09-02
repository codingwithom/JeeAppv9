import fs from "fs";
import path from "path";
import * as pyq from "../pyqService.js";

const papersDir = "public/data/pyq/papers";
const questionsDir = "public/data/pyq/questions";

if (!fs.existsSync(questionsDir)) {
  fs.mkdirSync(questionsDir, { recursive: true });
}

async function populatePaper(paperFile) {
  const pPath = path.join(papersDir, paperFile);
  const p = JSON.parse(fs.readFileSync(pPath, "utf8"));
  const exam = p.exam || (paperFile.startsWith("jee-advanced") ? "jee-advanced" : "jee-main");
  const paperKey = p.paperKey || paperFile.replace(".json", "");

  const stubSections = (p.sections || []).filter(s => 
    s.questions && s.questions.length > 0 && (s.questions[0].options === undefined || s.questions[0].type === undefined)
  );

  if (stubSections.length === 0) {
    return { file: paperFile, skipped: true };
  }

  const fetchedMap = new Map();

  for (const s of stubSections) {
    const populated = [];

    for (const qSummary of s.questions) {
      if (fetchedMap.has(qSummary.question_id)) {
        populated.push(fetchedMap.get(qSummary.question_id));
        continue;
      }

      try {
        const detail = await pyq.getPaperSingleQuestion(exam, paperKey, qSummary.question_id);
        const batch = detail.questions || [];
        for (const bq of batch) {
          if (bq && bq.question_id) {
            const normalized = {
              question_id: bq.question_id,
              paperTitle: bq.paperTitle || p.title,
              year: bq.year || p.year,
              examDate: bq.examDate,
              subject: bq.subject || s.title?.toLowerCase(),
              chapter: bq.chapter || "",
              chapterGroup: bq.chapterGroup || "",
              topic: bq.topic || bq.chapter || "",
              type: bq.type || (bq.question?.en?.options?.length > 0 ? "mcq" : "integer"),
              marks: bq.marks || 4,
              negMarks: bq.negMarks !== undefined ? bq.negMarks : (bq.type === "mcqm" ? 2 : 1),
              permalink: bq.permalink || "",
              content: bq.question?.en?.content || bq.content || qSummary.content || "",
              options: bq.question?.en?.options || bq.options || [],
              correct_options: bq.question?.en?.correct_options || bq.question?.en?.correctOptions || bq.correct_options || [],
              explanation: bq.question?.en?.explanation || bq.explanation || ""
            };
            fetchedMap.set(bq.question_id, normalized);

            if (normalized.permalink) {
              try {
                const qf = path.join(questionsDir, encodeURIComponent(normalized.permalink) + ".json");
                if (!fs.existsSync(qf)) {
                  fs.writeFileSync(qf, JSON.stringify({ questions: [normalized] }, null, 2));
                }
              } catch (e) {}
            }
          }
        }

        if (fetchedMap.has(qSummary.question_id)) {
          populated.push(fetchedMap.get(qSummary.question_id));
        } else {
          populated.push(qSummary);
        }
      } catch (err) {
        populated.push(qSummary);
      }

      await new Promise(r => setTimeout(r, 40));
    }

    s.questions = populated;
  }

  fs.writeFileSync(pPath, JSON.stringify(p, null, 2));
  console.log("[Success] Updated " + paperKey);
  return { file: paperFile, updated: true };
}

async function run() {
  const allFiles = fs.readdirSync(papersDir).filter(f => f.endsWith(".json"));
  const stubFiles = [];

  for (const f of allFiles) {
    try {
      const p = JSON.parse(fs.readFileSync(path.join(papersDir, f), "utf8"));
      const isStub = (p.sections || []).some(s => 
        s.questions && s.questions.length > 0 && (s.questions[0].options === undefined || s.questions[0].type === undefined)
      );
      if (isStub) stubFiles.push(f);
    } catch(e) {}
  }

  console.log("Total stub papers to scrape: " + stubFiles.length);

  const CONCURRENCY = 4;
  let index = 0;

  async function worker(workerId) {
    while (index < stubFiles.length) {
      const currentIdx = index++;
      const file = stubFiles[currentIdx];
      console.log("(Worker " + workerId + ") [" + (currentIdx + 1) + "/" + stubFiles.length + "] Starting " + file);
      try {
        await populatePaper(file);
      } catch (e) {
        console.error("(Worker " + workerId + ") Failed " + file + ":", e.message);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1));
  await Promise.all(workers);

  console.log("ALL PAPERS PROCESSED SUCCESSFULLY!");
}

run().catch(console.error);
