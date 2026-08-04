import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMistakeDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  correct_answer?: string;

  @IsOptional()
  @IsString()
  user_answer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  error_reason?: string;

  @IsOptional()
  @IsInt()
  subject_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;
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
  @IsString()
  correct_answer?: string;

  @IsOptional()
  @IsString()
  user_answer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  error_reason?: string;

  @IsOptional()
  @IsInt()
  subject_id?: number | null;

  @IsOptional()
  @IsString()
  analysis?: string;

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
