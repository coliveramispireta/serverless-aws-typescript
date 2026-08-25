import { APIGatewayProxyHandler } from "aws-lambda";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { updateItemFields, T } from "../../data/ketoRepo";

/**
 * POST /notifications/subscriptions/guest
 * Se llama al CERRAR SESIÓN: convierte la suscripción del dispositivo a modo
 * "invitado". Deja de recibir los 8 momentos diarios y pasa a recibir solo
 * 2 mensajes al día tipo "vuelve pronto" (cronGuestMoments).
 *
 * Body: { endpoint }
 * La suscripción local del navegador se conserva: al iniciar sesión de nuevo,
 * savePushSubscription re-registra el dispositivo y el estado invitado desaparece.
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

    const endpoint = body.endpoint ? String(body.endpoint) : "";
    if (!endpoint.startsWith("http")) {
      return response(400, { message: "Missing or invalid endpoint" }, origin);
    }

    await updateItemFields(T.pushsubs(), { userId: auth.userId, endpoint }, {
      estado: "invitado",
      guestAt: new Date().toISOString(),
    });

    return response(204, {}, origin);
  } catch (err) {
    console.error("markSubscriptionGuest error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
