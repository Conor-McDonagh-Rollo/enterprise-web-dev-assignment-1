import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import * as jwt from "jsonwebtoken";

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const token = event.headers?.Authorization?.replace("Bearer ", "");

  if (!token) {
    return { statusCode: 400, body: JSON.stringify({ message: "No token provided" }) };
  }

  const decoded = jwt.decode(token) as jwt.JwtPayload;

  await docClient.send(new PutCommand({
    TableName: process.env.INVALIDATED_TOKENS_TABLE,
    Item: {
      token,
      expiry: decoded?.exp ?? Math.floor(Date.now() / 1000) + 3600,
    },
  }));

  return { statusCode: 200, body: JSON.stringify({ message: "Logged out successfully" }) };
};
