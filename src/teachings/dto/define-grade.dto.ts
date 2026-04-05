import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class DefineGradingDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  theoryWeight: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  labWeight: number;

  @IsOptional()
  @IsInt()
  @Min(1900)
  theoryRetentionYear?: number;

  @IsOptional()
  @IsInt()
  @Min(1900)
  labRetentionYear?: number;
}
