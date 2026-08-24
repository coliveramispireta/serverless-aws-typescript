import { APIGatewayProxyHandler } from "aws-lambda";
import { response } from "../../helpers/response";
import { getAuth, isCoach } from "../../helpers/auth";
import { hasValue } from "../../helpers/values";
import { queryByUser, scanTable, T } from "../../data/ketoRepo";
import { KetoUserProfile, MealEntryItem, WeightEntryItem } from "../../interfaces/keto";

export interface CoachUserSummaryItem {
  userId: string;
  email: string;
  nombre: string;
  fotoUrl?: string;
  alturaCm?: number;
  pesoObjetivoKg?: number;
  pesoInicialKg?: number;
  pesoActualKg?: number;
  perdidaTotalKg?: number;
  ultimoRegistro?: string;
  diasSinRegistrar?: number;
}

/**
 * GET /coach/users — resumen de todos los usuarios del grupo.
 * Solo coach. Para grupos pequeños (decenas de usuarios) el costo es bajo.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);
    if (!isCoach(auth)) return response(403, { message: "Forbidden: solo el coach" }, origin);

    const users = await scanTable<KetoUserProfile>(T.users(), 200);
    const DAY_MS = 1000 * 60 * 60 * 24;

    const summaries = await Promise.all(
      users.map(async (u): Promise<CoachUserSummaryItem> => {
        // Primer y último registro de peso + última comida
        const [lastWeights, firstWeights, lastMeals] = await Promise.all([
          queryByUser<WeightEntryItem>(T.weights(), u.userId, { limit: 1 }),
          queryByUser<WeightEntryItem>(T.weights(), u.userId, { limit: 1, ascending: true }),
          queryByUser<MealEntryItem>(T.meals(), u.userId, { limit: 1 }),
        ]);

        const pesoInicialKg = firstWeights[0]?.pesoKg;
        const pesoActualKg = lastWeights[0]?.pesoKg;

        const candidates = [lastWeights[0]?.fechaHora, lastMeals[0]?.fechaHora].filter(
          (v): v is string => !!v,
        );
        const ultimoRegistro =
          candidates.length > 0 ? candidates.sort()[candidates.length - 1] : undefined;

        let diasSinRegistrar: number | undefined;
        if (ultimoRegistro) {
          diasSinRegistrar = Math.max(
            0,
            Math.floor((Date.now() - new Date(ultimoRegistro).getTime()) / DAY_MS),
          );
        }

        return {
          userId: u.userId,
          email: u.email,
          nombre: u.nombre,
          fotoUrl: u.fotoUrl,
          alturaCm: u.alturaCm,
          pesoObjetivoKg: u.pesoObjetivoKg,
          pesoInicialKg,
          pesoActualKg,
          perdidaTotalKg:
            hasValue(pesoInicialKg) && hasValue(pesoActualKg)
              ? Number((pesoInicialKg - pesoActualKg).toFixed(1))
              : undefined,
          ultimoRegistro,
          diasSinRegistrar,
        };
      }),
    );

    // Usuarios con más días sin registrar primero (prioridad de seguimiento)
    summaries.sort((a, b) => (b.diasSinRegistrar ?? -1) - (a.diasSinRegistrar ?? -1));

    return response(200, summaries, origin);
  } catch (err) {
    console.error("coachListUsers error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
