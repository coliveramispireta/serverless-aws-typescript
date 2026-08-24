import { APIGatewayProxyHandler } from "aws-lambda";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { queryGsi, T } from "../../data/ketoRepo";
import { EngagementItem } from "../../interfaces/keto";

/** GET /messages — mensajes personales recibidos por el usuario */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);

    const items = await queryGsi<EngagementItem>(
      T.engagement(),
      "destinatario",
      auth.userId,
      "createdAt",
      {
        limit: 50,
        ascending: false,
      },
    );

    const messages = items
      .filter((e) => e.tipo === "mensaje")
      .map((e) => ({
        id: e.itemId,
        texto: e.texto,
        source: e.source,
        destinatarioUserId: e.destinatario,
        fechaCreacion: e.createdAt,
      }));

    return response(200, messages, origin);
  } catch (err) {
    console.error("listMessages error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
