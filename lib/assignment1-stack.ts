import * as cdk from "aws-cdk-lib/core";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";

const JWT_SECRET = "superdupersecret2026";

export class Assignment1Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // SSM Parameter (verify CDK works)
    new ssm.StringParameter(this, "HelloParameter", {
      parameterName: "/assignment1/hello",
      stringValue: "Hello from CDK!",
      description: "Test parameter to verify CDK deployment",
    });

    // DynamoDB tables
    const reviewsTable = new dynamodb.Table(this, "ReviewsTable", {
      partitionKey: { name: "movieId", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "reviewerId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const usersTable = new dynamodb.Table(this, "UsersTable", {
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Shared layer with common dependencies
    const sharedLayer = new lambda.LayerVersion(this, "SharedLayer", {
      code: lambda.Code.fromAsset("layers/shared"),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
    });

    // Shared Lambda config
    const nodeProps = {
      runtime: lambda.Runtime.NODEJS_20_X,
      layers: [sharedLayer],
      bundling: { externalModules: ["@aws-sdk/*", "jsonwebtoken", "bcryptjs"] },
    };

    // Lambdas
    const getMovieReviewsFn = new lambdaNode.NodejsFunction(this, "GetMovieReviews", {
      entry: "lambdas/getMovieReviews.ts",
      environment: { TABLE_NAME: reviewsTable.tableName },
      ...nodeProps,
    });

    const getReviewsByDateFn = new lambdaNode.NodejsFunction(this, "GetReviewsByDate", {
      entry: "lambdas/getReviewsByDate.ts",
      environment: { TABLE_NAME: reviewsTable.tableName },
      ...nodeProps,
    });

    const addMovieReviewFn = new lambdaNode.NodejsFunction(this, "AddMovieReview", {
      entry: "lambdas/addMovieReview.ts",
      environment: { TABLE_NAME: reviewsTable.tableName },
      ...nodeProps,
    });

    const updateMovieReviewFn = new lambdaNode.NodejsFunction(this, "UpdateMovieReview", {
      entry: "lambdas/updateMovieReview.ts",
      environment: { TABLE_NAME: reviewsTable.tableName },
      ...nodeProps,
    });

    reviewsTable.grantReadData(getMovieReviewsFn);
    reviewsTable.grantReadData(getReviewsByDateFn);
    reviewsTable.grantWriteData(addMovieReviewFn);
    reviewsTable.grantReadWriteData(updateMovieReviewFn);

    // Auth lambdas
    const authEnv = { USERS_TABLE: usersTable.tableName, JWT_SECRET };

    const registerFn = new lambdaNode.NodejsFunction(this, "Register", {
      entry: "lambdas/auth/register.ts",
      environment: authEnv,
      ...nodeProps,
    });

    const loginFn = new lambdaNode.NodejsFunction(this, "Login", {
      entry: "lambdas/auth/login.ts",
      environment: authEnv,
      ...nodeProps,
    });

    const logoutFn = new lambdaNode.NodejsFunction(this, "Logout", {
      entry: "lambdas/auth/logout.ts",
      ...nodeProps,
    });

    const authorizerFn = new lambdaNode.NodejsFunction(this, "Authorizer", {
      entry: "lambdas/auth/authorizer.ts",
      environment: { JWT_SECRET },
      ...nodeProps,
    });

    usersTable.grantReadWriteData(registerFn);
    usersTable.grantReadData(loginFn);

    // JWT authorizer (used on POST and PUT)
    const jwtAuthorizer = new apigw.TokenAuthorizer(this, "JwtAuthorizer", {
      handler: authorizerFn,
      identitySource: "method.request.header.Authorization",
      resultsCacheTtl: cdk.Duration.seconds(0),
    });

    const authOptions = {
      authorizer: jwtAuthorizer,
      authorizationType: apigw.AuthorizationType.CUSTOM,
    };

    // Movie Reviews API
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
    // /movies/reviews - POST (auth required)
    moviesResource.addResource("reviews")
      .addMethod("POST", new apigw.LambdaIntegration(addMovieReviewFn), authOptions);

    // /movies/{movieId}/reviews - GET (public), PUT (auth required)
    const movieReviewsResource = moviesResource.addResource("{movieId}").addResource("reviews");
    movieReviewsResource.addMethod("GET", new apigw.LambdaIntegration(getMovieReviewsFn));
    movieReviewsResource.addMethod("PUT", new apigw.LambdaIntegration(updateMovieReviewFn), authOptions);

    // /reviews - GET (public)
    api.root.addResource("reviews")
      .addMethod("GET", new apigw.LambdaIntegration(getReviewsByDateFn));

    // Auth API
    const authApi = new apigw.RestApi(this, "AuthApi", {
      restApiName: "Auth API",
      deployOptions: { stageName: "dev" },
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
      },
    });

    const authResource = authApi.root.addResource("auth");
    authResource.addResource("register").addMethod("POST", new apigw.LambdaIntegration(registerFn));
    authResource.addResource("login").addMethod("POST", new apigw.LambdaIntegration(loginFn));
    authResource.addResource("logout").addMethod("POST", new apigw.LambdaIntegration(logoutFn));

    new cdk.CfnOutput(this, "MovieReviewsApiUrl", {
      value: api.url,
      description: "Movie Reviews API base URL",
    });

    new cdk.CfnOutput(this, "AuthApiUrl", {
      value: authApi.url,
      description: "Auth API base URL",
    });
  }
}
