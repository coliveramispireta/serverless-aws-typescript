import { QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../lib/dynamo";
import { sendPushToUser } from "./push";
import {
  MomentKinds,
  PushMessage,
  pickMessageForKinds,
  randomReencuentro,
} from "./motivationalpools";

/**
 * Motor de recordatorios automáticos.
 * Compartido por la Lambda programada cronMoments (EventBridge cron).
 */

const SUBS_TABLE = () => process.env.KETO_PUSHSUBS_TABLE!;
const WEIGHTS_TABLE = () => process.env.KETO_WEIGHTS_TABLE!;
const MEALS_TABLE = () => process.env.KETO_MEALS_TABLE!;

const DAY_MS = 1000 * 60 * 60 * 24;
/** Días sin registrar para considerar al usuario "desaparecido" */
export const INACTIVO_DESDE_DIAS = 4;

interface SubRow {
  userId: string;
  endpoint: string;
  createdAt?: string;
}

/**
 * IDs únicos de usuarios con notificaciones activas.
 * Un endpoint (dispositivo) debe recibir UN solo push aunque esté registrado
 * bajo varios usuarios: gana el registro más reciente (evita pushes dobles).
 */
async function allSubscriberIds(): Promise<string[]> {
  const result = await ddb.send(new ScanCommand({ TableName: SUBS_TABLE() }));
  const items = (result.Items as SubRow[] | undefined) ?? [];

  const ownerByEndpoint = new Map<string, { userId: string; createdAt: string }>();
  for (const it of items) {
    const prev = ownerByEndpoint.get(it.endpoint);
    if (!prev || (it.createdAt ?? "") > prev.createdAt) {
      ownerByEndpoint.set(it.endpoint, { userId: it.userId, createdAt: it.createdAt ?? "" });
    }
  }
  return [...new Set([...ownerByEndpoint.values()].map((v) => v.userId))];
}

/** Fecha (ISO) del último registro del usuario, o null si nunca */
async function lastActivityDate(userId: string): Promise<string | null> {
  const [w, m] = await Promise.all([
    ddb
      .send(
        new QueryCommand({
          TableName: WEIGHTS_TABLE(),
          KeyConditionExpression: "#u = :uid",
          ExpressionAttributeNames: { "#u": "userId" },
          ExpressionAttributeValues: { ":uid": userId },
          ScanIndexForward: false,
          Limit: 1,
        }),
      )
      .catch(() => ({ Items: [] })),
    ddb
      .send(
        new QueryCommand({
          TableName: MEALS_TABLE(),
          KeyConditionExpression: "#u = :uid",
          ExpressionAttributeNames: { "#u": "userId" },
          ExpressionAttributeValues: { ":uid": userId },
          ScanIndexForward: false,
          Limit: 1,
        }),
      )
      .catch(() => ({ Items: [] })),
  ]);

  const dates = [
    ((w.Items as { fechaHora?: string }[] | undefined) ?? [])[0]?.fechaHora,
    ((m.Items as { fechaHora?: string }[] | undefined) ?? [])[0]?.fechaHora,
  ].filter((v): v is string => !!v);

  return dates.length > 0 ? dates.sort()[dates.length - 1] : null;
}

function isInactive(lastDate: string | null): boolean {
  if (!lastDate) return false; // nunca registró: no molestar con "te extrañamos"
  return Date.now() - new Date(lastDate).getTime() >= INACTIVO_DESDE_DIAS * DAY_MS;
}

/**
 * Envía a todos los suscriptores el mensaje del momento indicado.
 * `kinds` son los enfoques candidatos del horario (elige 1 al azar).
 * Sustituye el mensaje por re-encuentro si el usuario está inactivo.
 */
export async function broadcastDaily(kinds: MomentKinds[]): Promise<void> {
  const userIds = await allSubscriberIds();
  console.log(`broadcastDaily(${kinds.join("/")}): ${userIds.length} suscriptores`);

  await Promise.all(
    userIds.map(async (userId) => {
      try {
        const lastDate = await lastActivityDate(userId);
        const message = isInactive(lastDate) ? randomReencuentro() : pickMessageForKinds(kinds);
        await sendPushToUser(userId, message);
      } catch (err) {
        console.error(`broadcast a ${userId} falló:`, err);
      }
    }),
  );
}
