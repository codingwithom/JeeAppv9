# Question Extraction Rules

## CRITICAL EXTRACTION RULES (HIGHEST PRIORITY)

The primary objective is LOSSLESS QUESTION EXTRACTION.

The AI is STRICTLY FORBIDDEN from:
* Rewriting questions
* Simplifying questions
* Summarizing questions
* Rephrasing questions
* Correcting grammar
* Correcting spelling
* Converting equations into plain text
* Removing symbols
* Removing units
* Removing diagrams
* Removing tables
* Removing options
* Changing question numbering
* Changing answer option ordering

The extracted question must be CHARACTER-BY-CHARACTER identical to the source whenever possible.

---

## QUESTION EXTRACTION MODE

When reading a source document:
1. **Locate** the complete question boundaries.
2. **Extract** the FULL question text.
3. **Extract** ALL equations.
4. **Extract** ALL diagrams.
5. **Extract** ALL tables.
6. **Extract** ALL answer options.
7. **Extract** question metadata.

Only after all components are extracted may the question be added to the quiz.
If any part of the question is missing, extraction is considered FAILED.

---

## LATEX PRESERVATION MODE

All mathematical content MUST be converted into valid LaTeX.

### Examples:
* **Source**: `nq²`
  * **Output**: `nq^2`
* **Source**: `εkBT`
  * **Output**: `\varepsilon k_B T`
* **Source**: `(q²)/(εkBT)`
  * **Output**: `\frac{q^2}{\varepsilon k_B T}`
* **Source**: `∫f(x)dx`
  * **Output**: `\int f(x)\,dx`
* **Source**: `lim x→0`
  * **Output**: `\lim_{x \to 0}`
* **Source**: `α β γ θ λ μ`
  * **Output**: `\alpha \beta \gamma \theta \lambda \mu`

Every equation must render correctly in MathJax or KaTeX.
No equation may be stored as plain text.

---

## DIAGRAM EXTRACTION MODE

For every question, detect:
* Figures
* Graphs
* Geometrical diagrams
* Physics diagrams
* Chemistry structures
* Circuit diagrams
* Flowcharts
* Biological diagrams

If present:
1. **Crop** only the exact diagram region.
2. **Store** diagram separately.
3. **Associate** diagram with question ID.

### Render order:
1. Question Text
2. [Diagram]
3. Question Options (if any)
4. Answer Options

---

## QUESTION COMPLETENESS CHECK

Before finalizing a question, verify:
* [ ] Question text exists
* [ ] All equations extracted
* [ ] All diagrams extracted
* [ ] All tables extracted
* [ ] All options extracted
* [ ] Question number extracted
* [ ] No truncation occurred

If any check fails, re-run extraction until all content is recovered.

---

## NO TRUNCATION RULE

The AI must NEVER stop extraction because:
* Question is long
* Paragraph is large
* Equation is complex
* Diagram exists
* OCR confidence is low

Continue processing until the COMPLETE question has been recovered.

---

## OUTPUT STRUCTURE

Each extracted question must be stored as:

```json
{
  "question_id": "",
  "question_number": "",
  "question_text_exact": "",
  "latex_content": "",
  "diagram_image": "",
  "question_options": "",
  "answer_options": "",
  "correct_answer": "",
  "explanation": "",
  "difficulty": ""
}
```

---

## RENDERING RULE

Final quiz must render exactly as:
1. Question Number
2. Question Text (100% exact)
3. LaTeX Equations (Rendered)
4. Diagram (if present)
5. Question Options (if present)
6. Answer Options (A/B/C/D)

No text modifications allowed. Lossless extraction is more important than speed.
