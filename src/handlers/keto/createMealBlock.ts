import { APIGatewayProxyHandler } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { getItem, batchPutItems, T } from "../../data/ketoRepo";
import { FoodItem, MealEntryItem, MealType } from "../../interfaces/keto";

const VALID_MEAL_TYPES: MealType[] = ["desayuno", "almuerzo", "cena", "snack"];

/**
 * POST /meals/block — registrar un bloque de comida completo.
 *
 * Body: {
 *   fechaHora: string,          // ISO datetime
 *   comida: MealType,           // desayuno | almuerzo | cena | snack
 *   nota?: string,              // nota opcional del bloque
 *   alimentos: Array<{
 *     foodId: string,
 *     cantidad: number,
 *   }>
 * }
 *
 * Crea N items individuales en KetoMealsTable (uno por alimento).
 * Si el alimento es "und" con equivalenciaGramos, convierte internamente a gramos.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);

    if (!event.body) return response(400, { message: "Missing request body" }, origin);

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(event.body);
    } catch {
      return response(400, { message: "Invalid JSON" }, origin);
    }

    const fechaHoraRaw = body.fechaHora;
    if (!fechaHoraRaw || Number.isNaN(Date.parse(String(fechaHoraRaw)))) {
      return response(400, { message: "fechaHora inválida" }, origin);
    }

    const comida = body.comida as MealType | undefined;
    if (comida && !VALID_MEAL_TYPES.includes(comida)) {
      return response(400, { message: "comida inválida" }, origin);
    }

    // nota opcional del bloque
    let nota: string | undefined;
    if (body.nota !== undefined && body.nota !== null && String(body.nota).trim() !== "") {
      nota = String(body.nota).trim();
      if (nota.length > 200) {
        return response(400, { message: "nota excede 200 caracteres" }, origin);
      }
    }

    const alimentos = Array.isArray(body.alimentos) ? body.alimentos : [];
    if (alimentos.length === 0) {
      return response(400, { message: "Debe agregar al menos un alimento" }, origin);
    }

    // Parsear la fecha base
    const baseDate = new Date(String(fechaHoraRaw));

    // Buscar cada alimento en el catálogo y construir items
    const mealItems: MealEntryItem[] = [];
    for (let i = 0; i < alimentos.length; i++) {
      const alimento = alimentos[i] as Record<string, unknown>;
      const foodId = String(alimento.foodId || "");
      const cantidad = Number(alimento.cantidad);

      if (!foodId) {
        return response(400, { message: `Alimento #${i + 1}: foodId requerido` }, origin);
      }
      if (!cantidad || cantidad <= 0) {
        return response(400, { message: `Alimento #${i + 1}: cantidad inválida` }, origin);
      }

      // Buscar en catálogo
      const food = await getItem<FoodItem>(T.foods(), { foodId });
      if (!food) {
        return response(400, { message: `Alimento #${i + 1}: foodId "${foodId}" no encontrado en catálogo` }, origin);
      }

      // Calcular gramos
      let gramos: number;
      if (food.unidad === "und" && food.equivalenciaGramos) {
        gramos = Math.round(cantidad * food.equivalenciaGramos);
      } else {
        gramos = Math.round(cantidad);
      }

      // Generar fechaHora incremental (+0ms, +1ms, +2ms...) para evitar colisión de SK
      const itemDate = new Date(baseDate.getTime() + i);

      const meal: MealEntryItem = {
        id: uuidv4(),
        userId: auth.userId,
        fechaHora: itemDate.toISOString(),
        alimento: food.nombre,
        gramos,
        comida: comida || undefined,
        categoria: food.categoria,
        nota,
      };

      mealItems.push(meal);
    }

    // Escribir todos en batch
    await batchPutItems(T.meals(), mealItems as unknown as Record<string, unknown>[]);

    return response(201, { imported: mealItems.length, meals: mealItems }, origin);
  } catch (err) {
    console.error("createMealBlock error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
