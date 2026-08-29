import { APIGatewayProxyHandler } from "aws-lambda";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { queryGsi, T } from "../../data/ketoRepo";
import { CommentItem } from "../../interfaces/keto";

/** GET /posts/{postId}/comments — comentarios en orden cronológico */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);

    const postId = event.pathParameters?.postId;
    if (!postId) return response(400, { message: "Missing postId" }, origin);

    const comments = await queryGsi<CommentItem>(T.comments(), "postId", postId, "createdAt", {
      ascending: true,
      limit: 100,
    });

    // DTO para el frontend: id/autorUserId/fechaCreacion
    const dto = comments.map((c) => ({
      id: c.commentId,
      postId: c.postId,
      autorUserId: c.userId,
      autorNombre: c.autorNombre,
      autorFotoUrl: c.autorFotoUrl,
      texto: c.texto,
      fechaCreacion: c.createdAt,
    }));

    return response(200, dto, origin);
  } catch (err) {
    console.error("listComments error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
