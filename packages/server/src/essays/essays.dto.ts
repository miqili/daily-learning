import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ESSAY_TYPES } from '@shck/shared';

export class CreateEssayDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsIn(ESSAY_TYPES as unknown as string[])
  essay_type!: string;

  @IsString()
  @MinLength(1)
  content!: string;
}

export class UpdateEssayDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsIn(ESSAY_TYPES as unknown as string[])
  essay_type?: string;

  @IsOptional()
  @IsString()
  content?: string;
}
