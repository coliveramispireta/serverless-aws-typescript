import {
  PutCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
  DeleteCommand,
  UpdateCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { ddb } from "../lib/dynamo";

/**
 * Acceso a datos KetoCoach. Mantiene los handlers delgados y
 * centraliza el patrón de claves de cada tabla.
 */

export const T = {
  users: () => process.env.KETO_USERS_TABLE!,
  weights: () => process.env.KETO_WEIGHTS_TABLE!,
  meals: () => process.env.KETO_MEALS_TABLE!,
  recipes: () => process.env.KETO_RECIPES_TABLE!,
  posts: () => process.env.KETO_POSTS_TABLE!,
  comments: () => process.env.KETO_COMMENTS_TABLE!,
  chat: () => process.env.KETO_CHAT_TABLE!,
  achievements: () => process.env.KETO_ACHIEVEMENTS_TABLE!,
  engagement: () => process.env.KETO_ENGAGEMENT_TABLE!,
  pushsubs: () => process.env.KETO_PUSHSUBS_TABLE!,
  foods: () => process.env.KETO_FOODS_TABLE!,
  liquids: () => process.env.KETO_LIQUIDS_TABLE!,
};

export async function putItem<T extends Record<string, unknown>>(
  table: string,
  item: T,
): Promise<T> {
  await ddb.send(new PutCommand({ TableName: table, Item: item }));
  return item;
}

export async function getItem<T>(
  table: string,
  key: Record<string, unknown>,
): Promise<T | undefined> {
  const result = await ddb.send(new GetCommand({ TableName: table, Key: key }));
  return result.Item as T | undefined;
}

/** Consulta por usuario ordenada por fechaHora (desc por defecto) */
export async function queryByUser<T>(
  table: string,
  userId: string,
  options?: { limit?: number; ascending?: boolean },
): Promise<T[]> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: table,
      KeyConditionExpression: "#u = :uid",
      ExpressionAttributeNames: { "#u": "userId" },
      ExpressionAttributeValues: { ":uid": userId },
      ScanIndexForward: options?.ascending ?? false,
      Limit: options?.limit,
    }),
  );
  return (result.Items as T[]) ?? [];
}

/**
 * Busca un item del usuario por su `id` lógico en una tabla con
 * PK=userId + SK=fechaHora, y lo elimina. Devuelve true si existía.
 */
export async function findAndDeleteUserItem(
  table: string,
  userId: string,
  id: string,
): Promise<boolean> {
  const items = await queryByUser<{ id: string; fechaHora: string }>(table, userId, { limit: 500 });
  const target = items.find((i) => i.id === id);
  if (!target) return false;
  await ddb.send(
    new DeleteCommand({ TableName: table, Key: { userId, fechaHora: target.fechaHora } }),
  );
  return true;
}

export async function scanTable<T>(table: string, limit?: number): Promise<T[]> {
  const result = await ddb.send(new ScanCommand({ TableName: table, Limit: limit }));
  return (result.Items as T[]) ?? [];
}

/** Últimos N items de un GSI (orden desc por sk) */
export async function queryGsi<T>(
  table: string,
  pkName: string,
  pkValue: string,
  skName: string,
  options?: { limit?: number; ascending?: boolean },
): Promise<T[]> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: table,
      IndexName: "gsi1",
      KeyConditionExpression: "#p = :pv",
      ExpressionAttributeNames: { "#p": pkName },
      ExpressionAttributeValues: { ":pv": pkValue },
      ScanIndexForward: options?.ascending ?? false,
      Limit: options?.limit,
    }),
  );
  return (result.Items as T[]) ?? [];
}

/**
 * Un dispositivo (endpoint) solo puede pertenecer a UN usuario.
 * Elimina registros del mismo endpoint bajo otros userIds para evitar
 * pushes dobles cuando la misma persona inicia sesión con varias cuentas.
 */
export async function deleteEndpointOtherUsers(userId: string, endpoint: string): Promise<void> {
  const result = await ddb.send(
    new ScanCommand({
      TableName: T.pushsubs(),
      FilterExpression: "#ep = :ep AND #u <> :uid",
      ExpressionAttributeNames: { "#ep": "endpoint", "#u": "userId" },
      ExpressionAttributeValues: { ":ep": endpoint, ":uid": userId },
      ProjectionExpression: "userId, endpoint",
    }),
  );
  const rows = (result.Items as { userId: string; endpoint: string }[] | undefined) ?? [];
  for (const row of rows) {
    await ddb
      .send(
        new DeleteCommand({
          TableName: T.pushsubs(),
          Key: { userId: row.userId, endpoint: row.endpoint },
        }),
      )
      .catch(() => undefined);
  }
}

export interface UpdateFields {
  [attr: string]: number | string | boolean | undefined;
}

/** Actualiza campos planos sobre una clave arbitraria */
export async function updateItemFields(
  table: string,
  key: Record<string, unknown>,
  fields: UpdateFields,
): Promise<void> {
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};
  const sets: string[] = [];
  entries.forEach(([name, value], i) => {
    names[`#f${i}`] = name;
    values[`:v${i}`] = value;
    sets.push(`#f${i} = :v${i}`);
  });
  await ddb.send(
    new UpdateCommand({
      TableName: table,
      Key: key,
      UpdateExpression: `SET ${sets.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    }),
  );
}

/**
 * Escritura masiva en DynamoDB. Divide en chunks de 25 (límite de BatchWriteItem).
 * No es transaccional — si un chunk falla parcialmente, se lanza el error.
 */
export async function batchPutItems<T extends Record<string, unknown>>(
  table: string,
  items: T[],
): Promise<void> {
  const BATCH_SIZE = 25;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE);
    await ddb.send(
      new BatchWriteCommand({
        RequestItems: {
          [table]: chunk.map((item) => ({ PutRequest: { Item: item } })),
        },
      }),
    );
  }
}
