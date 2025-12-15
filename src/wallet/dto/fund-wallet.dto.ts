import { IsNumber, IsOptional, IsPositive, IsString, Max } from 'class-validator';

export class FundWalletDto {
  @IsNumber({}, {
    message: 'Amount must be a number',
  })
  @IsPositive({
    message: 'Amount must be a positive number',
  })
  @Max(1_000_000_000, {
    message: 'Amount must be less than 1B',
  })
  amount!: number;

  @IsOptional()
  @IsString({
    message: 'Idempotency key must be a string',
  })
  idempotencyKey?: string;
}

