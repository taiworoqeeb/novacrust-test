import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CreateWalletDto {
  @IsOptional({
    message: 'Currency is optional',
  })
  @IsString({
    message: 'Currency must be a string',
  })
  @IsIn(['USD'], {
    message: 'Currency must be USD',
  })
  currency: 'USD' = 'USD';

  @IsString({
    message: 'PIN must be a string',
  })
  @Length(4, 12, {
    message: 'PIN must be between 4 and 12 characters',
  })
  pin!: string;
}

