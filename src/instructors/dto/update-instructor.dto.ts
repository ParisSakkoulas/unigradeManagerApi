import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { InstructorRank } from '../domain/instructor-rank.enum';

export class UpdateInstructorDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsEnum(InstructorRank)
  rank?: InstructorRank;
}
