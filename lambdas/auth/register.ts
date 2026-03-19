import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import * as bcrypt from "bcryptjs";

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const body = JSON.parse(event.body ?? "{}");
  const { userId, password, name } = body;

  if (!userId || !password || !name) {
    return { statusCode: 400, body: JSON.stringify({ message: "userId, password, and name are required" }) };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await docClient.send(new PutCommand({
      TableName: process.env.USERS_TABLE,
      Item: { userId, passwordHash, name },
      ConditionExpression: "attribute_not_exists(userId)",
    }));
  } catch (e: any) {
    if (e.name === "ConditionalCheckFailedException") {
      return { statusCode: 409, body: JSON.stringify({ message: "User already exists" }) };
    }
    throw e;
  }

  return { statusCode: 201, body: JSON.stringify({ message: "User registered successfully" }) };
};
