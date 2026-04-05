import {
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '../domain/role.enum';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      'login can only contain letters, numbers, dots, dashes and underscores',
  })
  login: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  /**
   * Users may only self-register as STUDENT or INSTRUCTOR.
   * ADMIN role is seeded — not registerable.
   */
  @IsEnum([Role.STUDENT, Role.INSTRUCTOR], {
    message: 'role must be student or instructor',
  })
  role: Role.STUDENT | Role.INSTRUCTOR;
}
