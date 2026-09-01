import { APIGatewayProxyHandler } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { response } from "../../helpers/response";
import { getAuth, isCoach } from "../../helpers/auth";
import { getItem, putItem, T } from "../../data/ketoRepo";
import { PostItem, KetoUserProfile } from "../../interfaces/keto";
import { sendPushToAll } from "../../helpers/push";
import { presignDownload } from "../../helpers/s3";

/** POST /posts — nueva publicación en el feed del grupo */
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

    const texto = body.texto && typeof body.texto === "string" ? String(body.texto).trim() : "";
    const tieneImagen = Boolean(body.imagenKey || body.imagenUrl);
    if (!texto && !tieneImagen) {
      return response(400, { message: "Se requiere texto o imagen" }, origin);
    }

    const now = new Date().toISOString();
    const profile = await getItem<KetoUserProfile>(T.users(), { userId: auth.userId });
    const autorNombre =
      profile?.nombre ??
      String(
        (event.requestContext as unknown as { authorizer?: { claims?: Record<string, unknown> } })
          .authorizer?.claims?.["name"] ?? auth.email.split("@")[0],
      );

    const post: PostItem = {
      postId: uuidv4(),
      gsi1pk: "FEED",
      gsi1sk: now,
      userId: auth.userId,
      autorNombre,
      autorFotoUrl: profile?.fotoUrl,
      texto: texto.slice(0, 2000),
      imagenUrl: body.imagenUrl ? String(body.imagenUrl) : undefined,
      imagenKey: body.imagenKey ? String(body.imagenKey) : undefined,
      logroId: body.logroId ? String(body.logroId) : undefined,
      createdAt: now,
    };

    await putItem(T.posts(), post as unknown as Record<string, unknown>);

    // 🔔 Solo los posts del COACH notifican a todos (flyers/anuncios).
    // Los posts de usuarios no generan broadcast (anti-spam).
    if (isCoach(auth)) {
      // Si el flyer lleva imagen, generar URL firmada para que Android la muestre
      // en la notificación (campo `image`).
      let pushImage: string | undefined;
      if (post.imagenKey) {
        try {
          pushImage = await presignDownload(post.imagenKey);
        } catch (e) {
          console.warn("presignDownload flyer:", e);
        }
      }
      await sendPushToAll({
        title: "📣 El coach publicó",
        body: post.texto.length > 0 ? post.texto.slice(0, 300) : "Nuevo flyer en la comunidad",
        url: "/comunidad",
        image: pushImage,
      });
    }

    return response(201, post, origin);
  } catch (err) {
    console.error("createPost error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
