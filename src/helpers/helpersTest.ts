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

// Devuelve context y callback simulados
export function setup(): { context: Context; callback: Callback } {
  const context: Context = {} as any;
  const callback: Callback = {} as any;
  return { context, callback };
}
