import { APIGatewayProxyHandler } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { batchPutItems, T } from "../../data/ketoRepo";
import { LiquidItem, MealEntryItem, MealType } from "../../interfaces/keto";

const VALID_MEAL_TYPES: MealType[] = ["desayuno", "almuerzo", "cena", "snack"];

/**
 * POST /me/import — importar comidas y líquidos retroactivos del usuario logueado.
 * Body: {
 *   meals: Array<{ fechaHora, alimento, gramos, comida?, nota? }>,
 *   liquids: Array<{ fechaHora, cantidadMl, nota? }>
 * }
 *
 * Permite ponerse al día (días atrasados) SIN rol de coach. No importa pesos.
 * Todo o nada a nivel de chunk.
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

    const rawMeals = Array.isArray(body.meals) ? body.meals : [];
    const rawLiquids = Array.isArray(body.liquids) ? body.liquids : [];

    if (rawMeals.length === 0 && rawLiquids.length === 0) {
      return response(
        400,
        { message: "No hay datos para importar (meals y liquids vacíos)" },
        origin,
      );
    }

    // Validación de líquidos (mismas reglas que createLiquid)
    for (const l of rawLiquids as Record<string, unknown>[]) {
      const ml = Number(l.cantidadMl);
      if (Number.isNaN(ml) || ml <= 0 || ml > 10000) {
        return response(400, { message: "cantidadMl inválida (1–10000)" }, origin);
      }
      if (!l.fechaHora || Number.isNaN(Date.parse(String(l.fechaHora)))) {
        return response(400, { message: "fechaHora inválida en líquido" }, origin);
      }
      if (l.nota && String(l.nota).length > 200) {
        return response(400, { message: "nota excede 200 caracteres" }, origin);
      }
    }

    // Validación de comidas
    for (const m of rawMeals as Record<string, unknown>[]) {
      if (!m.alimento || !String(m.alimento).trim()) {
        return response(400, { message: "alimento vacío" }, origin);
      }
      const gramos = Number(m.gramos);
      if (Number.isNaN(gramos) || gramos <= 0 || gramos > 10000) {
        return response(400, { message: "gramos inválidos (1–10000)" }, origin);
      }
      if (!m.fechaHora || Number.isNaN(Date.parse(String(m.fechaHora)))) {
        return response(400, { message: "fechaHora inválida en comida" }, origin);
      }
      if (m.comida && !VALID_MEAL_TYPES.includes(m.comida as MealType)) {
        return response(400, { message: "comida inválida" }, origin);
      }
      if (m.nota && String(m.nota).length > 200) {
        return response(400, { message: "nota excede 200 caracteres" }, origin);
      }
    }

    // ─── Construir items de comidas ───
    // Se añade +i ms a cada alimento para evitar colisión de SK (fechaHora)
    // cuando hay varios alimentos a la misma hora (mismo patrón que createMealBlock).
    const mealItems: MealEntryItem[] = rawMeals.map((m: Record<string, unknown>, i: number) => {
      const base = new Date(String(m.fechaHora));
      return {
        id: uuidv4(),
        userId: auth.userId,
        fechaHora: new Date(base.getTime() + i).toISOString(),
        alimento: String(m.alimento).trim(),
        gramos: Number(m.gramos),
        comida:
          m.comida && VALID_MEAL_TYPES.includes(m.comida as MealType)
            ? (m.comida as MealType)
            : undefined,
        nota: m.nota ? String(m.nota) : undefined,
      };
    });

    // ─── Construir items de líquidos ───
    // Ídem: +j ms para evitar colisión de SK entre líquidos de la misma hora.
    const liquidItems: LiquidItem[] = rawLiquids.map((l: Record<string, unknown>, j: number) => {
      const base = new Date(String(l.fechaHora));
      return {
        id: uuidv4(),
        userId: auth.userId,
        fechaHora: new Date(base.getTime() + j).toISOString(),
        cantidadMl: Number(l.cantidadMl),
        nota: l.nota ? String(l.nota) : undefined,
      };
    });

    // ─── Escritura batch ───
    await Promise.all([
      mealItems.length > 0
        ? batchPutItems(T.meals(), mealItems as unknown as Record<string, unknown>[])
        : Promise.resolve(),
      liquidItems.length > 0
        ? batchPutItems(T.liquids(), liquidItems as unknown as Record<string, unknown>[])
        : Promise.resolve(),
    ]);

    return response(
      201,
      { imported: { meals: mealItems.length, liquids: liquidItems.length } },
      origin,
    );
  } catch (err) {
    console.error("userImport error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
