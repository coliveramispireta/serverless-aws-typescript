import { APIGatewayProxyHandler } from "aws-lambda";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { getItem, putItem, updateItemFields, deleteEndpointOtherUsers, T } from "../../data/ketoRepo";
import { sendPushToUser } from "../../helpers/push";
import { welcomeMessage } from "../../helpers/motivationalpools";
import { ensureUserProfile } from "../../helpers/ensureProfile";

/**
 * POST /notifications/subscriptions
 * Guarda/actualiza la suscripción Web Push de un dispositivo del usuario.
 * Body: { endpoint, keys: { p256dh, auth }, plataforma? }
 *
 * Al guardar por PRIMERA VEZ (sin flag welcomeSentAt en el perfil),
 * envía inmediatamente el push de BIENVENIDA. Los siguientes inicios
 * de sesión los saluda el endpoint /notifications/session-open.
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

    // Un dispositivo = un dueño: limpiar el mismo endpoint registrado a otros usuarios
    await deleteEndpointOtherUsers(auth.userId, endpoint);

    await putItem(T.pushsubs(), {
      userId: auth.userId,
      endpoint,
      p256dh: String(keys.p256dh),
      auth: String(keys.auth),
      plataforma: body.plataforma ? String(body.plataforma).slice(0, 40) : undefined,
      createdAt: new Date().toISOString(),
    });

    // 🔔 Push de bienvenida SOLO la primera vez (flag welcomeSentAt en el perfil).
    // El body { motivo: "prueba" } lo reenvía siempre (botón 🧪 del perfil).
    try {
      const esPrueba = String(body.motivo ?? "") === "prueba";
      const profile = await getItem<{ welcomeSentAt?: string }>(T.users(), {
        userId: auth.userId,
      });
      if (esPrueba || !profile?.welcomeSentAt) {
        await sendPushToUser(auth.userId, welcomeMessage());
        if (!esPrueba) {
          // Nunca escribir el perfil con UpdateItem sin que exista completo:
          // UpdateItem en DynamoDB crearía el item automáticamente con solo
          // welcomeSentAt (el "usuario en blanco"). Ensure garantiza email/nombre.
          await ensureUserProfile(event, auth);
          await updateItemFields(T.users(), { userId: auth.userId }, {
            welcomeSentAt: new Date().toISOString(),
          });
        }
      }
    } catch (pushErr) {
      console.warn("welcome push falló:", pushErr);
    }

    return response(201, { message: "Subscribed", endpoint }, origin);
  } catch (err) {
    console.error("savePushSubscription error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
