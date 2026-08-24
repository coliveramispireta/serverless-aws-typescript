import { APIGatewayProxyHandler } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { response } from "../../helpers/response";
import { getAuth, isCoach } from "../../helpers/auth";
import { putItem, T } from "../../data/ketoRepo";
import { EngagementItem } from "../../interfaces/keto";
import { sendPushToUser } from "../../helpers/push";

/**
 * POST /recommendations — solo coach.
 * Body: { texto, destinatarioUserId? } — sin destinatario = para todo el grupo.
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

    if (!body.texto || typeof body.texto !== "string" || !body.texto.trim()) {
      return response(400, { message: "Missing fields", fields: ["texto"] }, origin);
    }

    // El coach no puede dirigirse a sí mismo como usuario normal
    const destinatario =
      body.destinatarioUserId && String(body.destinatarioUserId) !== auth.userId
        ? String(body.destinatarioUserId)
        : "GROUP";

    const item: EngagementItem = {
      itemId: uuidv4(),
      tipo: "recomendacion",
      source: "coach",
      destinatario,
      createdAt: new Date().toISOString(),
      texto: String(body.texto).trim().slice(0, 2000),
      createdByUserId: auth.userId,
      createdByEmail: auth.email,
    };

    await putItem(T.engagement(), item as unknown as Record<string, unknown>);

    // 🔔 Push solo si es dirigida a un usuario (las del grupo no notifican para no saturar)
    if (item.destinatario !== "GROUP") {
      await sendPushToUser(item.destinatario, {
        title: "📋 Recomendación de tu coach",
        body: item.texto.slice(0, 80),
        url: "/inicio",
      });
    }

    return response(201, item, origin);
  } catch (err) {
    console.error("createRecommendation error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
