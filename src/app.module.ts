import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { WalletModule } from "./wallet/wallet.module";
import { WalletModel } from "./wallet/entities/wallet.entity";
import { TransactionModel } from "./wallet/entities/transaction.entity";
import { IdempotencyKeyModel } from "./wallet/entities/idempotency-key.entity";
import { config } from "dotenv";
import { ConfigModule, ConfigService } from "@nestjs/config";
import * as joi from "joi";

config();
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: joi.object({
        DB_HOST: joi.string().required(),
        DB_PORT: joi.string().required(),
        DB_USER: joi.string().required(),
        DB_PASSWORD: joi.string().required(),
        DB_NAME: joi.string().required(),
        PORT: joi.string().optional().default(3000),
      }),
    }),
    SequelizeModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        dialect: "postgres",
        host: configService.get("DB_HOST"),
        port: parseInt(configService.get("DB_PORT")),
        username: configService.get("DB_USER"),
        password: configService.get("DB_PASSWORD"),
        database: configService.get("DB_NAME"),
        autoLoadModels: true,
        synchronize: true,
        logging: false,
        pool: {
          max: 10,
          min: 0,
          acquire: 60000,
          idle: 10000,
        },
        models: [WalletModel, TransactionModel, IdempotencyKeyModel],
      }),
    }),
    WalletModule,
  ],
})
export class AppModule {}
