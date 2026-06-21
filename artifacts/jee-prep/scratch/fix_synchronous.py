import os

ai_file = "/workspaces/JeeAppv9/artifacts/jee-prep/src/pages/AI.tsx"

with open(ai_file, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update updateSessions to execute synchronously
old_update_sessions = """  const updateSessions = (updater: ChatSession[] | ((prev: ChatSession[]) => ChatSession[])) => {
    setSessions(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      localStorage.setItem("jee_ai_chats", JSON.stringify(next));
      return next;
    });
  };"""

new_update_sessions = """  const updateSessions = (updater: ChatSession[] | ((prev: ChatSession[]) => ChatSession[])) => {
    const next = typeof updater === "function" ? updater(sessions) : updater;
    localStorage.setItem("jee_ai_chats", JSON.stringify(next));
    setSessions(next);
  };"""

if old_update_sessions in content:
    content = content.replace(old_update_sessions, new_update_sessions)
    print("Successfully replaced updateSessions implementation.")
else:
    print("WARNING: old_update_sessions not found in exact format!")

# 2. Update handleSend to perform a single synchronous update to sessions and localStorage
# We will target the end of handleSend
old_handle_send_end = """    let currentId = activeSessionId;
    let currentMessages = messages;

    if (!currentId) {
       currentId = Date.now().toString();
       const titleMsg = finalUserMsg || "Media Upload";
       const newSession: ChatSession = {
         id: currentId,
         title: titleMsg.slice(0, 30) + (titleMsg.length > 30 ? "..." : ""),
         updatedAt: Date.now(),
         messages: []
       };
       updateSessions(prev => [newSession, ...prev]);
       setActiveSessionId(currentId);
    }

    const newMessages: ChatMessage[] = [...currentMessages, { role: "user", content: finalUserMsg, attachments: attachmentsToSave }];
    updateSessions(prev => prev.map(s => s.id === currentId ? { ...s, messages: newMessages, updatedAt: Date.now() } : s));
    
    await fetchAIResponse(currentId, newMessages, filePayloads);"""

new_handle_send_end = """    let currentId = activeSessionId;
    let nextSessions = [...sessions];

    if (!currentId) {
       currentId = Date.now().toString();
       const titleMsg = finalUserMsg || "Media Upload";
       const newSession: ChatSession = {
         id: currentId,
         title: titleMsg.slice(0, 30) + (titleMsg.length > 30 ? "..." : ""),
         updatedAt: Date.now(),
         messages: []
       };
       nextSessions = [newSession, ...nextSessions];
    }

    const newMessages: ChatMessage[] = [...(activeSessionId ? (sessions.find(s => s.id === activeSessionId)?.messages || []) : []), { role: "user", content: finalUserMsg, attachments: attachmentsToSave }];
    const finalSessions = nextSessions.map(s => s.id === currentId ? { ...s, messages: newMessages, updatedAt: Date.now() } : s);

    updateSessions(finalSessions);

    if (!activeSessionId) {
      setActiveSessionId(currentId);
    }
    
    await fetchAIResponse(currentId, newMessages, filePayloads);"""

if old_handle_send_end in content:
    content = content.replace(old_handle_send_end, new_handle_send_end)
    print("Successfully replaced handleSend end block.")
else:
    # Let's check why if it fails
    print("WARNING: old_handle_send_end not found in exact format!")

with open(ai_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Finished running fix_synchronous.py")
