import { IsArray, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaperDto {
  @IsString()
  @MaxLength(50)
  subject!: string;

  @IsInt()
  @Min(1990)
  year!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}

export class QuestionOptionDto {
  @IsString()
  key!: string;

  @IsString()
  text!: string;
}

export class CreateQuestionDto {
  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  passage?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[];

  @IsOptional()
  @IsString()
  answer?: string;

  @IsOptional()
  @IsInt()
  score?: number;
}

export class ImportQuestionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions!: CreateQuestionDto[];
}

export class UpdateQuestionDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  passage?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[] | null;

  @IsOptional()
  @IsString()
  answer?: string | null;

  @IsOptional()
  @IsInt()
  score?: number;
}
