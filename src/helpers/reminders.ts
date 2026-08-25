import { QueryCommand, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../lib/dynamo";
import { sendPushToUser } from "./push";
import {
  MomentKinds,
  pickMessageForKinds,
  randomReencuentro,
  randomVuelvePronto,
} from "./motivationalpools";

/**
 * Motor de recordatorios automáticos.
 * Dos públicos:
 *  - ACTIVOS (sesión iniciada): los 8 momentos diarios + guardia del viernes.
 *  - INVITADOS (sesión cerrada): 2 mensajes al día tipo "vuelve pronto".
 */

const SUBS_TABLE = () => process.env.KETO_PUSHSUBS_TABLE!;
const WEIGHTS_TABLE = () => process.env.KETO_WEIGHTS_TABLE!;
const MEALS_TABLE = () => process.env.KETO_MEALS_TABLE!;

const DAY_MS = 1000 * 60 * 60 * 24;
/** Días sin registrar para considerar al usuario "desaparecido" */
export const INACTIVO_DESDE_DIAS = 4;
/** Días que sobrevive una suscripción en modo invitado antes de purgarse */
const INVITADO_PURGA_DIAS = 30;

interface SubRow {
  userId: string;
  endpoint: string;
  createdAt?: string;
  /** "invitado" = sesión cerrada; ausente/"activo" = sesión iniciada */
  estado?: string;
  guestAt?: string;
}

async function fetchSubRows(): Promise<SubRow[]> {
  const result = await ddb.send(new ScanCommand({ TableName: SUBS_TABLE() }));
  return (result.Items as SubRow[] | undefined) ?? [];
}

/** Un endpoint (dispositivo) recibe UN solo push: gana el registro más reciente */
function dedupeByEndpoint(rows: SubRow[]): SubRow[] {
  const latest = new Map<string, SubRow>();
  for (const row of rows) {
    const prev = latest.get(row.endpoint);
    if (!prev || (row.createdAt ?? "") > (prev.createdAt ?? "")) {
      latest.set(row.endpoint, row);
    }
  }
  return [...latest.values()];
}

/** Última actividad del usuario (peso o comida), o null si nunca registró */
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
 * Momentos del día → SOLO dispositivos con sesión iniciada.
 * `kinds` son los enfoques candidatos del horario (elige 1 al azar).
 * Sustituye el mensaje por re-encuentro si el usuario está inactivo.
 */
export async function broadcastDaily(kinds: MomentKinds[]): Promise<void> {
  const rows = dedupeByEndpoint(
    (await fetchSubRows()).filter((r) => r.estado !== "invitado"),
  );
  const userIds = [...new Set(rows.map((r) => r.userId))];
  console.log(`broadcastDaily(${kinds.join("/")}): ${userIds.length} suscriptores activos`);

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

/**
 * "Vuelve pronto" → SOLO dispositivos con sesión cerrada (estado=invitado).
 * Se ejecuta 2 veces al día (mañana y tarde). Purga suscripciones invitadas
 * con más de INVITADO_PURGA_DIAS días.
 */
export async function broadcastGuest(): Promise<void> {
  const invitados = dedupeByEndpoint(
    (await fetchSubRows()).filter((r) => r.estado === "invitado"),
  );
  console.log(`broadcastGuest: ${invitados.length} dispositivos invitados`);

  const cutoff = Date.now() - INVITADO_PURGA_DIAS * DAY_MS;
  await Promise.all(
    invitados.map(async (row) => {
      try {
        // Purga de invitados muy viejos
        if (row.guestAt && Date.parse(row.guestAt) < cutoff) {
          await ddb
            .send(
              new DeleteCommand({
                TableName: SUBS_TABLE(),
                Key: { userId: row.userId, endpoint: row.endpoint },
              }),
            )
            .catch(() => undefined);
          console.log(`broadcastGuest: purgada suscripción vieja de ${row.userId}`);
          return;
        }
        await sendPushToUser(row.userId, randomVuelvePronto());
      } catch (err) {
        console.error(`broadcastGuest a ${row.userId} falló:`, err);
      }
    }),
  );
}
