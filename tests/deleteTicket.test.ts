import { handler as deleteTicketHandler } from "../src/handlers/deleteTicket";
import { ddb } from "../src/lib/dynamo";
import { mockClient } from "aws-sdk-client-mock";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyResult } from "aws-lambda";
import { createEvent, setup } from "../src/helpers/helpersTest";

const ddbMock = mockClient(ddb);

describe("deleteTicket Lambda", () => {
  beforeAll(() => {
    process.env.AUTH_TOKEN = "test-token";
  });
  beforeEach(() => ddbMock.reset());

  it("should return 200 and deleted ticket", async () => {
    const deletedItem = { id: "123", passengerName: "John" };
    ddbMock.on(DeleteCommand).resolves({ Attributes: deletedItem });

    const { context, callback } = setup();
    const event = createEvent({}, "test-token", "123");

    const result = (await deleteTicketHandler(event, context, callback)) as APIGatewayProxyResult;
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.id).toBe("123");
  });

  it("should return 404 if ticket not found", async () => {
    ddbMock.on(DeleteCommand).resolves({});

    const { context, callback } = setup();
    const event = createEvent({}, "test-token", "notfound");

    const result = (await deleteTicketHandler(event, context, callback)) as APIGatewayProxyResult;
    expect(result.statusCode).toBe(404);
  });

  it("should return 400 if id missing", async () => {
    const { context, callback } = setup();
    const event = createEvent({}, "test-token"); // sin id

    const result = (await deleteTicketHandler(event, context, callback)) as APIGatewayProxyResult;
    expect(result.statusCode).toBe(400);
  });
});
