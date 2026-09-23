import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { TRADEOFF_BUCKETS, TRADEOFF_STATUSES } from '@shck/shared';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const BUCKET_VALUES = TRADEOFF_BUCKETS as unknown as string[];
const STATUS_VALUES = TRADEOFF_STATUSES as unknown as string[];
/** 掌握度：0 未标记 / 1 不熟 / 2 已掌握 */
const MASTERY_VALUES = ['0', '1', '2'];

export class CreateTradeoffItemDto {
  @IsOptional()
  @IsInt()
  subject_id?: number | null;

  @IsIn(BUCKET_VALUES, { message: 'bucket 必须是 xigai / shizheng / zhexue / maozhongte 之一。' })
  bucket!: string;

  @Matches(DATE_RE, { message: 'entry_date 必须形如 2026-09-22。' })
  entry_date!: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  source?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  keywords?: string | null;

  @IsOptional()
  @IsIn(STATUS_VALUES)
  status?: string;

  @IsOptional()
  @IsBoolean()
  important?: boolean;

  @IsOptional()
  @IsIn([0, 1, 2])
  mastery?: number;

  @IsOptional()
  @IsInt()
  sort_order?: number | null;
}

export class UpdateTradeoffItemDto {
  @IsOptional()
  @IsInt()
  subject_id?: number | null;

  @IsOptional()
  @IsIn(BUCKET_VALUES)
  bucket?: string;

  @IsOptional()
  @Matches(DATE_RE)
  entry_date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  source?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  keywords?: string | null;

  @IsOptional()
  @IsIn(STATUS_VALUES)
  status?: string;

  @IsOptional()
  @IsBoolean()
  important?: boolean;

  @IsOptional()
  @IsIn([0, 1, 2])
  mastery?: number;

  @IsOptional()
  @IsInt()
  sort_order?: number | null;
}

export class SearchTradeoffDto {
  @IsOptional()
  @IsInt()
  subject_id?: number;

  /** 只看某个桶；不传＝四桶全要 */
  @IsOptional()
  @IsIn(BUCKET_VALUES)
  bucket?: string;

  /** 只看某个补录流程状态；不传＝全部 */
  @IsOptional()
  @IsIn(STATUS_VALUES)
  status?: string;

  /** 只看某一天补录的；不传＝全部日期 */
  @IsOptional()
  @Matches(DATE_RE)
  entry_date?: string;

  /** 只看重点标记（历史字段，UI 已不再使用，保留兼容） */
  @IsOptional()
  @IsIn(['0', '1'])
  important?: string;

  /** 精确掌握度筛选：0 未标记 / 1 不熟 / 2 已掌握 */
  @IsOptional()
  @IsIn(MASTERY_VALUES)
  mastery?: string;

  /** 不熟清单：'1' 时只返回 mastery < 2（未标记 + 不熟）的条目，考前只看这一份 */
  @IsOptional()
  @IsIn(['0', '1'])
  unmastered?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;
}
