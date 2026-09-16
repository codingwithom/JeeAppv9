import os
import json
import shutil
import urllib.parse

src_root = "artifacts/jee-prep/public/data/pyq"
dest_root = "artifacts/jee-prep/data"

def run():
    print("[1/6] Setting up target directories in artifacts/jee-prep/data...")
    for d in ["catalogs", "papers", "chapters", "questions"]:
        os.makedirs(os.path.join(dest_root, d), exist_ok=True)

    # 1. Copy catalogs
    print("[2/6] Copying catalog files...")
    src_cat = os.path.join(src_root, "catalogs")
    dest_cat = os.path.join(dest_root, "catalogs")
    if os.path.exists(src_cat):
        for f in os.listdir(src_cat):
            if f.endswith(".json"):
                shutil.copy2(os.path.join(src_cat, f), os.path.join(dest_cat, f))
    print("      Catalogs copied successfully.")

    # 2. Collect all unique questions
    print("[3/6] Collecting and deduplicating all questions...")
    all_questions = {}
    perm_to_qKey = {}
    id_to_qKey = {}

    # A. From existing questions/
    src_questions = os.path.join(src_root, "questions")
    if os.path.exists(src_questions):
        for f in os.listdir(src_questions):
            if not f.endswith(".json"): continue
            perm = f[:-5] # remove .json
            try:
                with open(os.path.join(src_questions, f), "r", encoding="utf-8") as fp:
                    data = json.load(fp)
                    q = data.get("questions", [{}])[0] if "questions" in data else data
                    if q:
                        qKey = perm
                        q["qKey"] = qKey
                        q["permalink"] = q.get("permalink") or perm
                        all_questions[qKey] = q
                        perm_to_qKey[perm] = qKey
                        if q.get("permalink"):
                            perm_to_qKey[q["permalink"]] = qKey
                        if q.get("question_id"):
                            id_to_qKey[q["question_id"]] = qKey
            except Exception as e:
                pass

    print(f"      Loaded {len(all_questions)} questions from existing questions/ folder.")

    # B. From papers/
    src_papers = os.path.join(src_root, "papers")
    papers_list = [f for f in os.listdir(src_papers) if f.endswith(".json")] if os.path.exists(src_papers) else []

    for pf in papers_list:
        p_path = os.path.join(src_papers, pf)
        try:
            with open(p_path, "r", encoding="utf-8") as fp:
                p_data = json.load(fp)
                p_key = p_data.get("paperKey") or pf.replace(".json", "")
                p_title = p_data.get("title") or p_key
                exam = p_data.get("exam") or ("jee-advanced" if "jee-advanced" in pf else "jee-main")
                year = p_data.get("year")

                for sec in p_data.get("sections", []):
                    sec_title = sec.get("title", "")
                    sec_subj = "chemistry" if "chem" in sec_title.lower() else ("mathematics" if "math" in sec_title.lower() else "physics")
                    
                    for q in sec.get("questions", []):
                        perm = q.get("permalink")
                        qid = q.get("question_id")

                        # Determine if this question is already known
                        existing_qKey = None
                        if perm and perm in perm_to_qKey:
                            existing_qKey = perm_to_qKey[perm]
                        elif qid and qid in id_to_qKey:
                            existing_qKey = id_to_qKey[qid]

                        if existing_qKey:
                            target_q = all_questions[existing_qKey]
                            # Merge missing fields
                            for k in ["content", "options", "correct_options", "explanation", "marks", "negMarks", "type", "chapter", "chapterGroup", "topic"]:
                                if not target_q.get(k) and q.get(k):
                                    target_q[k] = q[k]
                            if not target_q.get("paperKey"): target_q["paperKey"] = p_key
                            if not target_q.get("paperTitle"): target_q["paperTitle"] = p_title
                            if not target_q.get("year"): target_q["year"] = year or q.get("year")
                            if not target_q.get("exam"): target_q["exam"] = exam
                            if not target_q.get("subject"): target_q["subject"] = q.get("subject") or sec_subj
                            if qid and not target_q.get("question_id"): target_q["question_id"] = qid
                            if qid: id_to_qKey[qid] = existing_qKey
                        else:
                            # New unique question
                            new_qKey = perm if perm else qid
                            if not new_qKey: continue

                            q["qKey"] = new_qKey
                            q["paperKey"] = p_key
                            q["paperTitle"] = q.get("paperTitle") or p_title
                            q["exam"] = q.get("exam") or exam
                            q["year"] = q.get("year") or year
                            q["subject"] = q.get("subject") or sec_subj
                            
                            all_questions[new_qKey] = q
                            if perm: perm_to_qKey[perm] = new_qKey
                            if qid: id_to_qKey[qid] = new_qKey
        except Exception as e:
            print(f"Error processing paper {pf}: {e}")

    print(f"      Total unique questions consolidated: {len(all_questions)}")

    # 3. Write individual questions (EXACTLY 1 FILE PER QUESTION)
    print("[4/6] Writing 1 unified JSON file per question into data/questions/...")
    dest_questions = os.path.join(dest_root, "questions")
    
    for qKey, q in all_questions.items():
        # Ensure clean single question format
        # Strip self-referential questions array if any, then add standard wrapper
        clean_q = {k: v for k, v in q.items() if k != "questions"}
        clean_q["qKey"] = qKey
        
        # We also embed "questions": [clean_q] so legacy callers accessing .questions[0] work seamlessly
        payload = dict(clean_q)
        payload["questions"] = [clean_q]

        safe_filename = urllib.parse.quote(qKey, safe="") + ".json"
        out_file = os.path.join(dest_questions, safe_filename)
        with open(out_file, "w", encoding="utf-8") as fp:
            json.dump(payload, fp, separators=(',', ':'))

    print(f"      Wrote {len(all_questions)} individual question files.")

    # 4. Write lightweight papers (without duplicate question contents)
    print("[5/6] Writing lightweight paper outline files into data/papers/...")
    dest_papers = os.path.join(dest_root, "papers")
    search_index_items = []
    seen_search_ids = set()

    for pf in papers_list:
        p_path = os.path.join(src_papers, pf)
        try:
            with open(p_path, "r", encoding="utf-8") as fp:
                p_data = json.load(fp)
                p_key = p_data.get("paperKey") or pf.replace(".json", "")
                p_title = p_data.get("title") or p_key
                exam = p_data.get("exam") or ("jee-advanced" if "jee-advanced" in pf else "jee-main")
                year = p_data.get("year")

                light_sections = []
                for sec in p_data.get("sections", []):
                    sec_title = sec.get("title", "")
                    sec_subj = "chemistry" if "chem" in sec_title.lower() else ("mathematics" if "math" in sec_title.lower() else "physics")
                    light_qs = []

                    for idx, q in enumerate(sec.get("questions", [])):
                        perm = q.get("permalink")
                        qid = q.get("question_id") or f"q_{idx}"
                        
                        qKey = None
                        if perm and perm in perm_to_qKey:
                            qKey = perm_to_qKey[perm]
                        elif qid in id_to_qKey:
                            qKey = id_to_qKey[qid]
                        else:
                            qKey = perm or qid

                        category = "numerical" if q.get("type") == "integer" else ("multiple_mcq" if q.get("type") == "mcqm" else "mcq")
                        
                        light_q = {
                            "qKey": qKey,
                            "question_id": qid,
                            "permalink": perm or "",
                            "questionNo": idx + 1,
                            "type": q.get("type") or ("integer" if category == "numerical" else "mcq"),
                            "marks": q.get("marks", 4),
                            "negMarks": q.get("negMarks", 1),
                            "subject": (q.get("subject") or sec_subj).lower(),
                            "chapter": q.get("chapter", ""),
                            "paperTitle": q.get("paperTitle") or p_title
                        }
                        light_qs.append(light_q)

                        # Add to search index
                        unique_search_id = f"paper_{p_key}_{qid}"
                        if unique_search_id not in seen_search_ids:
                            seen_search_ids.add(unique_search_id)
                            # Get snippet from unified questions
                            full_q = all_questions.get(qKey, q)
                            raw_content = full_q.get("content") or full_q.get("question", {}).get("en", {}).get("content", "")
                            # strip html
                            import re
                            text_snippet = re.sub(r'<[^>]+>', ' ', raw_content)
                            text_snippet = re.sub(r'\s+', ' ', text_snippet).strip()[:320]

                            search_index_items.append({
                                "id": unique_search_id,
                                "qKey": qKey,
                                "paperKey": p_key,
                                "questionId": qid,
                                "permalink": perm or "",
                                "exam": exam,
                                "subject": (q.get("subject") or sec_subj).lower(),
                                "chapter": q.get("chapter", ""),
                                "paperTitle": p_title,
                                "category": category,
                                "text": text_snippet
                            })

                light_paper = {
                    "exam": exam,
                    "paperKey": p_key,
                    "title": p_title,
                    "year": year,
                    "sections": [
                        {
                            "title": s.get("title"),
                            "count": len(s.get("questions", [])),
                            "questions": lqs
                        }
                        for s, lqs in zip(p_data.get("sections", []), [sec_lqs for sec_lqs in [s.get("questions", []) for s in [sec]] if True] if False else [lq for lq in [s_qs for s_qs in [sec.get("questions") for sec in p_data.get("sections", [])]] if False] or [s["questions"] for s in light_sections] if False else [])
                    ]
                }
                # Fix sections construction
                light_paper["sections"] = [
                    {
                        "title": sec.get("title"),
                        "count": len(sec_qs),
                        "questions": sec_qs
                    }
                    for sec, sec_qs in zip(p_data.get("sections", []), [s["questions"] for s in [{"questions": sec_qs} for sec_qs in [s for s in [sec.get("questions", []) for sec in p_data.get("sections", [])]]]])
                ] if False else []
        except Exception as e:
            print(f"Error processing paper {pf}: {e}")

    # Re-do clean loop for papers
    for pf in papers_list:
        p_path = os.path.join(src_papers, pf)
        try:
            with open(p_path, "r", encoding="utf-8") as fp:
                p_data = json.load(fp)
                p_key = p_data.get("paperKey") or pf.replace(".json", "")
                p_title = p_data.get("title") or p_key
                exam = p_data.get("exam") or ("jee-advanced" if "jee-advanced" in pf else "jee-main")
                year = p_data.get("year")

                new_sections = []
                for sec in p_data.get("sections", []):
                    sec_title = sec.get("title", "")
                    sec_subj = "chemistry" if "chem" in sec_title.lower() else ("mathematics" if "math" in sec_title.lower() else "physics")
                    sec_qs = []
                    for idx, q in enumerate(sec.get("questions", [])):
                        perm = q.get("permalink")
                        qid = q.get("question_id") or f"q_{idx}"
                        
                        qKey = perm_to_qKey.get(perm) if perm else (id_to_qKey.get(qid) if qid else None)
                        if not qKey: qKey = perm or qid

                        sec_qs.append({
                            "qKey": qKey,
                            "question_id": qid,
                            "permalink": perm or "",
                            "questionNo": idx + 1,
                            "type": q.get("type") or "mcq",
                            "marks": q.get("marks", 4),
                            "negMarks": q.get("negMarks", 1),
                            "subject": (q.get("subject") or sec_subj).lower(),
                            "chapter": q.get("chapter", ""),
                            "paperTitle": q.get("paperTitle") or p_title
                        })
                    new_sections.append({
                        "title": sec_title,
                        "count": len(sec_qs),
                        "questions": sec_qs
                    })

                out_paper = {
                    "exam": exam,
                    "paperKey": p_key,
                    "title": p_title,
                    "year": year,
                    "sections": new_sections
                }
                with open(os.path.join(dest_papers, pf), "w", encoding="utf-8") as out_fp:
                    json.dump(out_paper, out_fp, separators=(',', ':'))
        except Exception as e:
            print(f"Error writing paper {pf}: {e}")

    print(f"      Wrote {len(papers_list)} lightweight paper files.")

    # 5. Write lightweight chapters
    print("[6/6] Writing lightweight chapter outline files into data/chapters/...")
    src_chapters = os.path.join(src_root, "chapters")
    dest_chapters = os.path.join(dest_root, "chapters")
    chap_files = [f for f in os.listdir(src_chapters) if f.endswith(".json")] if os.path.exists(src_chapters) else []

    for cf in chap_files:
        c_path = os.path.join(src_chapters, cf)
        try:
            with open(c_path, "r", encoding="utf-8") as fp:
                c_data = json.load(fp)
                new_groups = []
                for g in c_data.get("questions", []):
                    new_g_qs = []
                    for q in g.get("questions", []):
                        perm = q.get("permalink")
                        qKey = perm_to_qKey.get(perm) or perm
                        new_g_qs.append({
                            "qKey": qKey,
                            "permalink": perm or "",
                            "paperTitle": q.get("paperTitle", ""),
                            "examGroup": q.get("examGroup", "jee")
                        })
                    new_groups.append({
                        "title": g.get("title", ""),
                        "key": g.get("key", ""),
                        "questions": new_g_qs
                    })

                out_chap = {
                    "exam": c_data.get("exam"),
                    "subject": c_data.get("subject"),
                    "chapterKey": c_data.get("chapterKey"),
                    "title": c_data.get("title"),
                    "questions": new_groups
                }
                with open(os.path.join(dest_chapters, cf), "w", encoding="utf-8") as out_fp:
                    json.dump(out_chap, out_fp, separators=(',', ':'))
        except Exception as e:
            print(f"Error writing chapter {cf}: {e}")

    print(f"      Wrote {len(chap_files)} lightweight chapter files.")

    # 6. Write search_index.json
    print("Writing search_index.json...")
    with open(os.path.join(dest_root, "search_index.json"), "w", encoding="utf-8") as fp:
        json.dump(search_index_items, fp, separators=(',', ':'))
    print(f"      Generated search_index.json with {len(search_index_items)} items.")

    print("\n Clean dataset generation complete in artifacts/jee-prep/data!")

if __name__ == "__main__":
    run()
