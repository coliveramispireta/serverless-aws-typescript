import { APIGatewayProxyHandler } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { response } from "../../helpers/response";
import { getAuth, isCoach } from "../../helpers/auth";
import { getItem, queryByUser, T } from "../../data/ketoRepo";
import { ddb } from "../../lib/dynamo";
import {
  AchievementItem,
  KetoUserProfile,
  WeightEntryItem,
  MealEntryItem,
} from "../../interfaces/keto";

const cognito = new CognitoIdentityProviderClient({});

/**
 * DELETE /coach/users/{userId}
 *
 * Elimina completamente un usuario:
 * 1. Datos de DynamoDB (pesos, comidas, logros, push subs, perfil)
 * 2. Cuenta de Cognito
 *
 * El coach no puede eliminar su propia cuenta ni la de otro coach.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);
    if (!isCoach(auth)) return response(403, { message: "Forbidden: solo el coach" }, origin);

    const targetUserId = event.pathParameters?.userId;
    if (!targetUserId) return response(400, { message: "Missing userId" }, origin);

    // No puede eliminarse a sí mismo
    if (targetUserId === auth.userId) {
      return response(400, { message: "No puedes eliminar tu propia cuenta" }, origin);
    }

    // Verificar que el target exista en DynamoDB
    const targetProfile = await getItem<KetoUserProfile>(T.users(), { userId: targetUserId });
    if (!targetProfile) {
      return response(404, { message: "Usuario no encontrado" }, origin);
    }

    // Verificar que el target no sea coach
    const coachEmails = (process.env.COACH_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (coachEmails.includes(targetProfile.email.toLowerCase())) {
      return response(400, { message: "No puedes eliminar a otro coach" }, origin);
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
        return response(400, { message: "No puedes eliminar a otro coach" }, origin);
      }
    } catch {
      // Si el usuario no existe en Cognito, continuar con la limpieza de DynamoDB
    }

    // ─── Eliminar datos de DynamoDB ───

    // 1. Pesos
    const weights = await queryByUser<WeightEntryItem>(T.weights(), targetUserId, { limit: 500 });
    for (const w of weights) {
      await ddb
        .send(
          new DeleteCommand({
            TableName: T.weights(),
            Key: { userId: targetUserId, fechaHora: w.fechaHora },
          }),
        )
        .catch(() => undefined);
    }

    // 2. Comidas
    const meals = await queryByUser<MealEntryItem>(T.meals(), targetUserId, { limit: 500 });
    for (const m of meals) {
      await ddb
        .send(
          new DeleteCommand({
            TableName: T.meals(),
            Key: { userId: targetUserId, fechaHora: m.fechaHora },
          }),
        )
        .catch(() => undefined);
    }

    // 3. Logros
    const achievements = await queryByUser<AchievementItem>(T.achievements(), targetUserId, {
      limit: 500,
    });
    for (const a of achievements) {
      await ddb
        .send(
          new DeleteCommand({
            TableName: T.achievements(),
            Key: { userId: targetUserId, codigo: a.codigo },
          }),
        )
        .catch(() => undefined);
    }

    // 4. Push subscriptions
    const pushSubs = await queryByUser<{ userId: string; endpoint: string }>(
      T.pushsubs(),
      targetUserId,
      { limit: 500 },
    );
    for (const p of pushSubs) {
      await ddb
        .send(
          new DeleteCommand({
            TableName: T.pushsubs(),
            Key: { userId: targetUserId, endpoint: p.endpoint },
          }),
        )
        .catch(() => undefined);
    }

    // 5. Perfil de usuario
    await ddb
      .send(
        new DeleteCommand({
          TableName: T.users(),
          Key: { userId: targetUserId },
        }),
      )
      .catch(() => undefined);

    // ─── Eliminar de Cognito ───
    try {
      await cognito.send(
        new AdminDeleteUserCommand({
          UserPoolId: process.env.USER_POOL_ID!,
          Username: targetUserId,
        }),
      );
    } catch (cogErr) {
      // Si el usuario no existía en Cognito, igual completamos la operación
      console.warn("AdminDeleteUser falló (usuario quizá ya no existe en Cognito):", cogErr);
    }

    return response(200, { userId: targetUserId, deleted: true }, origin);
  } catch (err) {
    console.error("coachDeleteUser error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
