import { APIGatewayProxyHandler } from "aws-lambda";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { ensureUserProfile } from "../../helpers/ensureProfile";

/**
 * GET /profile — Devuelve el perfil del usuario.
 * Si aún no existe (primer acceso), lo auto-provisiona con los datos del token.
 * Si existe como "stub" incompleto (flag de notificaciones escrito antes del
 * perfil), lo completa con los claims antes de responder.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);

    const profile = await ensureUserProfile(event, auth);

    return response(200, profile, origin);
  } catch (err) {
    console.error("getProfile error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};