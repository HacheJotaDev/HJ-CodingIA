import { ModelOption, Mode } from "./types";

export const MODELS: ModelOption[] = [
  {
    id: "glm-4-plus",
    name: "GLM-4 Plus",
    description: "Modelo avanzado con mayor capacidad de razonamiento",
    mode: ["chat", "codigo", "imagen"],
  },
  {
    id: "glm-4-flash",
    name: "GLM-4 Flash",
    description: "Respuestas ultrarrápidas para consultas simples",
    mode: ["chat", "codigo"],
  },
  {
    id: "glm-4-long",
    name: "GLM-4 Long",
    description: "Contexto extendido para conversaciones largas",
    mode: ["chat", "codigo"],
  },
  {
    id: "glm-4-air",
    name: "GLM-4 Air",
    description: "Balance entre velocidad y calidad",
    mode: ["chat", "codigo"],
  },
  {
    id: "glm-4-airx",
    name: "GLM-4 AirX",
    description: "Versión mejorada del modelo Air",
    mode: ["chat", "codigo"],
  },
  {
    id: "glm-4",
    name: "GLM-4",
    description: "Modelo base versátil",
    mode: ["chat", "codigo"],
  },
];

export const DEFAULT_MODEL = "glm-4-plus";

export function getModelById(id: string): ModelOption | undefined {
  return MODELS.find((m) => m.id === id);
}

export function getModelsForMode(mode: Mode): ModelOption[] {
  return MODELS.filter((m) => !m.mode || m.mode.includes(mode));
}

export const MODE_SYSTEM_PROMPTS: Record<Mode, string> = {
  chat: `Eres HJ-CodingIA, un asistente de IA avanzado creado para ayudar en español. Eres amigable, conocedor y siempre respondes en español. Proporcionas respuestas detalladas y útiles. Usas un tono profesional pero cercano. Cuando te preguntan sobre ti, dices que eres HJ-CodingIA, un asistente de inteligencia artificial potenciado por modelos GLM.`,
  codigo: `Eres HJ-CodingIA en modo Código, un programador experto y arquitecto de software. Respondes siempre en español. Sigues estas reglas:
1. Escribe código limpio, bien documentado y siguiendo las mejores prácticas
2. Explica tus decisiones de diseño y arquitectura
3. Incluye manejo de errores apropiado
4. Usa tipos fuertes cuando sea posible
5. Proporciona ejemplos de uso cuando sea relevante
6. Optimiza el rendimiento cuando sea necesario
7. Sugieres pruebas unitarias cuando sea apropiado
8. Formato: usa bloques de código con el lenguaje especificado
9. Si el código es largo, organízalo en secciones claras
10. Siempre comenta el código en español`,
  imagen:
    "Eres HJ-CodingIA en modo Imagen. Cuando el usuario te describa algo, generarás una imagen basada en su descripción. Responde brevemente en español confirmando la generación.",
};

export const MODE_LABELS: Record<Mode, string> = {
  chat: "Chat",
  codigo: "Código",
  imagen: "Imagen",
};

export const MODE_ICONS: Record<Mode, string> = {
  chat: "MessageCircle",
  codigo: "Code2",
  imagen: "Image",
};

export const MODE_COLORS: Record<Mode, string> = {
  chat: "#e91e63",
  codigo: "#22c55e",
  imagen: "#f59e0b",
};

export const IMAGE_SIZES = [
  { id: "1024x1024", label: "1024×1024 (Cuadrada)" },
  { id: "768x1344", label: "768×1344 (Retrato)" },
  { id: "864x1152", label: "864×1152 (Retrato corta)" },
  { id: "1344x768", label: "1344×768 (Paisaje)" },
  { id: "1152x864", label: "1152×864 (Paisaje corta)" },
];
