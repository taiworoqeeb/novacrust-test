import {
  Column,
  DataType,
  HasMany,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from "sequelize-typescript";
import { TransactionModel } from "./transaction.entity";

@Table({ tableName: "wallets", timestamps: true })
export class WalletModel extends Model {
  @Unique
  @PrimaryKey
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4 })
  id!: string;

  @Column({ type: DataType.STRING, allowNull: false, defaultValue: "USD" })
  currency!: "USD";

  @Column({ type: DataType.STRING, allowNull: false })
  pin!: string;

  @Column({
    type: DataType.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 0,
    get() {
      const raw = this.getDataValue("balance") as unknown as string;
      return parseFloat(raw ?? "0");
    },
    set(value: number) {
      this.setDataValue("balance", value);
    },
  })
  balance!: number;

  @HasMany(() => TransactionModel)
  transactions!: TransactionModel[];
}
