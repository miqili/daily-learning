import { IsBoolean, IsDateString, IsInt, IsNotEmpty, IsObject, IsOptional, Matches, Max, Min } from 'class-validator';

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

export class StudyAvailabilityDto {
  @IsInt()
  @Min(30)
  @Max(240)
  weekdayMinutes!: number;

  @IsInt()
  @Min(0)
  @Max(240)
  weekdayMorningMinutes!: number;

  @IsInt()
  @Min(60)
  @Max(600)
  saturdayMinutes!: number;

  @IsInt()
  @Min(60)
  @Max(600)
  sundayMinutes!: number;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  weekdayEveningStart!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  weekendStart!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  weekendEnd!: string;
}
