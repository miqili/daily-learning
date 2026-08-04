import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ACTIVITY_TYPES } from '@shck/shared';

export class CreateSessionDto {
  @IsOptional()
  @IsInt()
  subject_id?: number;

  @IsIn(ACTIVITY_TYPES as unknown as string[])
  activity_type!: string;

  @IsInt()
  @Min(1)
  duration_secs!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;
}
