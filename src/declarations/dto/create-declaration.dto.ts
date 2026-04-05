import { IsNotEmpty, IsString } from 'class-validator';

export class CreateDeclarationDto {
  @IsString()
  @IsNotEmpty()
  teachingId: string;
}
