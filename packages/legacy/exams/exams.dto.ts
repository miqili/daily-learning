import { IsInt, IsObject, IsOptional, Max, Min } from 'class-validator';

export class SubmitExamDto {
  @IsInt()
  @Min(0)
  @Max(36_000)
  time_spent_secs!: number;

  @IsObject()
  answers!: Record<string, string>;

  @IsOptional()
  @IsInt()
  @Min(0)
  subjective_score = 0;
}
