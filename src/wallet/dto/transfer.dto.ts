import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Max } from 'class-validator';

export class TransferDto {
  @IsString({
    message: 'From wallet id must be a string',
  })
  @IsNotEmpty({
    message: 'From wallet id is required',
  })
  fromWalletId!: string;

  @IsString({
    message: 'To wallet id must be a string',
  })
  @IsNotEmpty({
    message: 'To wallet id is required',
  })
  toWalletId!: string;

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

  @IsString({
    message: 'Pin must be a string',
  })
  @IsNotEmpty({
    message: 'Pin is required',
  })
  pin!: string;
}

