import { APIGatewayProxyHandler } from "aws-lambda";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { getItem, updateItemFields, T } from "../../data/ketoRepo";
import { EngagementItem } from "../../interfaces/keto";

/**
 * PATCH /recommendations/{id}/read — marca una recomendación como leída (o no).
 * Solo el usuario destinatario puede marcarla. Body opcional: { leida: boolean }.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);

    const id = event.pathParameters?.id;
    if (!id) return response(400, { message: "Missing id" }, origin);

    const item = await getItem<EngagementItem>(T.engagement(), { itemId: id });
    if (!item) return response(404, { message: "Recommendation not found" }, origin);
    if (item.destinatario !== auth.userId) {
      return response(403, { message: "Forbidden: no es tu recomendación" }, origin);
    }

    let leida = true;
    if (event.body) {
      try {
        const body = JSON.parse(event.body);
        if (typeof body.leida === "boolean") leida = body.leida;
      } catch {
        /* body vacío → leida = true */
      }
    }

    await updateItemFields(T.engagement(), { itemId: id }, { leida });

    return response(200, { id, leida }, origin);
  } catch (err) {
    console.error("markRecommendationRead error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};