import { handler as updateTicketHandler } from "../src/handlers/updateTicket";
import { ddb } from "../src/lib/dynamo";
import { mockClient } from "aws-sdk-client-mock";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyResult } from "aws-lambda";
import { createEvent, setup } from "../src/helpers/helpersTest";

const ddbMock = mockClient(ddb);

describe("updateTicket Lambda", () => {
  beforeAll(() => {
    process.env.AUTH_TOKEN = "test-token";
  });
  beforeEach(() => ddbMock.reset());

  it("should return 200 and updated ticket", async () => {
    const updatedItem = { id: "123", passengerName: "Jane" };
    ddbMock.on(UpdateCommand).resolves({ Attributes: updatedItem });

    const { context, callback } = setup();
    const event = createEvent({ passengerName: "Jane" }, "test-token", "123");

    const result = (await updateTicketHandler(event, context, callback)) as APIGatewayProxyResult;
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.passengerName).toBe("Jane");
  });

  it("should return 400 if id missing", async () => {
    const { context, callback } = setup();
    const event = createEvent({ passengerName: "Jane" }, "test-token"); // sin id

    const result = (await updateTicketHandler(event, context, callback)) as APIGatewayProxyResult;
    expect(result.statusCode).toBe(400);
  });

  it("should return 400 if body empty", async () => {
    const { context, callback } = setup();
    const event = createEvent({}, "test-token", "123"); // body vacío

    const result = (await updateTicketHandler(event, context, callback)) as APIGatewayProxyResult;
    expect(result.statusCode).toBe(400);
  });

  it("should return 404 if ticket not found", async () => {
    ddbMock.on(UpdateCommand).resolves({});

    const { context, callback } = setup();
    const event = createEvent({ passengerName: "Jane" }, "test-token", "notfound");

    const result = (await updateTicketHandler(event, context, callback)) as APIGatewayProxyResult;
    expect(result.statusCode).toBe(404);
  });
});
