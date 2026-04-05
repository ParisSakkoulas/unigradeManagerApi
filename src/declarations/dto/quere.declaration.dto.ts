import { IsOptional, IsString } from 'class-validator';

export class QueryDeclarationsDto {
  @IsOptional()
  @IsString()
  teachingId?: string;

  @IsOptional()
  @IsString()
  studentId?: string;
}
