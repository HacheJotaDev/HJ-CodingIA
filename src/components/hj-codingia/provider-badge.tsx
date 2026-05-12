"use client";

import { PROVIDERS, getProviderForModel } from "@/lib/chat";

interface ProviderBadgeProps {
  providerId?: string;
  modelId?: string;
  size?: "sm" | "md";
}

export function ProviderBadge({ providerId, modelId, size = "sm" }: ProviderBadgeProps) {
  const provider = providerId
    ? PROVIDERS.find((p) => p.id === providerId)
    : modelId
      ? getProviderForModel(modelId)
      : undefined;

  if (!provider) return null;

  const sizeClasses = size === "sm" ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-0.5";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-medium ${sizeClasses}`}
      style={{
        backgroundColor: `${provider.color}15`,
        color: provider.color,
        border: `1px solid ${provider.color}30`,
      }}
    >
      <span className="text-[10px]">{provider.icon}</span>
      {provider.name}
    </span>
  );
}
