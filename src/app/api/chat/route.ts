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

// ─── OpenAI-compatible streaming (works for all compatible providers) ───
async function streamOpenAICompatible(
  endpoint: string,
  apiKey: string | undefined,
  model: string,
  messages: { role: string; content: string }[],
  systemPrompt: string,
  extraHeaders?: Record<string, string>
): Promise<ReadableStream<Uint8Array>> {
  const apiMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    ...extraHeaders,
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: apiMessages,
      stream: true,
      temperature: 0.7,
      max_tokens: 8192,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "Unknown error");
    throw new Error(`API error ${res.status}: ${err}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6);
          if (data === "[DONE]") {
            controller.close();
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          } catch {
            // skip malformed JSON chunks
          }
        }
      } catch (err) {
        controller.error(err);
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}

// ─── Anthropic Messages API ───
async function streamAnthropic(
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
  systemPrompt: string
): Promise<ReadableStream<Uint8Array>> {
  const apiMessages = messages.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system: systemPrompt,
      messages: apiMessages,
      stream: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "Unknown error");
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          try {
            const parsed = JSON.parse(trimmed.slice(6));
            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              controller.enqueue(encoder.encode(parsed.delta.text));
            } else if (parsed.type === "message_stop") {
              controller.close();
              return;
            }
          } catch {
            // skip malformed JSON
          }
        }
      } catch (err) {
        controller.error(err);
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}

// ─── Google Gemini API ───
async function streamGoogle(
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
  systemPrompt: string
): Promise<ReadableStream<Uint8Array>> {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text().catch(() => "Unknown error");
    throw new Error(`Google API error ${res.status}: ${err}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          try {
            const parsed = JSON.parse(trimmed.slice(6));
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          } catch {
            // skip malformed JSON
          }
        }
      } catch (err) {
        controller.error(err);
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}

// ─── Free provider: OpenCode Zen (no API key needed for free models) ───
async function streamZenFree(
  model: string,
  messages: { role: string; content: string }[],
  systemPrompt: string
): Promise<ReadableStream<Uint8Array>> {
  return streamOpenAICompatible(
    "https://opencode.ai/zen/v1/chat/completions",
    process.env.OPENCODE_API_KEY || undefined,
    model,
    messages,
    systemPrompt
  );
}

// ─── Free provider: OpenRouter free models ───
async function streamOpenRouterFree(
  model: string,
  messages: { role: string; content: string }[],
  systemPrompt: string
): Promise<ReadableStream<Uint8Array>> {
  return streamOpenAICompatible(
    "https://openrouter.ai/api/v1/chat/completions",
    process.env.OPENROUTER_API_KEY || undefined,
    model,
    messages,
    systemPrompt,
    {
      "HTTP-Referer": "https://hj-codingia.vercel.app/",
      "X-Title": "HJ CodingIA",
    }
  );
}

// ─── Z AI SDK (local dev fallback) ───
async function streamZAI(
  model: string,
  messages: { role: string; content: string }[],
  systemPrompt: string
): Promise<ReadableStream<Uint8Array>> {
  const apiMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  try {
    const mod = await import("z-ai-web-dev-sdk");
    const ZAI = mod.default;
    const zai = await ZAI.create();

    // Use streaming to avoid 502 timeouts on long code responses
    const streamBody = await zai.chat.completions.create({
      messages: apiMessages,
      model: model || "glm-4-flash",
      temperature: 0.7,
      max_tokens: 8192,
      stream: true,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    if (streamBody && typeof streamBody === "object" && "getReader" in streamBody) {
      const reader = (streamBody as ReadableStream<Uint8Array>).getReader();
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
                const content = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content;
                if (content) controller.enqueue(encoder.encode(content));
              } catch { /* skip */ }
            }
          } catch (err) { controller.error(err); }
        },
        cancel() { reader.cancel(); },
      });
    }

    // Non-streaming fallback
    const content = streamBody?.choices?.[0]?.message?.content || "";
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(content));
        controller.close();
      },
    });
  } catch {
    throw new Error("Z_AI_SDK_UNAVAILABLE");
  }
}

