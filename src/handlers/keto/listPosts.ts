import { APIGatewayProxyHandler } from "aws-lambda";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { queryGsi, T } from "../../data/ketoRepo";
import { presignDownload } from "../../helpers/s3";
import { PostItem } from "../../interfaces/keto";

/** GET /posts — feed global (más recientes primero, máx. 50) */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);

    const posts = await queryGsi<PostItem>(T.posts(), "gsi1pk", "FEED", "gsi1sk", {
      limit: 50,
      ascending: false,
    });

    // DTO para el frontend: id/fechaCreacion/autorUserId + firma de imágenes S3.
    const dto = await Promise.all(
      posts.map(async (p) => ({
        id: p.postId,
        autorUserId: p.userId,
        autorNombre: p.autorNombre,
        autorFotoUrl: p.autorFotoUrl,
        texto: p.texto,
        imagenUrl: p.imagenKey ? await presignDownload(p.imagenKey) : p.imagenUrl,
        imagenKey: p.imagenKey,
        logroId: p.logroId,
        fechaCreacion: p.createdAt,
      })),
    );

    return response(200, dto, origin);
  } catch (err) {
    console.error("listPosts error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
