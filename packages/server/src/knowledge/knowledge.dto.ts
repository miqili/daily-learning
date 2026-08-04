import { IsArray, IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { KNOWLEDGE_TYPES } from '@shck/shared';

export class CreateKnowledgeDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsInt()
  subject_id?: number;

  @IsOptional()
  @IsEnum(KNOWLEDGE_TYPES)
  item_type?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  source?: string;
}

export class UpdateKnowledgeDto {
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
  @IsEnum(KNOWLEDGE_TYPES)
  item_type?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  source?: string;
}

export class SearchKnowledgeDto {
  @IsOptional()
  @IsInt()
  subject_id?: number;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsInt()
  limit?: number;
}
