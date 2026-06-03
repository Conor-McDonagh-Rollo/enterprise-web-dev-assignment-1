import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient, ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const CORS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const reviewerId = event.requestContext.authorizer?.userId;
  const body = JSON.parse(event.body ?? "{}") as Record<string, unknown>;
  const { movieId, date, text } = body;

  if (!movieId || !date || !text) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ message: "movieId, date, and text are required" }),
    };
  }

  try {
    await docClient.send(new PutCommand({
      TableName: process.env.TABLE_NAME,
      Item: { movieId, reviewerId, date, text },
      ConditionExpression: "attribute_not_exists(movieId)",
    }));
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      return { statusCode: 409, headers: CORS, body: JSON.stringify({ message: "Review already exists" }) };
    }
    throw err;
  }

  return {
    statusCode: 201,
    headers: CORS,
    body: JSON.stringify({ message: "Review added" }),
  };
};
