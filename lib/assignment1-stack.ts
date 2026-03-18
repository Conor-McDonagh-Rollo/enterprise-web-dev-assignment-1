import * as cdk from "aws-cdk-lib/core";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";

export class Assignment1Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // SSM Parameter (verify CDK works)
    new ssm.StringParameter(this, "HelloParameter", {
      parameterName: "/assignment1/hello",
      stringValue: "Hello from CDK!",
      description: "Test parameter to verify CDK deployment",
    });

    // DynamoDB
    const reviewsTable = new dynamodb.Table(this, "ReviewsTable", {
      partitionKey: { name: "movieId", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "reviewerId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda
    const nodeProps = {
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: { TABLE_NAME: reviewsTable.tableName },
    };

    const getMovieReviewsFn = new lambdaNode.NodejsFunction(this, "GetMovieReviews", {
      entry: "lambdas/getMovieReviews.ts",
      ...nodeProps,
    });

    const getReviewsByDateFn = new lambdaNode.NodejsFunction(this, "GetReviewsByDate", {
      entry: "lambdas/getReviewsByDate.ts",
      ...nodeProps,
    });

    const addMovieReviewFn = new lambdaNode.NodejsFunction(this, "AddMovieReview", {
      entry: "lambdas/addMovieReview.ts",
      ...nodeProps,
    });

    const updateMovieReviewFn = new lambdaNode.NodejsFunction(this, "UpdateMovieReview", {
      entry: "lambdas/updateMovieReview.ts",
      ...nodeProps,
    });

    reviewsTable.grantReadData(getMovieReviewsFn);
    reviewsTable.grantReadData(getReviewsByDateFn);
    reviewsTable.grantWriteData(addMovieReviewFn);
    reviewsTable.grantReadWriteData(updateMovieReviewFn);

    // API Gateway
    const api = new apigw.RestApi(this, "MovieReviewsApi", {
      restApiName: "Movie Reviews API",
      deployOptions: { stageName: "dev" },
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
      },
    });

    // /movies
    const moviesResource = api.root.addResource("movies");
    // /movies/reviews - POST
    moviesResource.addResource("reviews")
      .addMethod("POST", new apigw.LambdaIntegration(addMovieReviewFn));

    // /movies/{movieId}/reviews - GET, PUT
    const movieReviewsResource = moviesResource
      .addResource("{movieId}")
      .addResource("reviews");
    movieReviewsResource.addMethod("GET", new apigw.LambdaIntegration(getMovieReviewsFn));
    movieReviewsResource.addMethod("PUT", new apigw.LambdaIntegration(updateMovieReviewFn));

    // /reviews - GET
    api.root.addResource("reviews")
      .addMethod("GET", new apigw.LambdaIntegration(getReviewsByDateFn));

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "Movie Reviews API base URL",
    });
  }
}
