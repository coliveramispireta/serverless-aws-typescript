import { PostAuthenticationTriggerHandler } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminGetUserCommand,
  AdminDeleteUserCommand,
  AdminLinkProviderForUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../../lib/dynamo";
import { T } from "../../data/ketoRepo";

const cognito = new CognitoIdentityProviderClient({});
const USER_POOL_ID = process.env.USER_POOL_ID ?? "";

interface IdpIdentity {
  providerName?: string;
  userId?: string;
}

/**
 * Trigger PostAuthentication — Evita las "cuentas duplicadas" de Google.
 *
 * Cuando un usuario con cuenta NATIVA (correo + contraseña) inicia sesión por
 * primera vez con Google usando el MISMO correo, Cognito crea un usuario
 * federado temporal (`google_…`) con otro `sub`. Este trigger:
 *
 *  1. Detecta el login federado (atributo `identities` con un único provider
 *     Google y correo verificado).
 *  2. Busca en el pool la cuenta NATIVA confirmada con el mismo correo
 *     (distinto `sub` y sin proveedores ligados).
 *  3. Siguiendo la guía de AWS ("para ligar un federado que ya inició sesión
 *     primero borra su perfil"): borra el usuario federado temporal y vincula
 *     la identidad Google a la cuenta nativa con AdminLinkProviderForUser.
 *
 * A partir del siguiente login, Cognito resuelve Google → cuenta nativa (mismo
 * `sub` → mismo perfil KetoFlow). NUNCA bloquea la autenticación: todo va en
 * try/catch y siempre se retorna el evento.
 */
export const handler: PostAuthenticationTriggerHandler = async (event) => {
  try {
    const attrs = event.request?.userAttributes || {};

    let email = (attrs.email ?? "").toLowerCase().trim();
    const currentSub = attrs.sub ?? "";
    let identitiesRaw = attrs.identities ?? "";
    let emailVerified = String(attrs.email_verified ?? "");

    // Fallback defensivo: si el evento no incluye identities/email/venficación
    // (p. ej. atributos limitados en el trigger), AdminGetUser sí los devuelve.
    if (
      (!identitiesRaw || !email || !emailVerified) &&
      USER_POOL_ID &&
      event.userName
    ) {
      try {
        const user = await cognito.send(
          new AdminGetUserCommand({
            UserPoolId: USER_POOL_ID,
            Username: event.userName,
          }),
        );
        const map: Record<string, string> = {};
        for (const a of user.UserAttributes ?? []) if (a.Name) map[a.Name] = a.Value ?? "";
        identitiesRaw = identitiesRaw || (map.identities ?? "");
        email = email || (map.email ?? "").toLowerCase().trim();
        emailVerified = emailVerified || String(map.email_verified ?? "");
      } catch {
        // Sin AdminGetUser, seguimos con lo que traiga el evento
      }
    }

    // Login nativo (sin identities) o sin datos suficientes → nada que hacer
    if (!email || !currentSub || !identitiesRaw) return event;
    if (emailVerified !== "true") return event;

    let identities: unknown[];
    try {
      identities = JSON.parse(identitiesRaw);
    } catch {
      return event;
    }
    if (!Array.isArray(identities) || identities.length !== 1) return event;

    const idp = identities[0] as IdpIdentity;
    if (String(idp.providerName ?? "").toLowerCase() !== "google") return event;
    const googleSubject = String(idp.userId ?? "");
    if (!googleSubject) return event;

    // Buscar la cuenta nativa candidata: mismo email, distinto sub, CONFIRMED,
    // sin proveedores ligados (cuenta con contraseña).
    const list = await cognito.send(
      new ListUsersCommand({
        UserPoolId: USER_POOL_ID,
        Filter: `email = "${email.replace(/"/g, "")}"`,
        Limit: 60,
      }),
    );
    if (!list.Users?.length) return event;

    let targetSub = "";
    for (const u of list.Users) {
      if (!u.Attributes) continue;
      const map: Record<string, string> = {};
      for (const a of u.Attributes) if (a.Name) map[a.Name] = a.Value ?? "";
      if (map.sub === currentSub) continue;
      if ((map.email ?? "").toLowerCase() !== email) continue;
      if (u.UserStatus !== "CONFIRMED") continue;
      if (map.identities) continue; // solo cuentas nativas sin proveedores ligados
      targetSub = map.sub ?? "";
      break;
    }
    if (!targetSub) return event;

    // Guía AWS: el federado YA inició sesión → primero borrar su perfil,
    // luego vincular la identidad a la cuenta nativa.
    await cognito.send(
      new AdminDeleteUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: event.userName,
      }),
    );
    await cognito.send(
      new AdminLinkProviderForUserCommand({
        UserPoolId: USER_POOL_ID,
        DestinationUser: {
          ProviderName: "Cognito",
          ProviderAttributeValue: targetSub,
        },
        SourceUser: {
          ProviderName: "Google",
          ProviderAttributeName: "Cognito_Subject",
          ProviderAttributeValue: googleSubject,
        },
      }),
    );

    // Mejor esfuerzo: limpiar el perfil keto temporal que la 1ª sesión pudo
    // crear bajo el sub federado (nuestro getProfile auto-provisiona completo).
    await ddb
      .send(new DeleteCommand({ TableName: T.users(), Key: { userId: currentSub } }))
      .catch(() => undefined);

    console.log(
      `[linkFederated] Google(${googleSubject}) -> ${targetSub}; temporal ${currentSub} eliminado`,
    );
  } catch (err) {
    // Nunca bloquear la autenticación
    console.error("[linkFederated] (no bloquea auth):", err);
  }
  return event;
};