import os
import re
import json
import urllib.parse
import subprocess

dest_root = "artifacts/jee-prep/data"
dest_questions = os.path.join(dest_root, "questions")
os.makedirs(dest_questions, exist_ok=True)

def clean_text(html_str):
    if not html_str: return ""
    txt = re.sub(r'<[^>]+>', ' ', html_str)
    txt = re.sub(r'\s+', ' ', txt).strip()
    return txt

def extract_year(title_or_str):
    if not title_or_str: return None
    m = re.search(r'(20\d\d)', str(title_or_str))
    return int(m.group(1)) if m else None

def main():
    print("[1/5] Loading existing questions from data/questions/...")
    all_questions = {}
    for fn in os.listdir(dest_questions):
        if not fn.endswith(".json"): continue
        qKey = fn[:-5]
        # unquote qKey if quoted
        unquoted = urllib.parse.unquote(qKey)
        try:
            with open(os.path.join(dest_questions, fn), "r", encoding="utf-8") as fp:
                data = json.load(fp)
                q = data.get("questions", [{}])[0] if "questions" in data else data
                all_questions[unquoted] = q
                all_questions[qKey] = q
        except Exception:
            pass

    print(f"      Loaded {len(all_questions)} question records from existing files.")

    print("[2/5] Scanning pyq_cache (single_q and pq) from commit 3a36327 for full options/explanations...")
    cache_meta = {}
    try:
        all_tree = subprocess.check_output([
            "git", "ls-tree", "-r", "--name-only", "3a36327", "artifacts/jee-prep/data/pyq_cache"
        ]).decode("utf-8").splitlines()
        
        pq_files = [f for f in all_tree if "/pq_" in f or "/single_q_" in f]
        print(f"      Found {len(pq_files)} pq/single_q cache files to inspect.")
        
        # Batch inspection or process in chunks
        for idx, f in enumerate(pq_files):
            try:
                out = subprocess.check_output(["git", "show", f"3a36327:{f}"]).decode("utf-8")
                d = json.loads(out)
                for q in d.get("questions", []):
                    perm = q.get("permalink")
                    qid = q.get("question_id")
                    en = q.get("question", {}).get("en", {})
                    opts = en.get("options") or q.get("options") or []
                    corrs = en.get("correct_options") or en.get("correctOptions") or q.get("correct_options") or []
                    expl = en.get("explanation") or q.get("explanation") or ""
                    cont = en.get("content") or q.get("content") or ""
                    
                    entry = {
                        "content": cont,
                        "options": opts,
                        "correct_options": corrs,
                        "explanation": expl,
                        "type": q.get("type"),
                        "marks": q.get("marks", 4),
                        "negMarks": q.get("negMarks", 1),
                        "paperTitle": q.get("paperTitle")
                    }
                    if perm: cache_meta[perm] = entry
                    if qid: cache_meta[qid] = entry
            except Exception:
                pass
            if (idx + 1) % 500 == 0:
                print(f"        Processed {idx + 1}/{len(pq_files)} cache files, indexed {len(cache_meta)} questions...")
    except Exception as e:
        print(f"      Error scanning pyq_cache: {e}")

    print(f"      Finished pyq_cache scan. Indexed {len(cache_meta)} questions.")

    print("[3/5] Extracting chapter questions from commit 3a36327...")
    chap_files = subprocess.check_output([
        "git", "ls-tree", "-r", "--name-only", "3a36327", "artifacts/jee-prep/public/data/pyq/chapters"
    ]).decode("utf-8").splitlines()
    print(f"      Found {len(chap_files)} chapter files.")

    new_written = 0
    updated_written = 0

    for idx, cf in enumerate(chap_files):
        try:
            chap_slug = cf.split("/")[-1].replace(".json", "")
            out = subprocess.check_output(["git", "show", f"3a36327:{cf}"]).decode("utf-8")
            d = json.loads(out)
            exam = d.get("exam", "jee-main")
            subject = d.get("subject", "physics")

            for g in d.get("questions", []):
                g_key = g.get("key", "mcq")
                g_title = g.get("title", "")
                cat_type = "integer" if (g_key == "integer" or "numerical" in g_title.lower()) else ("mcqm" if (g_key == "mcqm" or "more than one" in g_title.lower()) else "mcq")

                for q in g.get("questions", []):
                    perm = q.get("permalink")
                    if not perm: continue
                    p_title = q.get("paperTitle", "")
                    year = extract_year(p_title)
                    chap_name = chap_slug.replace("jee-main_", "").replace("jee-advanced_", "")

                    # Check if already in all_questions
                    target_q = all_questions.get(perm)
                    en = q.get("question", {}).get("en", {})
                    content = en.get("content") or (target_q.get("content") if target_q else "")

                    cached = cache_meta.get(perm, {})
                    if not content and cached.get("content"):
                        content = cached["content"]

                    options = (target_q.get("options") if target_q else None) or cached.get("options") or en.get("options") or []
                    correct = (target_q.get("correct_options") if target_q else None) or cached.get("correct_options") or en.get("correct_options") or []
                    explanation = (target_q.get("explanation") if target_q else None) or cached.get("explanation") or en.get("explanation") or ""
                    q_type = (target_q.get("type") if target_q else None) or cached.get("type") or cat_type

                    safe_fn = urllib.parse.quote(perm, safe="") + ".json"
                    out_path = os.path.join(dest_questions, safe_fn)

                    is_new = not os.path.exists(out_path)

                    clean_obj = {
                        "question_id": perm,
                        "qKey": perm,
                        "permalink": perm,
                        "paperTitle": p_title or (target_q.get("paperTitle") if target_q else "") or "JEE Question",
                        "year": year or (target_q.get("year") if target_q else None),
                        "subject": subject,
                        "chapter": chap_name,
                        "type": q_type,
                        "marks": 4,
                        "negMarks": 1 if q_type == "mcq" else (2 if q_type == "mcqm" else 0),
                        "content": content,
                        "options": options,
                        "correct_options": correct,
                        "explanation": explanation,
                        "exam": exam
                    }
                    clean_obj["questions"] = [{**clean_obj}]

                    # Only write if new or if existing had empty content
                    if is_new or not (target_q and target_q.get("content")):
                        with open(out_path, "w", encoding="utf-8") as out_fp:
                            json.dump(clean_obj, out_fp, separators=(',', ':'))
                        if is_new: new_written += 1
                        else: updated_written += 1
                        all_questions[perm] = clean_obj
        except Exception as e:
            print(f"Error in {cf}: {e}")

    print(f"      Wrote {new_written} new questions, updated {updated_written} questions.")

    print("[4/5] Re-building search_index.json with explicit 'year' field...")
    search_file = os.path.join(dest_root, "search_index.json")
    with open(search_file, "r", encoding="utf-8") as fp:
        search_data = json.load(fp)

    for item in search_data:
        if not item.get("year"):
            item["year"] = extract_year(item.get("paperTitle", "")) or 2024

    with open(search_file, "w", encoding="utf-8") as fp:
        json.dump(search_data, fp, separators=(',', ':'))

    print(f"      search_index.json updated with {len(search_data)} items containing 'year'.")

    print("[5/5] Verifying question pif-ytan--1leftfrac3-cos-x-4-sin-x4-cos-x3-jee-main-mathematics-trigonometric-functions-and-equations-6cdl4zxdoi9fgarr...")
    test_key = "pif-ytan--1leftfrac3-cos-x-4-sin-x4-cos-x3-jee-main-mathematics-trigonometric-functions-and-equations-6cdl4zxdoi9fgarr"
    test_fn = urllib.parse.quote(test_key, safe="") + ".json"
    test_path = os.path.join(dest_questions, test_fn)
    if os.path.exists(test_path):
        with open(test_path) as fp:
            d = json.load(fp)
            print(f"      SUCCESS! Test question exists, content length = {len(d.get('content', ''))}")
    else:
        print("      FAILED: Test question still missing!")

if __name__ == "__main__":
    main()
