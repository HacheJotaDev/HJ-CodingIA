"use client";

import React, { useCallback, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, Download } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
}

function CodeBlock({
  language,
  children,
}: {
  language: string | undefined;
  children: string;
}) {
  const [copied, setCopied] = useState(false);
  const codeString = String(children).replace(/\n$/, "");
  const lines = codeString.split("\n");
  const showLineNumbers = lines.length > 3;
  const lang = language || "text";

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(codeString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [codeString]);

  const handleDownload = useCallback(() => {
    const extensions: Record<string, string> = {
      javascript: "js",
      typescript: "ts",
      python: "py",
      rust: "rs",
      go: "go",
      java: "java",
      cpp: "cpp",
      c: "c",
      html: "html",
      css: "css",
      json: "json",
      yaml: "yml",
      yml: "yml",
      bash: "sh",
      shell: "sh",
      sql: "sql",
      jsx: "jsx",
      tsx: "tsx",
    };
    const ext = extensions[lang] || "txt";
    const blob = new Blob([codeString], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `code.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [codeString, lang]);

  return (
    <div className="relative group my-4 rounded-xl overflow-hidden border border-white/[0.06]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a2e] border-b border-white/[0.06]">
        <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
          {lang}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-white/40 hover:text-white/80"
            title={copied ? "Copiado" : "Copiar código"}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-white/40 hover:text-white/80"
            title="Descargar código"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {/* Code content */}
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          style={oneDark}
          language={lang}
          PreTag="div"
          showLineNumbers={showLineNumbers}
          lineNumberStyle={{
            minWidth: "3em",
            paddingRight: "1em",
            color: "rgba(255,255,255,0.2)",
            userSelect: "none",
          }}
          customStyle={{
            margin: 0,
            padding: "1rem",
            background: "#0d0d1a",
            fontSize: "0.85rem",
            lineHeight: "1.6",
          }}
          codeTagProps={{
            style: {
              fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
            },
          }}
        >
          {codeString}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="markdown-body text-sm leading-relaxed text-white/90">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !match && !String(children).includes("\n");
            if (isInline) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <CodeBlock language={match?.[1]}>
                {String(children).replace(/\n$/, "")}
              </CodeBlock>
            );
          },
          p({ children }) {
            return <p className="mb-3 last:mb-0">{children}</p>;
          },
          h1({ children }) {
            return (
              <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0 text-white">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-xl font-bold mb-3 mt-5 text-white">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-lg font-semibold mb-2 mt-4 text-white">
                {children}
              </h3>
            );
          },
          ul({ children }) {
            return <ul className="list-disc pl-6 mb-3 space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return (
              <ol className="list-decimal pl-6 mb-3 space-y-1">{children}</ol>
            );
          },
          li({ children }) {
            return <li className="text-white/85">{children}</li>;
          },
          hr() {
            return <hr className="my-6 border-white/10" />;
          },
          strong({ children }) {
            return <strong className="font-semibold text-white">{children}</strong>;
          },
          em({ children }) {
            return <em className="text-white/80 italic">{children}</em>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
