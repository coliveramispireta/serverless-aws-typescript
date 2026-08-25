import { APIGatewayProxyHandler } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { response } from "../../helpers/response";
import { getAuth, isCoach } from "../../helpers/auth";
import { presignUpload } from "../../helpers/s3";

/**
 * POST /posts/media-url  (solo coach)
 * Devuelve una URL prefirmada para subir la imagen de un flyer/post
 * y la clave S3 que debe enviarse en createPost.
 * Body: { fileName, contentType }
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);
    if (!isCoach(auth)) return response(403, { message: "Forbidden: solo el coach" }, origin);

    if (!event.body) return response(400, { message: "Missing request body" }, origin);
    let body: { fileName?: string; contentType?: string };
    try {
      body = JSON.parse(event.body);
    } catch {
      return response(400, { message: "Invalid JSON" }, origin);
    }

    if (!body.fileName || !body.contentType?.startsWith("image/")) {
      return response(400, { message: "fileName y contentType de imagen son requeridos" }, origin);
    }

    const safeName = body.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `flyers/${auth.userId}/${uuidv4()}-${safeName}`;
    const uploadUrl = await presignUpload(key, body.contentType);

    return response(201, { uploadUrl, imagenKey: key }, origin);
  } catch (err) {
    console.error("createPostMediaUrl error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
