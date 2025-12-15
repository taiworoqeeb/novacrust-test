import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'idempotency_keys', timestamps: true })
export class IdempotencyKeyModel extends Model<IdempotencyKeyModel> {
  @Column({ type: DataType.STRING, primaryKey: true })
  key!: string;

  @Column({ type: DataType.JSONB, allowNull: false })
  response!: unknown;
}

