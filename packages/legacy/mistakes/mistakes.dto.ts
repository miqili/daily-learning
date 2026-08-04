import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { ERROR_REASONS } from '@shck/shared';

export class CreateMistakeDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsInt()
  subject_id?: number;

  @IsOptional()
  @IsString()
  correct_answer?: string;

  @IsOptional()
  @IsString()
  user_answer?: string;

  @IsOptional()
  @IsEnum(ERROR_REASONS)
  error_reason?: string;

  @IsOptional()
  @IsString()
  analysis?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateMistakeDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsInt()
  subject_id?: number | null;

  @IsOptional()
  @IsString()
  correct_answer?: string;

  @IsOptional()
  @IsString()
  user_answer?: string;

  @IsOptional()
  @IsEnum(ERROR_REASONS)
  error_reason?: string;

  @IsOptional()
  @IsString()
  analysis?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReviewMistakeDto {
  @IsBoolean()
  correct!: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ListMistakesDto {
  @IsOptional()
  @IsInt()
  subject_id?: number;

  @IsOptional()
  @IsEnum(ERROR_REASONS)
  error_reason?: string;

  @IsOptional()
  @IsString()
  keyword?: string;
}
