import { APIGatewayProxyHandler } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { getItem, putItem, T } from "../../data/ketoRepo";
import { CommentItem, KetoUserProfile } from "../../interfaces/keto";
import { sendPushToUser } from "../../helpers/push";

/** POST /posts/{postId}/comments — comentar una publicación */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);

    const postId = event.pathParameters?.postId;
    if (!postId) return response(400, { message: "Missing postId" }, origin);

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

    // Verificar que el post exista
    const post = await getItem<{ postId: string; userId?: string }>(T.posts(), { postId });
    if (!post) return response(404, { message: "Post not found" }, origin);

    const now = new Date().toISOString();
    const profile = await getItem<KetoUserProfile>(T.users(), { userId: auth.userId });
    const autorNombre =
      profile?.nombre ??
      String(
        (event.requestContext as unknown as { authorizer?: { claims?: Record<string, unknown> } })
          .authorizer?.claims?.["name"] ?? auth.email.split("@")[0],
      );

    const comment: CommentItem = {
      commentId: uuidv4(),
      postId,
      createdAt: now,
      userId: auth.userId,
      autorNombre,
      autorFotoUrl: profile?.fotoUrl,
      texto: String(body.texto).trim().slice(0, 1000),
    };

    await putItem(T.comments(), comment as unknown as Record<string, unknown>);

    // 🔔 Push al dueño del post (no autonotificarse)
    if (post.userId && post.userId !== auth.userId) {
      await sendPushToUser(post.userId, {
        title: "💬 Nuevo comentario",
        body: `${autorNombre} comentó tu publicación: ${comment.texto.slice(0, 300)}`,
        url: "/comunidad",
      });
    }

    // DTO para el frontend (id/autorUserId/fechaCreacion)
    const dto = {
      id: comment.commentId,
      postId: comment.postId,
      autorUserId: comment.userId,
      autorNombre: comment.autorNombre,
      autorFotoUrl: comment.autorFotoUrl,
      texto: comment.texto,
      fechaCreacion: comment.createdAt,
    };

    return response(201, dto, origin);
  } catch (err) {
    console.error("createComment error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
