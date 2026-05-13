import { NextRequest } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, size } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Se requiere un prompt válido" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const zai = await ZAI.create();

    const response = await zai.images.generations.create({
      prompt: prompt.trim(),
      size: size || "1024x1024",
    });

    if (!response.data || response.data.length === 0) {
      return new Response(
        JSON.stringify({ error: "No se pudo generar la imagen" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const imageData = response.data[0].base64;

    if (!imageData) {
      return new Response(
        JSON.stringify({ error: "No se recibió la imagen generada" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ imageData }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Image API error:", error);
    const message = error instanceof Error ? error.message : "Error generando la imagen";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
