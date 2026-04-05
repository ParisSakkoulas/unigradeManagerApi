import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class SetGradeDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  theoryGrade?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  labGrade?: number;
}
