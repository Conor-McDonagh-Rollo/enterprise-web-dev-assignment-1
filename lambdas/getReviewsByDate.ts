import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const movieIdParam = event.queryStringParameters?.movie;
  const published = event.queryStringParameters?.published;

  const movieId = Number(movieIdParam);
  if (!movieIdParam || !published || isNaN(movieId)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Query params \"movie\" (number) and \"published\" are required" }),
    };
  }

  // published may be a partial date like "1995-05", begins_with matches it
  const result = await docClient.send(new QueryCommand({
    TableName: process.env.TABLE_NAME,
    KeyConditionExpression: "movieId = :movieId",
    FilterExpression: "begins_with(#d, :published)",
    ExpressionAttributeNames: { "#d": "date" },
    ExpressionAttributeValues: {
      ":movieId": movieId,
      ":published": published,
    },
  }));

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reviews: result.Items ?? [] }),
  };
};
