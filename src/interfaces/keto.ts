/**
 * Tipos de dominio KetoCoach (backend).
 * Espejan los contratos definidos en el frontend (keto.models.ts).
 */

export interface KetoUserProfile {
  userId: string;
  email: string;
  nombre: string;
  fotoUrl?: string;
  alturaCm?: number;
  pesoObjetivoKg?: number;
  fechaInicio?: string;
  disabled?: boolean;
  /** true cuando el usuario completó (u omitió) el onboarding de bienvenida */
  onboardingDone?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WeightEntryItem {
  id: string;
  userId: string; // PK
  fechaHora: string; // SK (ISO)
  pesoKg: number;
  evidenciaKey?: string; // clave S3 (nunca pública)
  evidenciaFotoUrl?: string; // URL firmada generada al leer
  nota?: string;
}

export type MealType = "desayuno" | "almuerzo" | "cena" | "snack";

export interface MealEntryItem {
  id: string;
  userId: string; // PK
  fechaHora: string; // SK (ISO)
  alimento: string;
  gramos: number;
  comida?: MealType;
  carbohidratosNetos?: number;
  categoria?: FoodCategory;
  nota?: string;
}

export interface RecipeItem {
  recipeId: string;
  titulo: string;
  descripcion?: string;
  ingredientes: string[];
  pasos?: string[];
  minutosPreparacion?: number;
  porciones?: number;
  carbohidratosNetosPorPorcion?: number;
  imagenUrl?: string;
  source: "coach";
  creadaPor: string; // userId del coach
  fechaCreacion: string;
}

export interface PostItem {
  postId: string;
  gsi1pk: "FEED"; // fijo para el feed global
  gsi1sk: string; // createdAt
  userId: string;
  autorNombre: string;
  autorFotoUrl?: string;
  texto: string;
  imagenKey?: string; // clave S3 (flyers del coach)
  imagenUrl?: string; // URL externa o firmada generada al leer
  logroId?: string;
  createdAt: string;
}

export interface CommentItem {
  commentId: string;
  postId: string; // GSI HASH
  createdAt: string; // GSI RANGE
  userId: string;
  autorNombre: string;
  autorFotoUrl?: string;
  texto: string;
}

export interface ChatMessageItem {
  messageId: string;
  room: "general"; // GSI HASH
  sentAt: string; // GSI RANGE
  userId: string;
  autorNombre: string;
  autorFotoUrl?: string;
  texto: string;
}

/** Logro persistido (auto sincronizado por el front u otorgado por el coach) */
export interface AchievementItem {
  userId: string; // PK
  codigo: string; // SK
  titulo: string;
  descripcion: string;
  emoji: string;
  source: "auto" | "coach";
  fechaObtenido: string;
  compartido?: boolean;
}

/** Recomendaciones y mensajes personalizados del coach */
export type EngagementTipo = "recomendacion" | "mensaje";

export interface EngagementItem {
  itemId: string;
  tipo: EngagementTipo;
  source: "coach";
  destinatario: string; // "GROUP" o userId — GSI HASH
  createdAt: string; // GSI RANGE
  texto: string;
  createdByUserId: string;
  createdByEmail: string;
}

// ─── Catálogo de alimentos ────────────────────────────────────

export type FoodUnit = "g" | "und" | "ml";
export type FoodCategory =
  | "proteina"
  | "verdura"
  | "grasa"
  | "lacteo"
  | "fruto_seco"
  | "semilla"
  | "otro"
  | "no_keto";

export interface FoodItem {
  foodId: string;
  nombre: string;
  unidad: FoodUnit;
  equivalenciaGramos?: number; // para "und": cuántos gramos equivale 1 unidad
  categoria?: FoodCategory;
}

// ─── Líquidos ────────────────────────────────────────────────

export interface LiquidItem {
  id: string;
  userId: string; // PK
  fechaHora: string; // SK (ISO)
  cantidadMl: number;
  nota?: string;
}
