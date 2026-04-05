import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SearchCourseDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string; // full-text keyword
}
