import { APIGatewayProxyHandler } from "aws-lambda";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { getItem, putItem, T } from "../../data/ketoRepo";
import { KetoUserProfile } from "../../interfaces/keto";

/**
 * GET /profile — Devuelve el perfil del usuario.
 * Si aún no existe (primer acceso), lo auto-provisiona con los datos del token.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);

    let profile = await getItem<KetoUserProfile>(T.users(), { userId: auth.userId });

    if (!profile) {
      // Auto-provisionamiento en el primer acceso
      const now = new Date().toISOString();
      profile = {
        userId: auth.userId,
        email: auth.email,
        nombre: String(
          (event.requestContext as unknown as { authorizer?: { claims?: Record<string, unknown> } })
            .authorizer?.claims?.["name"] ?? auth.email.split("@")[0],
        ),
        fechaInicio: now,
        createdAt: now,
        updatedAt: now,
      };
      await putItem(T.users(), profile as unknown as Record<string, unknown>);
    }

    return response(200, profile, origin);
  } catch (err) {
    console.error("getProfile error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
