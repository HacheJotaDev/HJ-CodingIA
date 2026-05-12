# HJ CodingIA

**Professional AI Coding Assistant — In Your Browser**

HJ CodingIA is a web-based AI coding assistant that lets you write, debug, refactor, and ship code directly from your browser. No installation needed — just open and code.

## Features

- **14 AI Models** across 6 providers (Z AI, Anthropic, OpenAI, Google, DeepSeek, Mistral)
- **Chat Interface** with markdown rendering and syntax-highlighted code blocks
- **Slash Commands** — `/help`, `/model`, `/review`, `/plan`, `/agents`, `/goals`, and more
- **Multiple Sessions** — Create, search, and manage separate chat sessions
- **Speech Modes** — Normal, Caveman (telegraphic), and Rocky (alien pidgin)
- **Extended Thinking** — Toggle step-by-step reasoning
- **Export** — Download conversations as Markdown
- **Dark AMOLED Theme** with pink (#e91e63) accents
- **Responsive** — Works on desktop and mobile

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **AI Backend**: z-ai-web-dev-sdk
- **State**: React hooks + Zustand-ready

## Getting Started

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Open http://localhost:3000
```

## Project Structure

```
src/
├── app/
│   ├── api/chat/route.ts    # Backend AI chat endpoint
│   ├── globals.css           # AMOLED dark theme
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main app entry
├── components/
│   ├── hj-codingia/
│   │   ├── chat.tsx          # Main chat interface
│   │   ├── sidebar.tsx       # Session sidebar
│   │   ├── markdown-renderer.tsx  # Markdown + code highlighting
│   │   └── provider-badge.tsx     # Provider indicator
│   └── ui/                   # shadcn/ui components
└── lib/
    ├── chat.ts               # Models, providers, utilities
    ├── db.ts                 # Prisma database client
    └── utils.ts              # Utility functions
```

## Available Models

| Provider | Models |
|----------|--------|
| Z AI | GLM-4 Plus, GLM-4 Flash, GLM-4 Long |
| Anthropic | Claude 4 Sonnet, Claude 4 Opus |
| OpenAI | GPT-4o, GPT-4 Turbo |
| Google | Gemini Pro, Gemini Flash |
| DeepSeek | DeepSeek V3, DeepSeek Coder |
| Mistral | Mistral Large, Codestral |

## License

GPL-3.0
