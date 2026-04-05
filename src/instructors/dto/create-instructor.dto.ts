import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { InstructorRank } from '../domain/instructor-rank.enum';

export class CreateInstructorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsEnum(InstructorRank)
  rank: InstructorRank;

  /** Provided by admin when creating — links the instructor profile to a user account */
  @IsString()
  @IsNotEmpty()
  userId: string;
}
