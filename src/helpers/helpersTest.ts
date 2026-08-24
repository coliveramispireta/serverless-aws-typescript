import { APIGatewayProxyEvent, Context, Callback } from "aws-lambda";

// Devuelve un event simulado para Lambda
export function createEvent(
  body: Record<string, any> = {},
  token: string = "test-token",
  pathId?: string,
): APIGatewayProxyEvent {
  return {
    headers: {
      authorization: `Bearer ${token}`,
    },
    body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
    pathParameters: pathId ? { id: pathId } : undefined,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    queryStringParameters: null,
    path: "/dummy",
    httpMethod: "POST",
    isBase64Encoded: false,
    stageVariables: null,
    requestContext: {} as any,
    resource: "",
  } as APIGatewayProxyEvent;
}

/**
 * Evento simulado con identidad Cognito (User Pool Authorizer),
 * usado por los tests de los endpoints KetoCoach.
 */
export function createAuthEvent(options: {
  body?: Record<string, unknown>;
  userId?: string;
  email?: string;
  groups?: string[];
  name?: string;
  pathParams?: Record<string, string>;
  origin?: string;
  httpMethod?: string;
}): APIGatewayProxyEvent {
  const claims: Record<string, unknown> = {
    sub: options.userId ?? "user-123",
    email: options.email ?? "user@test.com",
    "cognito:groups": options.groups ?? [],
  };
  if (options.name) claims["name"] = options.name;

  return {
    headers: {
      ...(options.origin ? { Origin: options.origin } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    pathParameters: options.pathParams ?? null,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    queryStringParameters: null,
    path: "/dummy",
    httpMethod: options.httpMethod ?? "POST",
    isBase64Encoded: false,
    stageVariables: null,
    requestContext: {
      authorizer: { claims },
    } as any,
    resource: "",
  } as unknown as APIGatewayProxyEvent;
}

// Devuelve context y callback simulados
export function setup(): { context: Context; callback: Callback } {
  const context: Context = {} as any;
  const callback: Callback = {} as any;
  return { context, callback };
}
