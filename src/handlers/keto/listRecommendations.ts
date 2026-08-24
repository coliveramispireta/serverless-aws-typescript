import { APIGatewayProxyHandler } from "aws-lambda";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { queryGsi, T } from "../../data/ketoRepo";
import { EngagementItem } from "../../interfaces/keto";

/** GET /recommendations — del grupo + las dirigidas al usuario (más recientes primero) */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);

    const [groupRecs, ownRecs] = await Promise.all([
      queryGsi<EngagementItem>(T.engagement(), "destinatario", "GROUP", "createdAt", {
        limit: 50,
        ascending: false,
      }),
      queryGsi<EngagementItem>(T.engagement(), "destinatario", auth.userId, "createdAt", {
        limit: 50,
        ascending: false,
      }),
    ]);

    const recommendations = [...groupRecs, ...ownRecs]
      .filter((e) => e.tipo === "recomendacion")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((e) => ({
        id: e.itemId,
        texto: e.texto,
        source: e.source,
        destinatarioUserId: e.destinatario === "GROUP" ? undefined : e.destinatario,
        fechaCreacion: e.createdAt,
      }));

    return response(200, recommendations, origin);
  } catch (err) {
    console.error("listRecommendations error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
