import { APIGatewayProxyHandler } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { getItem, putItem, T } from "../../data/ketoRepo";
import { ChatMessageItem, KetoUserProfile } from "../../interfaces/keto";

/** POST /chat/messages — enviar mensaje a la sala general */
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

    if (!body.texto || typeof body.texto !== "string" || !body.texto.trim()) {
      return response(400, { message: "Missing fields", fields: ["texto"] }, origin);
    }

    const now = new Date().toISOString();
    const profile = await getItem<KetoUserProfile>(T.users(), { userId: auth.userId });
    const autorNombre =
      profile?.nombre ??
      String(
        (event.requestContext as unknown as { authorizer?: { claims?: Record<string, unknown> } })
          .authorizer?.claims?.["name"] ?? auth.email.split("@")[0],
      );

    const message: ChatMessageItem = {
      messageId: uuidv4(),
      room: "general",
      sentAt: now,
      userId: auth.userId,
      autorNombre,
      autorFotoUrl: profile?.fotoUrl,
      texto: String(body.texto).trim().slice(0, 1000),
    };

    await putItem(T.chat(), message as unknown as Record<string, unknown>);

    // DTO para el frontend (id/autorUserId/fechaEnvio)
    const dto = {
      id: message.messageId,
      autorUserId: message.userId,
      autorNombre: message.autorNombre,
      autorFotoUrl: message.autorFotoUrl,
      texto: message.texto,
      fechaEnvio: message.sentAt,
    };

    return response(201, dto, origin);
  } catch (err) {
    console.error("sendChatMessage error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