// ─── Free provider with auto-fallback ───
async function streamFree(
  model: string,
  messages: { role: string; content: string }[],
  systemPrompt: string
): Promise<ReadableStream<Uint8Array>> {
  const errors: string[] = [];

  // 1. Try Z AI SDK (works locally with .z-ai-config)
  try {
    return await streamZAI(model, messages, systemPrompt);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown";
    if (msg !== "Z_AI_SDK_UNAVAILABLE") {
      // It was a real error, not just missing config
      errors.push(`Z AI: ${msg}`);
    }
  }

  // 2. Try OpenCode Zen (free models, no key needed)
  try {
    return await streamZenFree(model, messages, systemPrompt);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown";
    errors.push(`Zen: ${msg}`);
  }

  // 3. Try OpenRouter free
  try {
    return await streamOpenRouterFree(model, messages, systemPrompt);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown";
    errors.push(`OpenRouter: ${msg}`);
  }

  // All free providers failed
  throw new Error(
    `All free providers failed. Errors: ${errors.join(" | ")}. You can add your own API key in Settings for a specific provider.`
  );
}

// ─── Provider model mapping for paid providers ───
const PROVIDER_MODEL_MAP: Record<string, string> = {
  "claude-4-sonnet": "claude-sonnet-4-20250514",
  "claude-4-opus": "claude-opus-4-20250514",
  "gpt-4o": "gpt-4o",
  "gpt-4-turbo": "gpt-4-turbo",
  "gemini-pro": "gemini-2.0-flash",
  "gemini-flash": "gemini-2.0-flash-lite",
  "deepseek-v3": "deepseek-chat",
  "deepseek-coder": "deepseek-coder",
  "mistral-large": "mistral-large-latest",
  "codestral": "codestral-latest",
};

const MODEL_TO_PROVIDER: Record<string, string> = {
  "glm-4-plus": "z-ai",
  "glm-4-flash": "z-ai",
  "glm-4-long": "z-ai",
  "minimax-free": "zen",
  "deepseek-r1-free": "zen",
  "qwen3-free": "zen",
  "openrouter-free": "openrouter",
  "claude-4-sonnet": "anthropic",
  "claude-4-opus": "anthropic",
  "gpt-4o": "openai",
  "gpt-4-turbo": "openai",
  "gemini-pro": "google",
  "gemini-flash": "google",
  "deepseek-v3": "deepseek",
  "deepseek-coder": "deepseek",
  "mistral-large": "mistral",
  "codestral": "mistral",
};

// ─── Main POST handler ───
export async function POST(req: NextRequest) {
  try {
    const { messages, model, systemSuffix, apiKey, provider } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Messages array is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let systemPrompt = SYSTEM_PROMPT;
    if (systemSuffix) {
      systemPrompt += systemSuffix;
    }

    const resolvedProvider = provider || MODEL_TO_PROVIDER[model] || "free";
    const apiModel = PROVIDER_MODEL_MAP[model] || model;

    let stream: ReadableStream<Uint8Array>;

    switch (resolvedProvider) {
      // ─── Free providers (no API key needed) ───
      case "free":
      case "zen":
      case "z-ai":
      case "openrouter":
        stream = await streamFree(model, messages, systemPrompt);
        break;

      // ─── Paid providers (require API key) ───
      case "anthropic": {
        if (!apiKey) throw new Error("Anthropic API key required. Go to Settings \u2192 API Keys to configure.");
        stream = await streamAnthropic(apiKey, apiModel, messages, systemPrompt);
        break;
      }
      case "openai": {
        if (!apiKey) throw new Error("OpenAI API key required. Go to Settings \u2192 API Keys to configure.");
        stream = await streamOpenAICompatible(
          "https://api.openai.com/v1/chat/completions",
          apiKey, apiModel, messages, systemPrompt
        );
        break;
      }
      case "deepseek": {
        if (!apiKey) throw new Error("DeepSeek API key required. Go to Settings \u2192 API Keys to configure.");
        stream = await streamOpenAICompatible(
          "https://api.deepseek.com/v1/chat/completions",
          apiKey, apiModel, messages, systemPrompt
        );
        break;
      }
      case "mistral": {
        if (!apiKey) throw new Error("Mistral API key required. Go to Settings \u2192 API Keys to configure.");
        stream = await streamOpenAICompatible(
          "https://api.mistral.ai/v1/chat/completions",
          apiKey, apiModel, messages, systemPrompt
        );
        break;
      }
      case "google": {
        if (!apiKey) throw new Error("Google API key required. Go to Settings \u2192 API Keys to configure.");
        stream = await streamGoogle(apiKey, apiModel, messages, systemPrompt);
        break;
      }
      default:
        stream = await streamFree(model, messages, systemPrompt);
    }

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
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
