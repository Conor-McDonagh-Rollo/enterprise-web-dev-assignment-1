import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const CORS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const movieIdParam = event.queryStringParameters?.movie;
  const published = event.queryStringParameters?.published;

  const movieId = Number(movieIdParam);
  if (!movieIdParam || !published || isNaN(movieId)) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ message: "Query params \"movie\" (number) and \"published\" are required" }),
    };
  }

  const result = await docClient.send(new QueryCommand({
    TableName: process.env.TABLE_NAME,
    IndexName: "date-index",
    KeyConditionExpression: "movieId = :movieId AND begins_with(#d, :published)",
    ExpressionAttributeNames: { "#d": "date" },
    ExpressionAttributeValues: {
      ":movieId": movieId,
      ":published": published,
    },
  }));

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({ reviews: result.Items ?? [] }),
  };
};
