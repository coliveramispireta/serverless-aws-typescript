import { handler as createTicketHandler } from "../src/handlers/createTicket";
import { ddb } from "../src/lib/dynamo";
import { mockClient } from "aws-sdk-client-mock";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyResult } from "aws-lambda";
import { createEvent, setup } from "../src/helpers/helpersTest";

const ddbMock = mockClient(ddb);

describe("createTicket Lambda", () => {
  beforeAll(() => {
    process.env.AUTH_TOKEN = "test-token";
  });

  beforeEach(() => ddbMock.reset());

  it("should return 201 and the created ticket", async () => {
    ddbMock.on(PutCommand).resolves({}); // Mock DynamoDB put

    const { context, callback } = setup();
    const event = createEvent({
      passengerName: "John Doe",
      flightNumber: "AB123",
      origin: "LIM",
      destination: "JFK",
      seatNumber: "12A",
      price: 100,
    });

    const result = (await createTicketHandler(event, context, callback)) as APIGatewayProxyResult;
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(201);
    expect(body.passengerName).toBe("John Doe");
    expect(body.id).toBeDefined();
  });

  it("should return 401 if token is invalid", async () => {
    const { context, callback } = setup();
    const event = createEvent({ passengerName: "John" }, "wrong-token");

    const result = (await createTicketHandler(event, context, callback)) as APIGatewayProxyResult;
    expect(result.statusCode).toBe(401);
  });

  it("should return 400 if body is missing", async () => {
    const { context, callback } = setup();
    const event = createEvent();

    const result = (await createTicketHandler(event, context, callback)) as APIGatewayProxyResult;
    expect(result.statusCode).toBe(400);
  });
});
