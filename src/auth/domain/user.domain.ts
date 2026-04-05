import { Role } from './role.enum';

export class UserDomain {
  id: string;
  login: string;
  passwordHash: string;
  role: Role;
  profileId: string | null;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}
