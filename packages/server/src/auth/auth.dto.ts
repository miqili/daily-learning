import { IsDateString, IsOptional, IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(3, 50)
  username!: string;

  @IsString()
  @Length(8, 72)
  password!: string;

  @IsOptional()
  @IsDateString()
  exam_date?: string;
}

export class LoginDto {
  @IsString()
  @Matches(/\S/)
  username!: string;

  @IsString()
  @Length(1, 72)
  password!: string;
}
