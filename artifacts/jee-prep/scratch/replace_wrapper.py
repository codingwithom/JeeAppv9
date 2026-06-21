import os

ai_file = "/workspaces/JeeAppv9/artifacts/jee-prep/src/pages/AI.tsx"

with open(ai_file, 'r', encoding='utf-8') as f:
    content = f.read()

start_sig = "  const fetchAIResponse = async (sessionId: string, messagesToSent: ChatMessage[], filePayloads?: any[]) => {"
end_sig = "  const handleSend = async () => {"

start_idx = content.find(start_sig)
end_idx = content.find(end_sig)

if start_idx != -1 and end_idx != -1 and start_idx < end_idx:
    wrapper_code = """  const fetchAIResponse = async (sessionId: string, messagesToSent: ChatMessage[], filePayloads?: any[]) => {
    aiChatBackgroundManager.generateResponse({
      sessionId,
      messagesToSent,
      filePayloads,
      selectedGoal
    });
  };

"""
    new_content = content[:start_idx] + wrapper_code + content[end_idx:]
    with open(ai_file, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully replaced fetchAIResponse with delegation wrapper.")
else:
    print(f"Failed to find indices: start_idx={start_idx}, end_idx={end_idx}")
