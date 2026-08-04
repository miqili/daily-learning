import { IsBoolean, IsDateString } from 'class-validator';

export class InitPlanDto {
  @IsDateString()
  exam_date!: string;
}

export class CompleteTaskDto {
  @IsBoolean()
  is_completed!: boolean;
}
