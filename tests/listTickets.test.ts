import { handler as listTicketsHandler } from "../src/handlers/listTickets";
import { ddb } from "../src/lib/dynamo";
import { mockClient } from "aws-sdk-client-mock";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyResult } from "aws-lambda";
import { createEvent, setup } from "../src/helpers/helpersTest";

const ddbMock = mockClient(ddb);

describe("listTickets Lambda", () => {
  beforeAll(() => {
    process.env.AUTH_TOKEN = "test-token";
  });
  beforeEach(() => ddbMock.reset());

  it("should return 200 and list of tickets", async () => {
    const fakeItems = [{ id: "1" }, { id: "2" }];
    ddbMock.on(ScanCommand).resolves({ Items: fakeItems, Count: fakeItems.length });

    const { context, callback } = setup();
    const event = createEvent({}, "test-token");

    const result = (await listTicketsHandler(event, context, callback)) as APIGatewayProxyResult;
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.count).toBe(2);
    expect(body.items.length).toBe(2);
  });

  it("should return 500 if Dynamo fails", async () => {
    ddbMock.on(ScanCommand).rejects(new Error("Dynamo error"));

    const { context, callback } = setup();
    const event = createEvent({}, "test-token");

    const result = (await listTicketsHandler(event, context, callback)) as APIGatewayProxyResult;
    expect(result.statusCode).toBe(500);
  });
});
