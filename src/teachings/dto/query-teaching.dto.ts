import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Semester } from '../domain/teaching-state.enum';

export class QueryTeachingsDto {
  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  instructorId?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  @Type(() => Number)
  year?: number;

  @IsOptional()
  @IsEnum(Semester)
  semester?: Semester;
}
