import { APIGatewayProxyHandler } from "aws-lambda";
import { response } from "../../helpers/response";
import { getAuth, isCoach } from "../../helpers/auth";
import { queryGsi, scanTable, T } from "../../data/ketoRepo";
import { EngagementItem, KetoUserProfile } from "../../interfaces/keto";

/**
 * GET /recommendations
 * - Coach: todas las recomendaciones que publicó (createdByUserId). El
 *   historial del panel del coach. Los demás contenidos (publicaciones) van por
 *   otro canal (posts/feed).
 * - Usuario: solo las personalizadas dirigidas a él (destinatario = su id).
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);

    let rows: EngagementItem[] = [];
    if (isCoach(auth)) {
      const all = await scanTable<EngagementItem>(T.engagement());
      rows = all
        .filter((e) => e.tipo === "recomendacion" && e.createdByUserId === auth.userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else {
      rows = await queryGsi<EngagementItem>(
        T.engagement(),
        "destinatario",
        auth.userId,
        "createdAt",
        { limit: 100, ascending: false },
      );
    }

    // Mapa userId → nombre para mostrar a quién fue dirigido
    const profs = await scanTable<KetoUserProfile>(T.users());
    const nombrePorId = new Map<string, string>();
    for (const p of profs) nombrePorId.set(p.userId, p.nombre);

    const recommendations = rows
      .filter((e) => e.tipo === "recomendacion")
      .map((e) => ({
        id: e.itemId,
        texto: e.texto,
        source: e.source,
        destinatarioUserId: e.destinatario,
        destinatarioNombre: nombrePorId.get(e.destinatario),
        fechaCreacion: e.createdAt,
        leida: !!e.leida,
      }));

    return response(200, recommendations, origin);
  } catch (err) {
    console.error("listRecommendations error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
