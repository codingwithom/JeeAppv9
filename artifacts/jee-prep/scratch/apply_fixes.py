import os

ai_file = "/workspaces/JeeAppv9/artifacts/jee-prep/src/pages/AI.tsx"

with open(ai_file, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Define updateSessions right after sessions state definition
sessions_hook = """  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try { return JSON.parse(localStorage.getItem("jee_ai_chats") || "[]"); }
    catch { return []; }
  });"""

update_sessions_definition = """  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try { return JSON.parse(localStorage.getItem("jee_ai_chats") || "[]"); }
    catch { return []; }
  });

  const updateSessions = (updater: ChatSession[] | ((prev: ChatSession[]) => ChatSession[])) => {
    setSessions(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      localStorage.setItem("jee_ai_chats", JSON.stringify(next));
      return next;
    });
  };"""

if sessions_hook in content:
    content = content.replace(sessions_hook, update_sessions_definition)
    print("Injected updateSessions definition.")
else:
    print("WARNING: sessions hook not found!")

# 2. Replace setSessions calls with updateSessions
replacements = [
    (
        'setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [], updatedAt: Date.now() } : s));',
        'updateSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [], updatedAt: Date.now() } : s));'
    ),
    (
        'setSessions(prev => [newSession, ...prev]);',
        'updateSessions(prev => [newSession, ...prev]);'
    ),
    (
        'setSessions(prev => prev.map(s => s.id === currentId ? { ...s, messages: newMessages, updatedAt: Date.now() } : s));',
        'updateSessions(prev => prev.map(s => s.id === currentId ? { ...s, messages: newMessages, updatedAt: Date.now() } : s));'
    ),
    (
        'setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: msgs, updatedAt: Date.now() } : s));',
        'updateSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: msgs, updatedAt: Date.now() } : s));'
    ),
    (
        'setSessions(prev => prev.map(s => s.id === activeSessionId ? {\n      ...s,\n      messages: truncatedMessages,\n      updatedAt: Date.now()\n    } : s));',
        'updateSessions(prev => prev.map(s => s.id === activeSessionId ? {\n      ...s,\n      messages: truncatedMessages,\n      updatedAt: Date.now()\n    } : s));'
    ),
    (
        'if(editTitle.trim()) setSessions(prev => prev.map(x => x.id === s.id ? {...x, title: editTitle.trim()} : x));',
        'if(editTitle.trim()) updateSessions(prev => prev.map(x => x.id === s.id ? {...x, title: editTitle.trim()} : x));'
    ),
    (
        'if (editTitle.trim()) setSessions(prev => prev.map(x => x.id === s.id ? { ...x, title: editTitle.trim() } : x));',
        'if (editTitle.trim()) updateSessions(prev => prev.map(x => x.id === s.id ? { ...x, title: editTitle.trim() } : x));'
    ),
    (
        'setSessions(prev => prev.filter(x => x.id !== s.id));',
        'updateSessions(prev => prev.filter(x => x.id !== s.id));'
    ),
    (
        'setSessions(prev => prev.map(s => {\n        if (s.id !== sessionId) return s;\n        const newMessages = [...s.messages];',
        'updateSessions(prev => prev.map(s => {\n        if (s.id !== sessionId) return s;\n        const newMessages = [...s.messages];'
    ),
    (
        'setSessions(prev => prev.map(s => s.id === activeSessionId ? {\n      ...s,\n      messages: s.messages.map((msg, i) => i === msgIndex ? { ...msg, isTyping: false } : msg)\n    } : s));',
        'updateSessions(prev => prev.map(s => s.id === activeSessionId ? {\n      ...s,\n      messages: s.messages.map((msg, i) => i === msgIndex ? { ...msg, isTyping: false } : msg)\n    } : s));'
    )
]

for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        print(f"Replaced setSessions usage.")
    else:
        print(f"Note: target not found (might not exist or spacing differs): {repr(old[:50])}...")

# 3. UI related fixes: reduce chat input box sizes (make it sleeker and more compact)
# Let's inspect the original UI definitions and replace them:
# Original buttons are h-11 w-11 (44px). Let's make them h-9.5 w-9.5 (38px) or h-9 w-9 (36px).
# Textarea min-h-[44px] -> min-h-[38px]
# Plus button icon h-6 w-6 -> h-5 w-5
# Padding inside outer container p-2 -> p-1.5
# Textarea padding py-3 px-4 -> py-2 px-3

ui_replacements = [
    (
        'className="flex flex-col bg-muted/70 border border-border shadow-lg rounded-[28px] overflow-hidden focus-within:bg-muted/90 focus-within:shadow-xl transition-all p-2 backdrop-blur-md"',
        'className="flex flex-col bg-muted/70 border border-border shadow-lg rounded-[24px] overflow-hidden focus-within:bg-muted/90 focus-within:shadow-xl transition-all p-1.5 backdrop-blur-md"'
    ),
    (
        'className="h-11 w-11 shrink-0 rounded-full flex items-center justify-center transition-all mx-1 mb-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"',
        'className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition-all mx-0.5 mb-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"'
    ),
    (
        '<Plus className="h-6 w-6" />',
        '<Plus className="h-5 w-5" />'
    ),
    (
        'className="flex-1 bg-transparent border-none resize-none max-h-48 min-h-[44px] py-3 px-4 text-base focus:outline-none placeholder:text-muted-foreground/60 text-foreground"',
        'className="flex-1 bg-transparent border-none resize-none max-h-48 min-h-[36px] py-1.5 px-3 text-sm focus:outline-none placeholder:text-muted-foreground/60 text-foreground"'
    ),
    (
        'className="h-11 w-11 shrink-0 rounded-full flex items-center justify-center transition-all mx-1 mb-0.5 bg-red-500 text-white shadow-md hover:scale-105"',
        'className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition-all mx-0.5 mb-0.5 bg-red-500 text-white shadow-md hover:scale-105"'
    ),
    (
        'className={cn("h-11 w-11 shrink-0 rounded-full flex items-center justify-center transition-all mx-1 mb-0.5", (input.trim() || attachedFiles.length > 0) ? "bg-foreground text-background shadow-md hover:scale-105" : "bg-muted-foreground/20 text-muted-foreground cursor-not-allowed")}',
        'className={cn("h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition-all mx-0.5 mb-0.5", (input.trim() || attachedFiles.length > 0) ? "bg-foreground text-background shadow-md hover:scale-105" : "bg-muted-foreground/20 text-muted-foreground cursor-not-allowed")}'
    ),
    # Also adjust the scroll limit calculation in textarea height auto-resize effect
    (
        'textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";',
        'textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";'
    )
]

for old, new in ui_replacements:
    if old in content:
        content = content.replace(old, new)
        print("Updated UI styling definition.")
    else:
        print(f"Note: UI styling target not found: {repr(old[:50])}...")

with open(ai_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Finished applying all fixes to AI.tsx")
