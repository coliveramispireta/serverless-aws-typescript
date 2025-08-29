import { handler as getTicketHandler } from "../src/handlers/getTicket";
import { ddb } from "../src/lib/dynamo";
import { mockClient } from "aws-sdk-client-mock";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyResult } from "aws-lambda";
import { createEvent, setup } from "../src/helpers/helpersTest";

const ddbMock = mockClient(ddb);

describe("getTicket Lambda", () => {
  beforeAll(() => {
    process.env.AUTH_TOKEN = "test-token";
  });
  beforeEach(() => ddbMock.reset());

  it("should return 200 and the ticket", async () => {
    const fakeTicket = { id: "123", passengerName: "John Doe" };
    ddbMock.on(GetCommand).resolves({ Item: fakeTicket });

    const { context, callback } = setup();
    const event = createEvent({}, "test-token", "123"); // id en path

    const result = (await getTicketHandler(event, context, callback)) as APIGatewayProxyResult;
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.id).toBe("123");
  });

  it("should return 400 if id is missing", async () => {
    const { context, callback } = setup();
    const event = createEvent({}, "test-token"); // sin id

    const result = (await getTicketHandler(event, context, callback)) as APIGatewayProxyResult;
    expect(result.statusCode).toBe(400);
  });

  it("should return 404 if ticket not found", async () => {
    ddbMock.on(GetCommand).resolves({});

    const { context, callback } = setup();
    const event = createEvent({}, "test-token", "notfound");

    const result = (await getTicketHandler(event, context, callback)) as APIGatewayProxyResult;
    expect(result.statusCode).toBe(404);
  });
});
