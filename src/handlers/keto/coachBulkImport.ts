import { APIGatewayProxyHandler } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { response } from "../../helpers/response";
import { getAuth, isCoach } from "../../helpers/auth";
import { getItem, batchPutItems, T } from "../../data/ketoRepo";
import {
  KetoUserProfile,
  MealEntryItem,
  MealType,
  WeightEntryItem,
} from "../../interfaces/keto";

const VALID_MEAL_TYPES: MealType[] = ["desayuno", "almuerzo", "cena", "snack"];

/**
 * POST /coach/bulk-import
 * Body: {
 *   userId: string,
 *   weights: Array<{ fechaHora, pesoKg, nota? }>,
 *   meals: Array<{ fechaHora, alimento, gramos, comedy?, nota? }>
 * }
 *
 * Importa datos retroactivos de un usuario en batch.
 * Solo coach. Todo o nada: si falla algo, no se escribe nada.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);
    if (!isCoach(auth)) return response(403, { message: "Forbidden: solo el coach" }, origin);

    if (!event.body) return response(400, { message: "Missing request body" }, origin);

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(event.body);
    } catch {
      return response(400, { message: "Invalid JSON" }, origin);
    }

    const targetUserId = body.userId as string | undefined;
    if (!targetUserId) {
      return response(400, { message: "Missing userId" }, origin);
    }

    // No puede importar datos a su propia cuenta
    if (targetUserId === auth.userId) {
      return response(400, { message: "No puedes importar datos a tu propia cuenta" }, origin);
    }

    // Verificar que el usuario exista
    const targetProfile = await getItem<KetoUserProfile>(T.users(), { userId: targetUserId });
    if (!targetProfile) {
      return response(404, { message: "Usuario no encontrado" }, origin);
    }

    // Verificar que el target no sea coach
    const coachEmails = (process.env.COACH_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (coachEmails.includes(targetProfile.email.toLowerCase())) {
      return response(400, { message: "No puedes importar datos a otro coach" }, origin);
    }

    // Parsear arrays
    const rawWeights = Array.isArray(body.weights) ? body.weights : [];
    const rawMeals = Array.isArray(body.meals) ? body.meals : [];

    if (rawWeights.length === 0 && rawMeals.length === 0) {
      return response(400, { message: "No hay datos para importar (weights y meals vacíos)" }, origin);
    }

    // ─── Construir items de pesos ───
    const weightItems: WeightEntryItem[] = rawWeights.map(
      (w: Record<string, unknown>) => ({
        id: uuidv4(),
        userId: targetUserId,
        fechaHora: new Date(String(w.fechaHora)).toISOString(),
        pesoKg: Number(w.pesoKg),
        nota: w.nota ? String(w.nota) : undefined,
      }),
    );

    // ─── Construir items de comidas ───
    const mealItems: MealEntryItem[] = rawMeals.map(
      (m: Record<string, unknown>) => ({
        id: uuidv4(),
        userId: targetUserId,
        fechaHora: new Date(String(m.fechaHora)).toISOString(),
        alimento: String(m.alimento).trim(),
        gramos: Number(m.gramos),
        comida: m.comida && VALID_MEAL_TYPES.includes(m.comida as MealType)
          ? (m.comida as MealType)
          : undefined,
        nota: m.nota ? String(m.nota) : undefined,
      }),
    );

    // ─── Escritura batch (todo o nada a nivel de chunk) ───
    const results = await Promise.all([
      weightItems.length > 0 ? batchPutItems(T.weights(), weightItems as unknown as Record<string, unknown>[]) : Promise.resolve(),
      mealItems.length > 0 ? batchPutItems(T.meals(), mealItems as unknown as Record<string, unknown>[]) : Promise.resolve(),
    ]);

    return response(
      201,
      {
        imported: {
          weights: weightItems.length,
          meals: mealItems.length,
        },
      },
      origin,
    );
  } catch (err) {
    console.error("coachBulkImport error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
