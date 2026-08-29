import { APIGatewayProxyHandler } from "aws-lambda";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { queryGsi, T } from "../../data/ketoRepo";
import { ChatMessageItem } from "../../interfaces/keto";

/** GET /chat/messages — últimos 100 mensajes de la sala general (cronológico) */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);

    const messages = await queryGsi<ChatMessageItem>(T.chat(), "room", "general", "sentAt", {
      limit: 100,
      ascending: false,
    });

    // DTO para el frontend (id/autorUserId/fechaEnvio), en orden cronológico
    const dto = messages
      .map((m) => ({
        id: m.messageId,
        autorUserId: m.userId,
        autorNombre: m.autorNombre,
        autorFotoUrl: m.autorFotoUrl,
        texto: m.texto,
        fechaEnvio: m.sentAt,
      }))
      .reverse();

    return response(200, dto, origin);
  } catch (err) {
    console.error("listChatMessages error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
