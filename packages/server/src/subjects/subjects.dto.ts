import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSubjectDto {
  @IsString()
  @MaxLength(50)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;
}

export class UpdateSubjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;
}
