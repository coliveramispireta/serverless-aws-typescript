import { APIGatewayProxyHandler } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { response } from "../../helpers/response";
import { getAuth, isCoach } from "../../helpers/auth";
import { putItem, T } from "../../data/ketoRepo";
import { EngagementItem } from "../../interfaces/keto";
import { sendPushToUser } from "../../helpers/push";

/** Máx. de caracteres (incluidos espacios) para un MENSAJE personalizado. */
export const MAX_MENSAJE_CHARS = 300;

/**
 * POST /messages — solo coach. Mensaje personalizado a un usuario.
 * Body: { texto, destinatarioUserId } (destinatarioUserId requerido)
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

    const missing: string[] = [];
    if (!body.texto || typeof body.texto !== "string" || !body.texto.trim()) missing.push("texto");
    if (!body.destinatarioUserId) missing.push("destinatarioUserId");
    if (missing.length > 0)
      return response(400, { message: "Missing fields", fields: missing }, origin);

    // Los mensajes son cortos (máx. 300 caracteres incluidos espacios). Un texto
    // más largo es un feedback → debe ir como RECOMENDACIÓN, no como mensaje.
    const texto = String(body.texto).trim();
    if (texto.length > MAX_MENSAJE_CHARS) {
      return response(
        400,
        {
          message: `El mensaje es demasiado largo (máx. ${MAX_MENSAJE_CHARS} caracteres). Para un feedback largo usa Recomendaciones.`,
          max: MAX_MENSAJE_CHARS,
        },
        origin,
      );
    }

    const item: EngagementItem = {
      itemId: uuidv4(),
      tipo: "mensaje",
      source: "coach",
      destinatario: String(body.destinatarioUserId),
      createdAt: new Date().toISOString(),
      texto,
      createdByUserId: auth.userId,
      createdByEmail: auth.email,
    };

    await putItem(T.engagement(), item as unknown as Record<string, unknown>);

    // 🔔 Push al destinatario
    await sendPushToUser(item.destinatario, {
      title: "👤 Mensaje de tu coach",
      body: item.texto.slice(0, 300),
      url: "/inicio",
    });

    return response(201, item, origin);
  } catch (err) {
    console.error("sendMessageToUser error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
