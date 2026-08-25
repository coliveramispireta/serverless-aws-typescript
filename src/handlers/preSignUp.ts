import { PreSignUpTriggerHandler } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";

/**
 * Trigger PreSignUp de Cognito:
 *
 * - Registro NATIVO (PreSignUp_SignUp): NO se autoconfirma. Cognito envía un
 *   código de verificación de 6 dígitos al correo; el frontend lo valida con
 *   confirmSignUp antes del primer login.
 *
 * - Primer login FEDERADO (Google, PreSignUp_ExternalProvider*): la cuenta debe
 *   existir previamente en el pool (creada con correo+contraseña). Si no existe,
 *   se rechaza el alta automática con error → el hosted UI regresa al frontend
 *   con ?error=access_denied y ahí se muestra el mensaje en español.
 *   Si el email SÍ existe como usuario nativo → se permite federar.
 */

const cognito = new CognitoIdentityProviderClient({});
const USER_POOL_ID = process.env.USER_POOL_ID ?? "";

async function emailExistsInPool(email: string): Promise<boolean> {
  if (!USER_POOL_ID) return false;
  const result = await cognito.send(
    new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Filter: `email = "${email.replace(/"/g, "")}"`,
      Limit: 1,
    }),
  );
  return (result.Users?.length ?? 0) > 0;
}

export const handler: PreSignUpTriggerHandler = async (event) => {
  try {
    const attributes = event.request?.userAttributes || {};
    const source = event.triggerSource ?? "";
    console.log("PreSignUp trigger:", source, "| email:", attributes.email);

    // ---------- Registro nativo (correo + contraseña): exigir verificación ----------
    if (source === "PreSignUp_SignUp") {
      event.response.autoConfirmUser = false;
      console.log("Registro nativo: pendiente de verificación por código");
      return event;
    }

    // ---------- Login federado (Google): solo si la cuenta ya existe ----------
    if (source.startsWith("PreSignUp_ExternalProvider")) {
      const email = (attributes.email ?? "").toLowerCase().trim();
      if (!email) {
        throw new Error("KOFLOW_NO_EXISTE");
      }
      const exists = await emailExistsInPool(email);
      if (!exists) {
        console.warn("Federación rechazada: cuenta inexistente para", email);
        throw new Error(
          "KOFLOW_NO_EXISTE: La cuenta aún no existe en KetoFlow. Primero créala con tu correo y contraseña.",
        );
      }
      event.response.autoConfirmUser = true;
      event.response.autoVerifyEmail = true;
      console.log("Federación permitida: cuenta existente para", email);
      return event;
    }

    // ---------- Otros triggers (AdminCreateUser, etc.): permisivo ----------
    event.response.autoConfirmUser = true;
    if (attributes.email) {
      event.response.autoVerifyEmail = true;
    }
    return event;
  } catch (err) {
    // Propagar el mensaje original (el hosted UI lo generaliza a access_denied)
    console.error("Error en PreSignUp Lambda:", err);
    throw err;
  }
};
