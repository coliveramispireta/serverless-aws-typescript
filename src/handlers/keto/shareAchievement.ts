import { APIGatewayProxyHandler } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { getItem, putItem, T } from "../../data/ketoRepo";
import { AchievementItem, PostItem, KetoUserProfile } from "../../interfaces/keto";

/**
 * POST /achievements/share
 * Marca el logro como compartido y crea la publicación en el feed del grupo.
 * Body: { codigo, titulo, emoji?, descripcion?, texto? }
 */
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

    const codigo = body.codigo ? String(body.codigo) : "";
    if (!codigo) return response(400, { message: "Missing fields", fields: ["codigo"] }, origin);

    const now = new Date().toISOString();

    // Upsert del logro marcándolo como compartido (si no existía, se crea con lo que envíe el front)
    const existing = await getItem<AchievementItem>(T.achievements(), {
      userId: auth.userId,
      codigo,
    });
    const achievement: AchievementItem = {
      userId: auth.userId,
      codigo,
      titulo: body.titulo ? String(body.titulo) : (existing?.titulo ?? codigo),
      descripcion: body.descripcion ? String(body.descripcion) : (existing?.descripcion ?? ""),
      emoji: body.emoji ? String(body.emoji) : (existing?.emoji ?? "🏅"),
      source: existing?.source ?? "auto",
      fechaObtenido: existing?.fechaObtenido ?? now,
      compartido: true,
    };
    await putItem(T.achievements(), achievement as unknown as Record<string, unknown>);

    // Nombre para el feed: perfil si existe, si no el claim de Cognito
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
      texto:
        body.texto && String(body.texto).trim().length > 0
          ? String(body.texto)
          : `¡Logré "${achievement.titulo}" en mi camino keto! ${achievement.emoji}`,
      logroId: codigo,
      createdAt: now,
    };
    await putItem(T.posts(), post as unknown as Record<string, unknown>);

    return response(201, { achievement, post }, origin);
  } catch (err) {
    console.error("shareAchievement error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
