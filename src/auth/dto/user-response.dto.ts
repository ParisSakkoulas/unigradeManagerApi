import { Expose } from 'class-transformer';
import { Role } from '../domain/role.enum';

export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  login: string;

  @Expose()
  role: Role;

  @Expose()
  profileId: string | null;

  @Expose()
  isApproved: boolean;

  @Expose()
  createdAt: Date;
}
