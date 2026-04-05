import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class BulkGradeEntryDto {
  @IsString()
  registrationNumber: string;

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

export class BulkGradesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkGradeEntryDto)
  grades: BulkGradeEntryDto[];
}
