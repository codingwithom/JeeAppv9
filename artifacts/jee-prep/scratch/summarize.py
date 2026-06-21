import os
import re

src_dir = "/workspaces/JeeAppv9/artifacts/jee-prep/src"
pages_dir = os.path.join(src_dir, "pages")
components_dir = os.path.join(src_dir, "components")
output_file = "/workspaces/JeeAppv9/artifacts/jee-prep/scratch/summary_output.txt"

def analyze_file(filepath, out_f):
    out_f.write(f"=== File: {filepath} ===\n")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract imports
    imports = re.findall(r'^import\s+.*?\s+from\s+[\'"].*?[\'"];?', content, re.MULTILINE)
    out_f.write(f"Total imports: {len(imports)}\n")
    
    # Extract state variables
    states = re.findall(r'const\s+\[\s*(\w+)\s*,\s*set\w+\s*\]\s*=\s*useState(?:<.*?>)?\((.*?)\)', content)
    out_f.write("useState hooks found:\n")
    for s, init in states:
        out_f.write(f"  - {s} (init: {init.strip()})\n")
        
    # Extract useEffect dependencies
    effects = re.findall(r'useEffect\(\s*(?:async\s*)?\(\s*\)\s*=>\s*\{([\s\S]*?)\},\s*\[(.*?)\]\s*\)', content)
    out_f.write(f"useEffect hooks found: {len(effects)}\n")
    for i, (body, deps) in enumerate(effects):
        body_lines = [l.strip() for l in body.strip().split('\n') if l.strip()]
        first_line = body_lines[0] if body_lines else ""
        out_f.write(f"  - Effect #{i+1} deps: [{deps.strip()}], starts with: '{first_line}'\n")
        
    # Extract custom contexts consumed
    contexts = re.findall(r'const\s+.*?=\s*useContext\((\w+)\)', content)
    out_f.write(f"useContext hooks found: {contexts}\n")
    
    # Extract function declarations (const name = ... or function name(...))
    functions = re.findall(r'const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>', content)
    functions_decl = re.findall(r'function\s+(\w+)\s*\(', content)
    all_funcs = list(set(functions + functions_decl))
    out_f.write(f"Functions defined: {len(all_funcs)}\n")
    for f in sorted(all_funcs):
        out_f.write(f"  - {f}\n")

    # Look for fetch or API calls
    api_calls = re.findall(r'fetch\([\'"`](.*?)[\'"`]', content)
    out_f.write(f"Fetch calls made to: {list(set(api_calls))}\n")
    out_f.write("\n" + "="*50 + "\n\n")

# Analyze main files
target_files = [
    os.path.join(src_dir, "App.tsx"),
    os.path.join(pages_dir, "AI.tsx"),
    os.path.join(pages_dir, "AdminPage.tsx"),
    os.path.join(pages_dir, "CalendarPage.tsx"),
    os.path.join(pages_dir, "HomePage.tsx"),
    os.path.join(pages_dir, "LoginPage.tsx"),
    os.path.join(pages_dir, "MovieHub.tsx"),
    os.path.join(pages_dir, "MusicPage.tsx"),
    os.path.join(pages_dir, "PDFPage.tsx"),
    os.path.join(pages_dir, "QuizPage.tsx"),
    os.path.join(pages_dir, "SavesPage.tsx"),
    os.path.join(pages_dir, "VideoPage.tsx"),
    os.path.join(components_dir, "AICustomWidgets.tsx"),
    os.path.join(components_dir, "AmbientMixer.tsx"),
    os.path.join(components_dir, "TodoSystem.tsx"),
    os.path.join(components_dir, "StreakCard.tsx"),
    os.path.join(components_dir, "GoalSelection.tsx"),
    os.path.join(components_dir, "TimeManagementWidget.tsx"),
]

with open(output_file, 'w', encoding='utf-8') as out_f:
    for tf in target_files:
        if os.path.exists(tf):
            analyze_file(tf, out_f)
        else:
            out_f.write(f"File not found: {tf}\n\n==================================================\n\n")
print("Done writing to summary_output.txt")
