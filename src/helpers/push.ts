import webpush from "web-push";
import { QueryCommand, DeleteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../lib/dynamo";

/**
 * Envío de Web Push (VAPID) a todos los dispositivos de un usuario.
 * Si las claves VAPID no están configuradas en el entorno, es no-op silencioso:
 * el sistema funciona sin notificaciones hasta que se creen los parámetros SSM.
 */

const SUBS_TABLE = () => process.env.KETO_PUSHSUBS_TABLE!;

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    console.warn("push: VAPID keys no configuradas; notificaciones desactivadas");
    return false;
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:contacto@ketoflow.app",
    publicKey,
    privateKey,
  );
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
}

interface StoredSubscription {
  userId: string;
  endpoint: string;
  p256dh?: string;
  auth?: string;
}

/** Envía una notificación a TODOS los dispositivos registrados del usuario. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;

  try {
    const result = await ddb.send(
      new QueryCommand({
        TableName: SUBS_TABLE(),
        KeyConditionExpression: "#u = :uid",
        ExpressionAttributeNames: { "#u": "userId" },
        ExpressionAttributeValues: { ":uid": userId },
      }),
    );

    const subs = (result.Items as StoredSubscription[] | undefined) ?? [];
    if (subs.length === 0) return;

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh!, auth: sub.auth! } },
            JSON.stringify(payload),
            { TTL: 86400 },
          );
        } catch (err) {
          // Suscripción muerta (usuario borró permiso/desinstaló): limpiar
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await ddb
              .send(
                new DeleteCommand({
                  TableName: SUBS_TABLE(),
                  Key: { userId, endpoint: sub.endpoint },
                }),
              )
              .catch(() => undefined);
          } else {
            console.warn("push send failed:", statusCode);
          }
        }
      }),
    );
  } catch (err) {
    console.error("sendPushToUser error:", err);
  }
}

/** 🔔 Envía una notificación a TODOS los usuarios suscritos (ej. flyer del coach). */
export async function sendPushToAll(payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;

  try {
    const result = await ddb.send(
      new ScanCommand({
        TableName: SUBS_TABLE(),
        ProjectionExpression: "userId",
      }),
    );
    const items = (result.Items as { userId: string }[] | undefined) ?? [];
    const userIds = [...new Set(items.map((i) => i.userId))];
    console.log(`sendPushToAll: ${userIds.length} destinatarios`);

    await Promise.all(userIds.map((uid) => sendPushToUser(uid, payload).catch(() => undefined)));
  } catch (err) {
    console.error("sendPushToAll error:", err);
  }
}
