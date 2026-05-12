import ZAI from 'z-ai-web-dev-sdk';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { messages, model, systemSuffix } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    let systemPrompt = `You are HJ CodingIA, a professional AI coding assistant running in a web-based terminal interface. You help users with coding tasks, debugging, architecture decisions, and any programming-related questions.

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

    if (systemSuffix) {
      systemPrompt += systemSuffix;
    }

    const apiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const completion = await zai.chat.completions.create({
      messages: apiMessages,
      model: model || 'glm-4-plus',
      temperature: 0.7,
      max_tokens: 4096,
    });

    const content = completion.choices?.[0]?.message?.content || '';

    return NextResponse.json({ content });
  } catch (error: unknown) {
    console.error('Chat API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
