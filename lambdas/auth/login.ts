import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const CORS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const body = JSON.parse(event.body ?? "{}");
  const { userId, password } = body;

  if (!userId || !password) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ message: "userId and password are required" }) };
  }

  const result = await docClient.send(new GetCommand({
    TableName: process.env.USERS_TABLE,
    Key: { userId },
  }));

  if (!result.Item || !(await bcrypt.compare(password, result.Item.passwordHash))) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ message: "Invalid credentials" }) };
  }

  const token = jwt.sign(
    { userId, name: result.Item.name },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  );

  return { statusCode: 200, headers: CORS, body: JSON.stringify({ token }) };
};
