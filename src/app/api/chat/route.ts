import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

// ─── System prompts (imported from chat.ts logic) ───
const CHAT_PROMPT = `Eres HJ IA, un asistente de inteligencia artificial amigable y versátil. Respondes en español por defecto.

Puedes ayudar con CUALQUIER tema:
- Preguntas generales, curiosidades, historia, ciencia, deportes, cultura
- Redacción, traducción, resúmenes, análisis de texto
- Matemáticas, lógica, razonamiento
- Conversación casual, consejos, creatividad
- Y cualquier cosa que el usuario necesite

Reglas:
- Sé directo, amigable y conciso. No alargues innecesariamente.
- Responde en español salvo que te pidan otro idioma.
- Para preguntas simples, respuestas simples y rápidas.
- Para preguntas complejas, respuestas completas y bien estructuradas.
- Usa formato markdown cuando ayude a la claridad.
- Sé como ChatGPT: rápido, claro, útil y natural.`;

const CODE_PROMPT = `Eres HJ IA Code, un asistente de programación profesional y experto. Respondes en español por defecto.

Especializado en:
- Escribir, depurar y refactorizar código en cualquier lenguaje
- Arquitectura de software, diseño de sistemas
- Revisión de código, seguridad, rendimiento
- Explicar conceptos técnicos con ejemplos prácticos
- Crear proyectos completos paso a paso

Reglas:
- Sé directo y enfocado en código actionable.
- Responde en español salvo que te pidan otro idioma.
- Para código, usa bloques con el lenguaje (triple backtick + lenguaje).
- Si el usuario pide crear algo, muestra el código completo y funcional.
- Explica brevemente el "por qué" detrás de las decisiones técnicas.
- Sé como un senior developer pair programming.`;

// ─── Model ID translation for OpenCode Zen API ───
// Based on https://opencode.ai/docs — Zen provider model IDs
function translateForZen(model: string): string {
  switch (model) {
    case "auto":
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
// Endpoint: https://opencode.ai/zen/v1/chat/completions
// Free models work without API key
async function streamZen(
  model: string,
  messages: { role: string; content: string }[],
  systemPrompt: string
): Promise<ReadableStream<Uint8Array>> {
  const zenModel = translateForZen(model);

  // Solo últimos 16 mensajes para velocidad
  const recentMessages = messages.slice(-16);

  const apiMessages = [
    { role: "system", content: systemPrompt },
    ...recentMessages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // API key opcional (para rate limits más altos)
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
      max_tokens: 4096,
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
    const { messages, model, systemSuffix, mode } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Se requiere un array de mensajes" }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    // Seleccionar system prompt según modo
    const systemPrompt = mode === "code" ? CODE_PROMPT : CHAT_PROMPT;
    let fullPrompt = systemPrompt;
    if (systemSuffix) fullPrompt += systemSuffix;

    const resolvedModel = model || "minimax-free";
    const stream = await streamZen(resolvedModel, messages, fullPrompt);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    console.error("Chat API error:", error);
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
