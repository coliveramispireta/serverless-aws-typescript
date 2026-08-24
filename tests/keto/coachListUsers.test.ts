import { handler as coachListUsersHandler } from "../../src/handlers/keto/coachListUsers";
import { ddb } from "../../src/lib/dynamo";
import { mockClient } from "aws-sdk-client-mock";
import { QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyResult } from "aws-lambda";
import { createAuthEvent, setup } from "../../src/helpers/helpersTest";

const ddbMock = mockClient(ddb);

describe("coachListUsers Lambda (KetoCoach)", () => {
  beforeAll(() => {
    process.env.KETO_USERS_TABLE = "test-users";
    process.env.KETO_WEIGHTS_TABLE = "test-weights";
    process.env.KETO_MEALS_TABLE = "test-meals";
    process.env.ALLOWED_ORIGINS = "http://localhost:3000";
    process.env.COACH_GROUP = "coaches";
    process.env.COACH_EMAILS = "coach@test.com";
  });

  beforeEach(() => ddbMock.reset());

  it("should return 403 for a non-coach user", async () => {
    const { context, callback } = setup();
    const event = createAuthEvent({ userId: "user-1", email: "user@test.com" });

    const result = (await coachListUsersHandler(event, context, callback)) as APIGatewayProxyResult;
    expect(result.statusCode).toBe(403);
  });

  it("should allow a user whose email is in COACH_EMAILS", async () => {
    ddbMock
      .on(ScanCommand)
      .resolves({
        Items: [
          {
            userId: "user-9",
            email: "user9@test.com",
            nombre: "Usuario Nueve",
            createdAt: new Date().toISOString(),
          },
        ],
      })
      .on(QueryCommand)
      .resolves({
        Items: [{ userId: "user-9", fechaHora: new Date().toISOString(), pesoKg: 90.5, id: "w1" }],
      });

    const { context, callback } = setup();
    const event = createAuthEvent({ userId: "coach-1", email: "coach@test.com" });
    const result = (await coachListUsersHandler(event, context, callback)) as APIGatewayProxyResult;
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].userId).toBe("user-9");
    expect(body[0].pesoActualKg).toBe(90.5);
  });
});
