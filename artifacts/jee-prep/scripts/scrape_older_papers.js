import fs from "fs";
import path from "path";
import * as pyqService from "../pyqService.js";

const papersDir = "public/data/pyq/papers";
const questionsDir = "public/data/pyq/questions";

const olderPapers = [
  // JEE Main / AIEEE
  { exam: "jee-main", key: "jee-main-2014-offline" },
  { exam: "jee-main", key: "jee-main-2013-offline" },
  { exam: "jee-main", key: "aieee-2012" },
  { exam: "jee-main", key: "aieee-2011" },
  { exam: "jee-main", key: "aieee-2010" },
  { exam: "jee-main", key: "aieee-2009" },
  { exam: "jee-main", key: "aieee-2008" },
  { exam: "jee-main", key: "aieee-2007" },
  { exam: "jee-main", key: "aieee-2006" },
  { exam: "jee-main", key: "aieee-2005" },
  { exam: "jee-main", key: "aieee-2004" },
  { exam: "jee-main", key: "aieee-2003" },
  { exam: "jee-main", key: "aieee-2002" },

  // JEE Advanced / IIT-JEE
  { exam: "jee-advanced", key: "jee-advanced-2014-paper-1-offline" },
  { exam: "jee-advanced", key: "jee-advanced-2014-paper-2-offline" },
  { exam: "jee-advanced", key: "jee-advanced-2013-paper-1-offline" },
  { exam: "jee-advanced", key: "jee-advanced-2013-paper-2-offline" },
  { exam: "jee-advanced", key: "iit-jee-2012-paper-1-offline" },
  { exam: "jee-advanced", key: "iit-jee-2012-paper-2-offline" },
  { exam: "jee-advanced", key: "iit-jee-2011-paper-1-offline" },
  { exam: "jee-advanced", key: "iit-jee-2011-paper-2-offline" },
  { exam: "jee-advanced", key: "iit-jee-2010-paper-1-offline" },
  { exam: "jee-advanced", key: "iit-jee-2010-paper-2-offline" },
  { exam: "jee-advanced", key: "iit-jee-2009-paper-1-offline" },
  { exam: "jee-advanced", key: "iit-jee-2009-paper-2-offline" },
  { exam: "jee-advanced", key: "iit-jee-2008-paper-1-offline" },
  { exam: "jee-advanced", key: "iit-jee-2008-paper-2-offline" },
  { exam: "jee-advanced", key: "iit-jee-2007-paper-1-offline" },
  { exam: "jee-advanced", key: "iit-jee-2007-paper-2-offline" }
];

async function processPaper(item) {
  const pPath = path.join(papersDir, item.key + ".json");
  if (fs.existsSync(pPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(pPath, "utf8"));
      const isStub = (existing.sections || []).some(s => s.questions && s.questions.length > 0 && s.questions[0].options === undefined);
      if (!isStub) {
        console.log("[Skipping already complete]", item.key);
        return;
      }
    } catch(e) {}
  }

  console.log("[Fetching]", item.key);
  try {
    const paperData = await pyqService.getPaperQuestions(item.exam, item.key);
    if (!paperData) {
      console.log("[Failed to fetch outline]", item.key);
      return;
    }

    let rawSections = paperData.sections || [];
    if (rawSections.length === 0 && Array.isArray(paperData.questions)) {
      if (paperData.questions.length > 0 && paperData.questions[0].questions) {
        rawSections = paperData.questions;
      } else {
        rawSections = [{ title: "Physics", questions: paperData.questions }];
      }
    }

    const fetchedMap = new Map();
    const finalSections = [];

    for (const sec of rawSections) {
      const populated = [];
      for (const qSummary of (sec.questions || [])) {
        if (qSummary.options && qSummary.options.length > 0) {
          populated.push(qSummary);
          continue;
        }

        if (fetchedMap.has(qSummary.question_id)) {
          populated.push(fetchedMap.get(qSummary.question_id));
          continue;
        }

        try {
          const detailRes = await pyqService.getPaperSingleQuestion(item.exam, item.key, qSummary.question_id);
          const batch = detailRes?.questions || [];
          for (const bq of batch) {
            const normalized = {
              question_id: bq.question_id,
              paperTitle: bq.paperTitle || paperData.title || item.key,
              year: bq.year || paperData.year || "",
              examDate: bq.examDate || bq.year || "",
              subject: bq.subject || sec.title?.toLowerCase() || "",
              chapter: bq.chapter || "",
              chapterGroup: bq.chapterGroup || "",
              topic: bq.topic || bq.chapter || "",
              type: bq.type || (bq.question?.en?.options?.length > 0 ? "mcq" : "integer"),
              marks: bq.marks || 4,
              negMarks: bq.negMarks !== undefined ? bq.negMarks : 1,
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
                  fs.writeFileSync(qf, JSON.stringify({ questions: [normalized] }));
                }
              } catch (e) {}
            }
          }

          if (fetchedMap.has(qSummary.question_id)) {
            populated.push(fetchedMap.get(qSummary.question_id));
          } else {
            populated.push(qSummary);
          }
        } catch(e) {
          populated.push(qSummary);
        }

        await new Promise(r => setTimeout(r, 40));
      }

      finalSections.push({
        title: sec.title || "Section",
        count: populated.length,
        questions: populated
      });
    }

    const finalPaper = {
      exam: item.exam,
      paperKey: item.key,
      title: paperData.title || item.key,
      sections: finalSections
    };

    fs.writeFileSync(pPath, JSON.stringify(finalPaper, null, 2));
    console.log("[Saved]", item.key, "with", finalSections.map(s => s.title + ":" + s.questions.length).join(", "));
  } catch(e) {
    console.log("[Error]", item.key, e.message);
  }
}

async function run() {
  console.log("Processing", olderPapers.length, "older papers with 3 workers...");
  const CONCURRENCY = 3;
  let idx = 0;

  async function worker(id) {
    while (idx < olderPapers.length) {
      const current = olderPapers[idx++];
      console.log("(Worker " + id + ") [" + idx + "/" + olderPapers.length + "] " + current.key);
      await processPaper(current);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1)));
  console.log("OLDER PAPERS DOWNLOAD COMPLETE!");
}

run();
