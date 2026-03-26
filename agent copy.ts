import { query } from "@anthropic-ai/claude-agent-sdk";

const prompt = "optimize the prompt in generete-rule method in genai.ts for llrm output consistrncy";
if (!prompt) {
  console.error("Error: INPUT_PROMPT environment variable is required.");
  process.exit(1);
}

for await (const message of query({
  prompt,
  options: {
    allowedTools: ["Read", "Edit", "Glob"], // Tools Claude can use
    permissionMode: "acceptEdits" // Auto-approve file edits
  }
})) {
  // Print human-readable output
  if (message.type === "assistant" && message.message?.content) {
    for (const block of message.message.content) {
      if ("text" in block) {
        console.log(block.text); // Claude's reasoning
      } else if ("name" in block) {
        console.log(`Tool: ${block.name}`); // Tool being called
      }
    }
  } else if (message.type === "result") {
    console.log(`Done: ${message.subtype}`); // Final result
  }
}
