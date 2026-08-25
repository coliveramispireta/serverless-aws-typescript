import { APIGatewayProxyHandler } from "aws-lambda";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { getItem, updateItemFields, T } from "../../data/ketoRepo";
import { sendPushToUser } from "../../helpers/push";
import { randomBienvenidaDeVuelta } from "../../helpers/motivationalpools";

/**
 * POST /notifications/session-open
 * El frontend lo llama al iniciar sesión (AppShell). Saluda con un push
 * de re-encuentro ("¡Qué alegría verte!") como máximo una vez cada 24 h.
 *
 * Reglas:
 *  - Usuario sin flag welcomeSentAt → no hace nada (lo saluda el flujo
 *    de suscripción con la bienvenida original).
 *  - Con saludo en las últimas 24 h → no hace nada (throttle anti-spam).
 */
const THROTTLE_MS = 24 * 60 * 60 * 1000;

export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);

    const profile = await getItem<{
      welcomeSentAt?: string;
      lastSessionGreetAt?: string;
    }>(T.users(), { userId: auth.userId });

    // Usuario nuevo o nunca saludado: el saludo lo da savePushSubscription
    if (!profile?.welcomeSentAt) return response(204, {}, origin);

    // Throttle: máximo 1 saludo cada 24 h
    if (profile.lastSessionGreetAt) {
      const last = Date.parse(profile.lastSessionGreetAt);
      if (!Number.isNaN(last) && Date.now() - last < THROTTLE_MS) {
        return response(204, {}, origin);
      }
    }

    await updateItemFields(T.users(), { userId: auth.userId }, {
      lastSessionGreetAt: new Date().toISOString(),
    });

    try {
      await sendPushToUser(auth.userId, randomBienvenidaDeVuelta());
    } catch (pushErr) {
      console.warn("session-open push falló:", pushErr);
    }

    return response(204, {}, origin);
  } catch (err) {
    console.error("sessionOpen error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
