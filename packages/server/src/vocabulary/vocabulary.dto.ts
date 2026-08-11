import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

export class CreateDeckDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateWordDto {
  @IsString()
  @MaxLength(100)
  word!: string;

  @IsString()
  meaning!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  phonetic?: string;

  @IsOptional()
  @IsString()
  example_sentence?: string;

  /** 分级：1 高频 / 2 核心 / 3 拓展 */
  @IsOptional()
  @IsInt()
  level?: number;

  /** 附带的短语（可选，会创建一条关联短语记录） */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  phrase?: string;

  @IsOptional()
  @IsString()
  phrase_meaning?: string;
}

export class CreatePhraseDto {
  @IsString()
  @MaxLength(200)
  phrase!: string;

  @IsOptional()
  @IsString()
  meaning?: string;

  @IsOptional()
  @IsInt()
  level?: number;

  @IsOptional()
  @IsInt()
  word_id?: number;

  @IsOptional()
  @IsInt()
  deck_id?: number;
}

export class UpdatePhraseDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  phrase?: string;

  @IsOptional()
  @IsString()
  meaning?: string;

  @IsOptional()
  @IsInt()
  level?: number;

  @IsOptional()
  @IsInt()
  word_id?: number | null;

  @IsOptional()
  @IsInt()
  deck_id?: number | null;
}

export class UpdateWordDto {
  @IsOptional()
  @IsString()
  meaning?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  phonetic?: string;

  @IsOptional()
  @IsString()
  example_sentence?: string;

  @IsOptional()
  @IsInt()
  level?: number;
}

export class UpdateVocabularySettingsDto {
  @IsInt()
  @Min(1)
  daily_target!: number;
}

export class ReviewWordDto {
  @IsOptional()
  @IsBoolean()
  correct?: boolean;
}

export class AnswerVocabularyDto {
  @IsBoolean()
  correct!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  answer_type?: string;
}

export class ImportWordsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWordDto)
  words!: CreateWordDto[];
}
