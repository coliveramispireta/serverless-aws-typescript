import { APIGatewayProxyEvent } from "aws-lambda";
import { AuthContext } from "./auth";
import { getItem, putItem, updateItemFields, UpdateFields, T } from "../data/ketoRepo";
import { KetoUserProfile } from "../interfaces/keto";

/**
 * Asegura que el perfil del usuario exista y esté COMPLETO.
 *
 * - Si no existe: lo provisiona con los datos del token (email + nombre).
 * - Si existe pero es un "stub" de versiones anteriores (falta email o nombre):
 *   lo completa en su lugar (UpdateItem en DynamoDB crearía el item automáticamente
 *   si la clave no existe, por eso nunca se debe escribir el perfil con
 *   updateItemFields sin antes garantizar que el item ya está completo).
 *
 * Devuelve el perfil vigente (ya relleno).
 */
export async function ensureUserProfile(
  event: APIGatewayProxyEvent,
  auth: AuthContext,
): Promise<KetoUserProfile> {
  const claims = (
    event.requestContext as unknown as {
      authorizer?: { claims?: Record<string, unknown> };
    }
  )?.authorizer?.claims;

  const now = new Date().toISOString();
  const nombrePorDefecto = String(claims?.["name"] ?? auth.email.split("@")[0] ?? "Usuario");

  let profile = await getItem<KetoUserProfile>(T.users(), { userId: auth.userId });

  if (!profile) {
    profile = {
      userId: auth.userId,
      email: auth.email,
      nombre: nombrePorDefecto,
      fechaInicio: now,
      createdAt: now,
      updatedAt: now,
    };
    await putItem(T.users(), profile as unknown as Record<string, unknown>);
    return profile;
  }

  const fields: UpdateFields = {};
  if (!profile.email && auth.email) fields.email = auth.email;
  if (!profile.nombre) fields.nombre = nombrePorDefecto;

  if (Object.keys(fields).length > 0) {
    fields.updatedAt = now;
    await updateItemFields(T.users(), { userId: auth.userId }, fields);
    profile = { ...profile, ...fields };
  }

  return profile;
}