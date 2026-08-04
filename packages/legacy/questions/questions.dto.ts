import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { SUBJECTS } from '@shck/shared';

export class SearchQuestionsDto {
  @IsOptional()
  @IsIn(SUBJECTS)
  subject?: (typeof SUBJECTS)[number];

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 30;
}
