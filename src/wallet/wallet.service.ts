import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { CreationAttributes, Transaction as SequelizeTx } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import { CreateWalletDto } from "./dto/create-wallet.dto";
import { FundWalletDto } from "./dto/fund-wallet.dto";
import { TransferDto } from "./dto/transfer.dto";
import { WalletModel } from "./entities/wallet.entity";
import {
  TransactionModel,
  TransactionType,
} from "./entities/transaction.entity";
import { IdempotencyKeyModel } from "./entities/idempotency-key.entity";
import { ResponseHandler, ResponsePayload, responseHandler } from "../utils";
import { UpdatePinDto } from "./dto/update-pin.dto";
import { ResetPinDto } from "./dto/reset-pin.dto";

type WalletResponse = {
  id: string;
  currency: "USD";
  balance: number;
  transactions: {
    id: string;
    type: TransactionType;
    amount: number;
    timestamp: string;
    balanceAfter: number;
    relatedWalletId?: string;
    idempotencyKey?: string;
  }[];
};

type ResponseEnvelope<T = unknown> = ResponsePayload<T>;

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(WalletModel) private readonly walletModel: typeof WalletModel,
    @InjectModel(TransactionModel)
    private readonly transactionModel: typeof TransactionModel,
    @InjectModel(IdempotencyKeyModel)
    private readonly idempotencyModel: typeof IdempotencyKeyModel,
    private readonly sequelize: Sequelize,
  ) {}

  async createWallet(dto: CreateWalletDto): Promise<ResponseHandler> {
    const wallet = await this.walletModel.create({
      currency: dto.currency ?? "USD",
      balance: 0,
      pin: dto.pin,
    });
    const data = this.serializeWallet(wallet, []);
    return responseHandler({
      status: true,
      statusCode: HttpStatus.CREATED,
      message: "Wallet created",
      data,
    });
  }

  async fundWallet(
    walletId: string,
    dto: FundWalletDto,
  ): Promise<ResponseHandler> {
    const cacheKey = this.idempotencyKey("fund", walletId, dto.idempotencyKey);
    const cached = await this.getIdempotent<ResponseEnvelope<WalletResponse>>(
      cacheKey,
    );
    if (cached){
      return cached
    };

    return this.sequelize.transaction(async (t) => {
      const wallet = await this.walletModel.findByPk(walletId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!wallet) {
        return responseHandler({
          status: false,
          statusCode: HttpStatus.BAD_REQUEST,
          message: "Wallet not found",
          data: {},
        })
      };

      const newBalance = wallet.balance + dto.amount;
      wallet.balance = newBalance;
      await wallet.save({ transaction: t });

      await this.transactionModel.create(
        {
          walletId,
          type: "FUND",
          amount: dto.amount,
          balanceAfter: newBalance,
          idempotencyKey: dto.idempotencyKey,
        } as CreationAttributes<TransactionModel>,
        { transaction: t },
      );

      const reloaded = await this.loadWalletWithTransactions(walletId, t);
      const response = responseHandler<WalletResponse>({
        status: true,
        statusCode: HttpStatus.OK,
        message: "Wallet funded",
        data: reloaded,
      });
      await this.storeIdempotent(cacheKey, response, t);
      return response;
    });
  }

  async transfer(
    dto: TransferDto,
  ): Promise<ResponseHandler> {
    if (dto.fromWalletId === dto.toWalletId) {
      return responseHandler({
        status: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: "Sender and receiver wallets cannot be the same",
        data: {},
      })
    }

    const cacheKey = this.idempotencyKey(
      "transfer",
      `${dto.fromWalletId}:${dto.toWalletId}`,
      dto.idempotencyKey,
    );
    const cached = await this.getIdempotent<
      ResponseEnvelope<{ from: WalletResponse; to: WalletResponse }>
    >(cacheKey);
    if (cached) return cached;

    return this.sequelize.transaction(async (t) => {
      const walletIds = [dto.fromWalletId, dto.toWalletId];
      const wallets = await this.walletModel.findAll({
        where: { id: walletIds },
        transaction: t,
        lock: t.LOCK.UPDATE,
        order: [["id", "ASC"]],
      });

      const from = wallets.find((w) => w.id === dto.fromWalletId);
      const to = wallets.find((w) => w.id === dto.toWalletId);
      if (!from || !to){
         return responseHandler({
          status: false,
          statusCode: HttpStatus.BAD_REQUEST,
          message: "Sender or receiver wallet not found",
          data: {},
        })
      }

      if (from.pin !== dto.pin){
        return responseHandler({
          status: false,
          statusCode: HttpStatus.BAD_REQUEST,
          message: "Invalid PIN",
          data: {},
        })
      }

      if (dto.amount > from.balance){
        return responseHandler({
          status: false,
          statusCode: HttpStatus.BAD_REQUEST,
          message: "Insufficient balance",
          data: {},
        })
      }


      from.balance = from.balance - dto.amount;
      to.balance = to.balance + dto.amount;

      await from.save({ transaction: t });
      await to.save({ transaction: t });

      const timestamp = new Date();
      await this.transactionModel.bulkCreate(
        [
          {
            walletId: from.id,
            type: "TRANSFER_OUT",
            amount: dto.amount,
            balanceAfter: from.balance,
            relatedWalletId: to.id,
            idempotencyKey: dto.idempotencyKey,
            createdAt: timestamp,
            updatedAt: timestamp,
          } as CreationAttributes<TransactionModel>,
          {
            walletId: to.id,
            type: "TRANSFER_IN",
            amount: dto.amount,
            balanceAfter: to.balance,
            relatedWalletId: from.id,
            idempotencyKey: dto.idempotencyKey,
            createdAt: timestamp,
            updatedAt: timestamp,
          } as CreationAttributes<TransactionModel>,
        ],
        { transaction: t },
      );

      const [fromReloaded, toReloaded] = await Promise.all([
        this.loadWalletWithTransactions(from.id, t),
        this.loadWalletWithTransactions(to.id, t),
      ]);

      const response = responseHandler({
        status: true,
        statusCode: 200,
        message: "Transfer complete",
        data: { from: fromReloaded, to: toReloaded },
      });
      await this.storeIdempotent(cacheKey, response, t);
      return response;
    });
  }

  async getWalletSnapshot(
    walletId: string,
  ): Promise<ResponseEnvelope<{ wallet: WalletResponse }>> {
    const wallet = await this.loadWalletWithTransactions(walletId);
    return responseHandler({
      status: true,
      statusCode: 200,
      message: "Wallet fetched",
      data: { wallet },
    });
  }

  async getTransactions(
    walletId: string,
  ): Promise<
    ResponseEnvelope<{ transactions: WalletResponse["transactions"] }>
  > {
    const wallet = await this.loadWalletWithTransactions(walletId);
    return responseHandler({
      status: true,
      statusCode: 200,
      message: "Transaction history fetched",
      data: { transactions: wallet.transactions },
    });
  }

  async updatePin(
    walletId: string,
    dto: UpdatePinDto,
  ): Promise<ResponseEnvelope<{ walletId: string }>> {
    const wallet = await this.walletModel.findByPk(walletId);
    if (!wallet) throw new NotFoundException("Wallet not found");
    if (wallet.pin !== dto.oldPin)
      throw new BadRequestException("Invalid current PIN");
    wallet.pin = dto.newPin;
    await wallet.save();
    return responseHandler({
      status: true,
      statusCode: 200,
      message: "PIN updated",
      data: { walletId },
    });
  }

  async resetPin(
    walletId: string,
    dto: ResetPinDto,
  ): Promise<ResponseEnvelope<{ walletId: string }>> {
    const wallet = await this.walletModel.findByPk(walletId);
    if (!wallet) throw new NotFoundException("Wallet not found");
    wallet.pin = dto.newPin;
    await wallet.save();
    return responseHandler({
      status: true,
      statusCode: 200,
      message: "PIN reset",
      data: { walletId },
    });
  }

  private idempotencyKey(
    action: string,
    identifier: string,
    key?: string,
  ): string | undefined {
    if (!key) return undefined;
    return `${action}:${identifier}:${key}`;
  }

  private async getIdempotent<T = unknown>(
    key?: string,
  ): Promise<T | undefined> {
    if (!key) return undefined;
    const record = await this.idempotencyModel.findByPk(key);
    return record?.response as T | undefined;
  }

  private async storeIdempotent(
    key: string | undefined,
    response: unknown,
    transaction: SequelizeTx,
  ) {
    if (!key) return;
    await this.idempotencyModel.findOrCreate({
      where: { key },
      defaults: { key, response } as CreationAttributes<IdempotencyKeyModel>,
      transaction,
    });
  }

  private async loadWalletWithTransactions(
    walletId: string,
    transaction?: SequelizeTx,
  ): Promise<WalletResponse> {
    const wallet = await this.walletModel.findByPk(walletId, {
      include: [
        {
          model: this.transactionModel,
          order: [["createdAt", "DESC"]],
          separate: true,
        },
      ],
      transaction,
      lock: transaction ? transaction.LOCK.UPDATE : undefined,
    });
    if (!wallet) throw new NotFoundException("Wallet not found");
    return this.serializeWallet(wallet, wallet.transactions ?? []);
  }

  private serializeWallet(
    wallet: WalletModel,
    transactions: TransactionModel[],
  ): WalletResponse {
    return {
      id: wallet.id,
      currency: wallet.currency,
      balance: wallet.balance,
      transactions: [...transactions]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((tx) => ({
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          timestamp: tx.createdAt.toISOString(),
          balanceAfter: tx.balanceAfter,
          relatedWalletId: tx.relatedWalletId ?? undefined,
          idempotencyKey: tx.idempotencyKey ?? undefined,
        })),
    };
  }
}
