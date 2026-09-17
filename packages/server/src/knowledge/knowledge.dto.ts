import { IsArray, IsEnum, IsInt, IsIn, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
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

  /** 按条目类型筛选：MUST_READ（必背考点卡）/ MATERIAL（章节正文）/ NOTE（个人笔记）… */
  @IsOptional()
  @IsEnum(KNOWLEDGE_TYPES)
  item_type?: string;

  /** sort = 按文档顺序（必背考点模块用）；updated = 按最近更新（默认，保持既有行为） */
  @IsOptional()
  @IsIn(['sort', 'updated'])
  order?: 'sort' | 'updated';

  /**
   * 按数据来源筛选：sprint5w = 内置「5 周冲刺保底方案」迁移出的必背考点模块内容。
   * 必背考点页只认这个值，从而把章节正文（MATERIAL）与卡片（MUST_READ）一次取全，
   * 又不会混进用户自己创建的 NOTE / MATERIAL。
   */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  origin?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;
}
