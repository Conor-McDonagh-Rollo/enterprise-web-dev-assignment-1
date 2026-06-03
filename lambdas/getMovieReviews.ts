import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const CORS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const movieId = Number(event.pathParameters?.movieId);
  if (!movieId || isNaN(movieId)) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ message: "Invalid movieId" }) };
  }

  const reviewerId = event.queryStringParameters?.reviewer;

  let keyCondition = "movieId = :movieId";
  const expressionValues: Record<string, unknown> = { ":movieId": movieId };

  if (reviewerId) {
    keyCondition += " AND reviewerId = :reviewerId";
    expressionValues[":reviewerId"] = reviewerId;
  }

  const result = await docClient.send(new QueryCommand({
    TableName: process.env.TABLE_NAME,
    KeyConditionExpression: keyCondition,
    ExpressionAttributeValues: expressionValues,
  }));

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({ reviews: result.Items ?? [] }),
  };
};
