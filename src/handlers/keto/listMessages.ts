import { APIGatewayProxyHandler } from "aws-lambda";
import { response } from "../../helpers/response";
import { getAuth, isCoach } from "../../helpers/auth";
import { queryGsi, scanTable, T } from "../../data/ketoRepo";
import { EngagementItem, KetoUserProfile } from "../../interfaces/keto";

/** GET /messages — mensajes personales. Usuario: los recibidos; Coach: todos los que envió. */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);

    let items: EngagementItem[];
    if (isCoach(auth)) {
      const all = await scanTable<EngagementItem>(T.engagement());
      items = all
        .filter((e) => e.tipo === "mensaje" && e.createdByUserId === auth.userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else {
      items = await queryGsi<EngagementItem>(
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

    const messages = items
      .filter((e) => e.tipo === "mensaje")
      .map((e) => ({
        id: e.itemId,
        texto: e.texto,
        source: e.source,
        destinatarioUserId: e.destinatario,
        destinatarioNombre: nombrePorId.get(e.destinatario),
        fechaCreacion: e.createdAt,
      }));

    return response(200, messages, origin);
  } catch (err) {
    console.error("listMessages error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
