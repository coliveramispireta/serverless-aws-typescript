import { handler as createMealHandler } from "../../src/handlers/keto/createMeal";
import { ddb } from "../../src/lib/dynamo";
import { mockClient } from "aws-sdk-client-mock";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyResult } from "aws-lambda";
import { createAuthEvent, setup } from "../../src/helpers/helpersTest";

const ddbMock = mockClient(ddb);

describe("createMeal Lambda (KetoCoach)", () => {
  beforeAll(() => {
    process.env.KETO_MEALS_TABLE = "test-meals";
    process.env.ALLOWED_ORIGINS = "http://localhost:3000";
    process.env.COACH_EMAILS = "";
    process.env.COACH_GROUP = "coaches";
  });

  beforeEach(() => ddbMock.reset());

  it("should return 201 and the created meal for an authenticated user", async () => {
    ddbMock.on(PutCommand).resolves({});

    const { context, callback } = setup();
    const event = createAuthEvent({
      body: {
        alimento: "Aguacate",
        gramos: 100,
        comida: "desayuno",
        fechaHora: new Date().toISOString(),
      },
      userId: "user-123",
    });

    const result = (await createMealHandler(event, context, callback)) as APIGatewayProxyResult;
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(201);
    expect(body.alimento).toBe("Aguacate");
    expect(body.gramos).toBe(100);
    expect(body.userId).toBe("user-123");
    expect(body.id).toBeDefined();
  });

  it("should ignore userId sent in the body (identity comes from token)", async () => {
    ddbMock.on(PutCommand).resolves({});

    const { context, callback } = setup();
    const event = createAuthEvent({
      body: {
        alimento: "Pollo",
        gramos: 200,
        fechaHora: new Date().toISOString(),
        userId: "otro-usuario",
      },
      userId: "user-123",
    });

    const result = (await createMealHandler(event, context, callback)) as APIGatewayProxyResult;
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(201);
    expect(body.userId).toBe("user-123");
  });

  it("should return 401 without Cognito claims", async () => {
    const { context, callback } = setup();
    const event = createAuthEvent({});
    delete (event.requestContext as any).authorizer;

    const result = (await createMealHandler(event, context, callback)) as APIGatewayProxyResult;
    expect(result.statusCode).toBe(401);
  });

  it("should return 400 when required fields are missing", async () => {
    const { context, callback } = setup();
    const event = createAuthEvent({ body: { alimento: "" }, userId: "user-123" });

    const result = (await createMealHandler(event, context, callback)) as APIGatewayProxyResult;
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(400);
    expect(body.fields).toContain("gramos");
    expect(body.fields).toContain("fechaHora");
  });
});
