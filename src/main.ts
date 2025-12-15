import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { HttpStatus, ValidationPipe, VersioningType } from "@nestjs/common";
import { AppModule } from "./app.module";
import { registerGlobalErrorHandlers } from "./utils/error-handler";
import { logger } from "./utils/logger";
import helmet from "helmet";
import * as compression from "compression";
import * as bodyParser from "body-parser";
import * as morgan from "morgan";
import { config } from "dotenv";
import { responseHandler } from "./utils";
import { ValidationError } from "class-validator";

config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    morgan(
      function (tokens, req, res) {
        return [
          tokens.method(req, res),
          tokens.url(req, res),
          tokens.status(req, res),
          tokens.res(req, res, "content-length"),
          "-",
          tokens["response-time"](req, res),
          "ms",
        ].join(" ");
      },
      {
        stream: {
          write: function (message: any) {
            logger.http(message);
            return true;
          },
        },
      },
    ),
  );

  app.enableVersioning({
    type: VersioningType.URI,
    prefix: "api/v",
  });

  app.use(helmet());
  app.enableCors();
  app.use(compression());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  app.useGlobalPipes(
    new ValidationPipe({
      forbidUnknownValues: false,
      transform: true,
      stopAtFirstError: true,
      exceptionFactory: (validationErrors: ValidationError[] = []) => {
        const getFirstConstraintMessage = (
          error: ValidationError,
        ): string | null => {
          if (error.constraints) {
            const keys = Object.keys(error.constraints);
            if (keys.length > 0) {
              return error.constraints[keys[0]];
            }
          }
          if (error.children && error.children.length > 0) {
            for (const child of error.children) {
              const message = getFirstConstraintMessage(child);
              if (message) return message;
            }
          }
          return null;
        };

        const message =
          getFirstConstraintMessage(validationErrors[0]) ?? "Validation failed";

        return responseHandler({
          status: false,
          statusCode: HttpStatus.BAD_REQUEST,
          message,
          data: {},
        });
      },
    }),
  );

  registerGlobalErrorHandlers(async () => {
    await app.close();
  });

  const port = process.env.PORT;
  await app.listen(port, () => {
    logger.info(`Wallet service running on http://localhost:${port}`);
  });
}

bootstrap();
