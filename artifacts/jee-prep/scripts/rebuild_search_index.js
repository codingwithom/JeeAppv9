import fs from "fs";
import path from "path";

const papersDir = "public/data/pyq/papers";
const outIndex = "public/data/pyq/search_index.json";

function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\\s+/g, " ").trim();
}

function run() {
  console.log("Rebuilding search_index.json from papers...");
  const files = fs.readdirSync(papersDir).filter(f => f.endsWith(".json"));
  const allItems = [];
  const seenIds = new Set();

  for (const f of files) {
    const p = JSON.parse(fs.readFileSync(path.join(papersDir, f), "utf8"));
    const exam = p.exam || (f.startsWith("jee-advanced") ? "jee-advanced" : "jee-main");
    const paperKey = p.paperKey || f.replace(".json", "");

    for (const s of (p.sections || [])) {
      const secSubject = (s.title || "").toLowerCase().includes("chem") ? "chemistry" :
                         (s.title || "").toLowerCase().includes("math") ? "mathematics" : "physics";

      for (let idx = 0; idx < (s.questions || []).length; idx++) {
        const q = s.questions[idx];
        const qId = q.question_id || ("q_" + idx);
        const uniqueKey = paperKey + "_" + qId;
        if (seenIds.has(uniqueKey)) continue;
        seenIds.add(uniqueKey);

        const category = q.type === "integer" ? "numerical" : q.type === "mcqm" ? "multiple_mcq" : "mcq";
        const textSnippet = stripHtml(q.content || q.question?.en?.content || "").slice(0, 320);

        allItems.push({
          id: "paper_" + paperKey + "_" + qId,
          paperKey: paperKey,
          questionId: qId,
          permalink: q.permalink || "",
          exam: exam,
          subject: (q.subject || secSubject).toLowerCase(),
          chapter: q.chapter || "",
          paperTitle: q.paperTitle || p.title || paperKey,
          category: category,
          text: textSnippet
        });
      }
    }
  }

  fs.writeFileSync(outIndex, JSON.stringify(allItems));
  console.log("Generated " + allItems.length + " questions in search_index.json (" + (fs.statSync(outIndex).size / (1024*1024)).toFixed(2) + " MB)");
}

run();
