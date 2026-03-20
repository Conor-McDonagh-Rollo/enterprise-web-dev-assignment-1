import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient, ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const movieId = Number(event.pathParameters?.movieId);
  if (!movieId || isNaN(movieId)) {
    return { statusCode: 400, body: JSON.stringify({ message: "Invalid movieId" }) };
  }

  const reviewerId = event.requestContext.authorizer?.userId;
  const body = JSON.parse(event.body ?? "{}") as Record<string, unknown>;
  const { text } = body;

  if (!text) {
    return { statusCode: 400, body: JSON.stringify({ message: "text is required" }) };
  }

  try {
    await docClient.send(new UpdateCommand({
      TableName: process.env.TABLE_NAME,
      Key: { movieId, reviewerId },
      UpdateExpression: "SET #t = :text",
      ExpressionAttributeNames: { "#t": "text" },
      ExpressionAttributeValues: { ":text": text },
      ConditionExpression: "attribute_exists(movieId)",
    }));
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      return { statusCode: 404, body: JSON.stringify({ message: "Review not found" }) };
    }
    throw err;
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Review updated" }),
  };
};
