import { APIGatewayProxyEvent } from "aws-lambda";

/**
 * Helpers de autorización para los endpoints KetoCoach.
 * La identidad proviene del Cognito User Pool Authorizer de API Gateway:
 * event.requestContext.authorizer.claims (sub, email, cognito:groups).
 * El userId del token es la única fuente de verdad: el body nunca define identidad.
 */

export interface AuthContext {
  userId: string;
  email: string;
  groups: string[];
}

export function getAuth(event: APIGatewayProxyEvent): AuthContext | null {
  // serverless-offline / pruebas pueden inyectar authorizer simulado
  const authorizer = (
    event.requestContext as unknown as {
      authorizer?: { claims?: Record<string, unknown> };
    }
  )?.authorizer;

  const claims = authorizer?.claims;
  const sub = claims?.sub ? String(claims.sub) : undefined;
  if (!sub) return null;

  const groupsRaw = claims?.["cognito:groups"];
  const groups = Array.isArray(groupsRaw)
    ? groupsRaw.map(String)
    : typeof groupsRaw === "string" && groupsRaw.length > 0
      ? groupsRaw.split(",")
      : [];

  return {
    userId: sub,
    email: claims?.email ? String(claims.email) : "",
    groups,
  };
}

/**
 * El rol coach se determina por:
 *  - pertenencia al grupo de Cognito "coaches", o
 *  - correo incluido en COACH_EMAILS (SSM, separados por coma).
 */
export function isCoach(ctx: AuthContext): boolean {
  if (ctx.groups.includes(process.env.COACH_GROUP ?? "coaches")) return true;
  const configured = (process.env.COACH_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return !!ctx.email && configured.includes(ctx.email.toLowerCase());
}
