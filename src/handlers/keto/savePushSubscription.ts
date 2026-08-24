import { APIGatewayProxyHandler } from "aws-lambda";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { putItem, T } from "../../data/ketoRepo";

/**
 * POST /notifications/subscriptions
 * Guarda/actualiza la suscripción Web Push de un dispositivo del usuario.
 * Body: { endpoint, keys: { p256dh, auth }, plataforma? }
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
    const keys = (body.keys ?? {}) as Record<string, unknown>;
    const missing: string[] = [];
    if (!endpoint.startsWith("http")) missing.push("endpoint");
    if (!keys.p256dh || typeof keys.p256dh !== "string") missing.push("keys.p256dh");
    if (!keys.auth || typeof keys.auth !== "string") missing.push("keys.auth");
    if (missing.length > 0)
      return response(400, { message: "Missing fields", fields: missing }, origin);

    await putItem(T.pushsubs(), {
      userId: auth.userId,
      endpoint,
      p256dh: String(keys.p256dh),
      auth: String(keys.auth),
      plataforma: body.plataforma ? String(body.plataforma).slice(0, 40) : undefined,
      createdAt: new Date().toISOString(),
    });

    return response(201, { message: "Subscribed", endpoint }, origin);
  } catch (err) {
    console.error("savePushSubscription error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
