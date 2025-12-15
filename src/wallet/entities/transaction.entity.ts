import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from "sequelize-typescript";
import { WalletModel } from "./wallet.entity";

export type TransactionType = "FUND" | "TRANSFER_IN" | "TRANSFER_OUT";

@Table({ tableName: "transactions", timestamps: true })
export class TransactionModel extends Model<TransactionModel> {
  @Unique
  @PrimaryKey
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4 })
  id!: string;

  @ForeignKey(() => WalletModel)
  @Column({ type: DataType.UUID, allowNull: false })
  walletId!: string;

  @BelongsTo(() => WalletModel, "walletId")
  wallet!: WalletModel;

  @Column({
    type: DataType.ENUM("FUND", "TRANSFER_IN", "TRANSFER_OUT"),
    allowNull: false,
  })
  type!: TransactionType;

  @Column({
    type: DataType.DECIMAL(18, 2),
    allowNull: false,
    get() {
      const raw = this.getDataValue("amount") as unknown as string;
      return parseFloat(raw ?? "0");
    },
  })
  amount!: number;

  @Column({
    type: DataType.DECIMAL(18, 2),
    allowNull: false,
    get() {
      const raw = this.getDataValue("balanceAfter") as unknown as string;
      return parseFloat(raw ?? "0");
    },
  })
  balanceAfter!: number;

  @Column({ type: DataType.UUID, allowNull: true })
  relatedWalletId?: string;

  @Column({ type: DataType.STRING, allowNull: true })
  idempotencyKey?: string;

}
