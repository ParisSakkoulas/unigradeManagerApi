import { Role } from '../domain/role.enum';

export interface JwtPayload {
  sub: string;
  login: string;
  role: Role;
  profileId: string | null;
}
