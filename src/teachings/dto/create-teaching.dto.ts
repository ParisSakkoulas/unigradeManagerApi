import { IsEnum, IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';
import { Semester } from '../domain/teaching-state.enum';

export class CreateTeachingDto {
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year: number;

  @IsEnum(Semester)
  semester: Semester;
}
