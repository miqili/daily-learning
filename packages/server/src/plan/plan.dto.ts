import { IsBoolean, IsDateString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class InitPlanDto {
  @IsDateString()
  @IsNotEmpty()
  exam_date!: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  /** 科目权重：{ [subjectId]: 0-100 }，weight=0 表示该科不安排任务 */
  @IsOptional()
  @IsObject()
  weights?: Record<string, number>;
}

export class CompletionDto {
  @IsBoolean()
  is_completed!: boolean;
}
