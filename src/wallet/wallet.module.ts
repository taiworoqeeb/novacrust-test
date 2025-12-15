import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { WalletModel } from './entities/wallet.entity';
import { TransactionModel } from './entities/transaction.entity';
import { IdempotencyKeyModel } from './entities/idempotency-key.entity';

@Module({
  imports: [SequelizeModule.forFeature([WalletModel, TransactionModel, IdempotencyKeyModel])],
  controllers: [WalletController],
  providers: [WalletService],
})
export class WalletModule {}

