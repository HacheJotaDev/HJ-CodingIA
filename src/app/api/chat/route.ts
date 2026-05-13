import { NextRequest } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { MODE_SYSTEM_PROMPTS } from "@/lib/models";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, model, mode, systemSuffix } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Se requieren mensajes válidos" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const effectiveMode = mode || "chat";
    const systemPrompt = MODE_SYSTEM_PROMPTS[effectiveMode as keyof typeof MODE_SYSTEM_PROMPTS] || MODE_SYSTEM_PROMPTS.chat;

    let fullSystemPrompt = systemPrompt;
    if (systemSuffix) {
      fullSystemPrompt = `${systemPrompt}\n\n${systemSuffix}`;
    }

    const zai = await ZAI.create();

    const apiMessages = [
      { role: "system", content: fullSystemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const completion = await zai.chat.completions.create({
      messages: apiMessages,
      model: model || "glm-4-plus",
      stream: true,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const content = chunk.choices?.[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Error en el streaming";
          controller.enqueue(encoder.encode(`\n\n[Error: ${errorMessage}]`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
