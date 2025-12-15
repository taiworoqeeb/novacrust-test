import { IsString, Length } from 'class-validator';

export class ResetPinDto {
  @IsString({
    message: 'New PIN must be a string',
  })
  @Length(4, 12, {
    message: 'New PIN must be between 4 and 12 characters',
  })
  newPin!: string;
}

