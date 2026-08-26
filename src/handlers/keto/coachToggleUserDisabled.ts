import { APIGatewayProxyHandler } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminGetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { response } from "../../helpers/response";
import { getAuth, isCoach } from "../../helpers/auth";
import { getItem, updateItemFields, T } from "../../data/ketoRepo";
import { KetoUserProfile } from "../../interfaces/keto";

const cognito = new CognitoIdentityProviderClient({});

/**
 * PATCH /coach/users/{userId}/disabled
 * Body: { disabled: boolean }
 *
 * Alterna el estado habilitado/deshabilitado de un usuario.
 * - Deshabilitar: bloquea el login en Cognito + marca `disabled: true` en DynamoDB.
 * - Habilitar: reactiva el login + marca `disabled: false`.
 *
 * El coach no puede actuar sobre su propia cuenta ni sobre otro coach.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);
    if (!isCoach(auth)) return response(403, { message: "Forbidden: solo el coach" }, origin);

    const targetUserId = event.pathParameters?.userId;
    if (!targetUserId) return response(400, { message: "Missing userId" }, origin);

    // No puede actuar sobre sí mismo
    if (targetUserId === auth.userId) {
      return response(400, { message: "No puedes deshabilitar tu propia cuenta" }, origin);
    }

    // Verificar que el target exista en DynamoDB
    const targetProfile = await getItem<KetoUserProfile>(T.users(), { userId: targetUserId });
    if (!targetProfile) {
      return response(404, { message: "Usuario no encontrado" }, origin);
    }

    // Verificar que el target no sea coach (por email en COACH_EMAILS o por grupos de Cognito)
    const coachEmails = (process.env.COACH_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (coachEmails.includes(targetProfile.email.toLowerCase())) {
      return response(400, { message: "No puedes deshabilitar a otro coach" }, origin);
    }

    // Verificar en Cognito si el target pertenece al grupo de coaches
    try {
      const userResult = await cognito.send(
        new AdminGetUserCommand({
          UserPoolId: process.env.USER_POOL_ID!,
          Username: targetUserId,
        }),
      );
      const groups = userResult.UserAttributes?.find(
        (a) => a.Name === "cognito:groups",
      )?.Value;
      if (groups && groups.split(",").includes(process.env.COACH_GROUP ?? "coaches")) {
        return response(400, { message: "No puedes deshabilitar a otro coach" }, origin);
      }
    } catch {
      // Si el usuario no existe en Cognito, continuar con la operación de todas formas
    }

    // Parsear body
    let disabled: boolean;
    try {
      const body = event.body ? JSON.parse(event.body) : {};
      if (typeof body.disabled !== "boolean") {
        return response(400, { message: "El campo 'disabled' debe ser boolean" }, origin);
      }
      disabled = body.disabled;
    } catch {
      return response(400, { message: "Body inválido" }, origin);
    }

    // Aplicar cambio en Cognito
    if (disabled) {
      await cognito.send(
        new AdminDisableUserCommand({
          UserPoolId: process.env.USER_POOL_ID!,
          Username: targetUserId,
        }),
      );
    } else {
      await cognito.send(
        new AdminEnableUserCommand({
          UserPoolId: process.env.USER_POOL_ID!,
          Username: targetUserId,
        }),
      );
    }

    // Actualizar flag en DynamoDB
    await updateItemFields(T.users(), { userId: targetUserId }, {
      disabled,
      updatedAt: new Date().toISOString(),
    });

    return response(200, { userId: targetUserId, disabled }, origin);
  } catch (err) {
    console.error("coachToggleUserDisabled error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
