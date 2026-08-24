import { MealType } from "../../interfaces/keto";

const MEAL_TYPES: MealType[] = ["desayuno", "almuerzo", "cena", "snack"];

/** Validación del body para crear una comida. Devuelve campos faltantes/inválidos. */
export function validateMealBody(body: Record<string, unknown>): string[] {
  const missing: string[] = [];
  if (!body.alimento || typeof body.alimento !== "string") missing.push("alimento");
  const gramos = Number(body.gramos);
  if (!body.gramos || Number.isNaN(gramos) || gramos <= 0) missing.push("gramos");
  if (!body.fechaHora || Number.isNaN(Date.parse(String(body.fechaHora))))
    missing.push("fechaHora");
  if (body.comida && !MEAL_TYPES.includes(body.comida as MealType)) missing.push("comida");
  return missing;
}
