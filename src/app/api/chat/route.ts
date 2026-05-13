import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const SYSTEM_PROMPT = `You are HJ CodingIA, a professional AI coding assistant running in a web-based terminal interface. You help users with coding tasks, debugging, architecture decisions, and any programming-related questions.

Key behaviors:
- Be concise and direct. Focus on actionable code and explanations.
- When writing code, always specify the language for syntax highlighting.
- Use markdown formatting for structure (headers, lists, code blocks).
- For code blocks, use triple backticks with the language identifier.
- If the user asks you to create files, show the complete file content in code blocks.
- When explaining concepts, provide practical examples.
- You can help with any programming language, framework, or tool.
- Be helpful, accurate, and efficient — like a senior pair programmer.

You have deep knowledge of Rust, TypeScript, Python, Go, and all major languages and frameworks.`;

// ─── Model ID translation for OpenCode Zen API ───
function translateForZen(model: string): string {
  switch (model) {
    case "auto":
    case "free":
    case "free/auto":
      return "minimax-m2.5-free";
    case "minimax-free":
      return "minimax-m2.5-free";
    case "deepseek-r1-free":
      return "deepseek-r1-free";
    case "qwen3-free":
      return "qwen3-free";
    case "big-pickle-free":
      return "big-pickle";
    case "nemotron-free":
      return "nemotron-3-super-free";
    case "ring-free":
      return "ring-2.6-1t-free";
    default:
      return model;
  }
}

// ─── OpenAI-compatible streaming via OpenCode Zen ───
async function streamZen(
  model: string,
  messages: { role: string; content: string }[],
  systemPrompt: string
): Promise<ReadableStream<Uint8Array>> {
  const zenModel = translateForZen(model);

  const apiMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Optional: use env key if available (for higher rate limits)
  const apiKey = process.env.OPENCODE_API_KEY;
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const res = await fetch("https://opencode.ai/zen/v1/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: zenModel,
      messages: apiMessages,
      stream: true,
      temperature: 0.7,
      max_tokens: 8192,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "Unknown error");
    throw new Error(`Zen API error ${res.status}: ${err}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) { controller.close(); return; }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") { controller.close(); return; }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) controller.enqueue(encoder.encode(content));
          } catch { /* skip malformed JSON */ }
        }
      } catch (err) { controller.error(err); }
    },
    cancel() { reader.cancel(); },
  });
}

// ─── Main POST handler ───
export async function POST(req: NextRequest) {
  try {
    const { messages, model, systemSuffix } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Messages array is required" }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    let systemPrompt = SYSTEM_PROMPT;
    if (systemSuffix) systemPrompt += systemSuffix;

    const resolvedModel = model || "minimax-free";

    // All models go through OpenCode Zen — no API key needed
    const stream = await streamZen(resolvedModel, messages, systemPrompt);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    console.error("Chat API error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
