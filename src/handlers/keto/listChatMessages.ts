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
    // Se devuelven en orden cronológico para pintar directo en el front
    messages.reverse();
    return response(200, messages, origin);
  } catch (err) {
    console.error("listChatMessages error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
