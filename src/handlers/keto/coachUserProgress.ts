import { APIGatewayProxyHandler } from "aws-lambda";
import { response } from "../../helpers/response";
import { getAuth, isCoach } from "../../helpers/auth";
import { getItem, queryByUser, T } from "../../data/ketoRepo";
import {
  AchievementItem,
  KetoUserProfile,
  LiquidItem,
  MealEntryItem,
  WeightEntryItem,
} from "../../interfaces/keto";
import { presignDownload } from "../../helpers/s3";

/**
 * GET /coach/users/{userId}/progress — progreso completo de un usuario.
 * Solo coach. Las evidencias se devuelven con URLs firmadas temporales.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);
    if (!isCoach(auth)) return response(403, { message: "Forbidden: solo el coach" }, origin);

    const userId = event.pathParameters?.userId;
    if (!userId) return response(400, { message: "Missing userId" }, origin);

    const [usuario, weightsRaw, comidas, logros, liquidos] = await Promise.all([
      getItem<KetoUserProfile>(T.users(), { userId }),
      queryByUser<WeightEntryItem>(T.weights(), userId, { limit: 200, ascending: true }),
      queryByUser<MealEntryItem>(T.meals(), userId, { limit: 200, ascending: false }),
      queryByUser<AchievementItem>(T.achievements(), userId, { limit: 100, ascending: false }),
      queryByUser<LiquidItem>(T.liquids(), userId, { limit: 200, ascending: false }),
    ]);

    // Firmar las evidencias para que el coach pueda verlas
    const pesos = await Promise.all(
      weightsRaw.map(async (w) => ({
        ...w,
        evidenciaFotoUrl: w.evidenciaKey ? await presignDownload(w.evidenciaKey) : undefined,
      })),
    );

    return response(200, { usuario, pesos, comidas, logros, liquidos }, origin);
  } catch (err) {
    console.error("coachUserProgress error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
