"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Cpu } from "lucide-react";
import { MODELS } from "@/lib/models";

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

export function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentModel = MODELS.find((m) => m.id === selectedModel) || MODELS[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all text-sm group"
      >
        <Cpu className="w-3.5 h-3.5 text-[#e91e63]" />
        <span className="text-white/70 group-hover:text-white/90 transition-colors">
          {currentModel.name}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-white/40 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-72 z-50 rounded-xl border border-white/[0.06] bg-[#111118] shadow-2xl shadow-black/50 overflow-hidden">
          <div className="p-2">
            <div className="px-3 py-2 text-xs font-medium text-white/40 uppercase tracking-wider">
              Seleccionar Modelo
            </div>
            {MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  onModelChange(model.id);
                  setOpen(false);
                }}
                className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                  selectedModel === model.id
                    ? "bg-[#e91e63]/10 text-white"
                    : "hover:bg-white/[0.04] text-white/70"
                }`}
              >
                <div className="mt-0.5">
                  {selectedModel === model.id ? (
                    <Check className="w-4 h-4 text-[#e91e63]" />
                  ) : (
                    <div className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium">{model.name}</div>
                  <div className="text-xs text-white/40 mt-0.5">
                    {model.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
