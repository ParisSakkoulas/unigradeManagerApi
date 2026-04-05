import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';
import { JwtPayload } from '../domain/jwt-payload.interface';
import { Role } from '../domain/role.enum';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { AdminUpdateUserDto, UpdateUserDto } from '../dto/update-user.dto';
import { User, UserDocument } from '../schemas/user.schema';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ─── Registration (pending admin approval) ──────────────────────────────────

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const exists = await this.userModel.findOne({ login: dto.login }).lean();
    if (exists) throw new ConflictException('Login already taken');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    await this.userModel.create({
      login: dto.login,
      passwordHash,
      role: dto.role,
      isApproved: false,
    });

    return {
      message: 'Registration request submitted. Awaiting admin approval.',
    };
  }

  // ─── Login ───────────────────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.userModel.findOne({ login: dto.login }).lean();
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    if (!user.isApproved) {
      throw new ForbiddenException('Account is pending approval');
    }

    const payload: JwtPayload = {
      sub: user._id.toString(),
      login: user.login,
      role: user.role,
      profileId: user.profileId?.toString() ?? null,
    };

    const expiresIn = this.config.get<string>('JWT_EXPIRES_IN', '2h') as any;
    const accessToken = this.jwtService.sign(payload, { expiresIn });

    return { accessToken };
  }

  // ─── Get all users (admin) ───────────────────────────────────────────────────

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().select('-passwordHash').lean();
  }

  // ─── Get single user ─────────────────────────────────────────────────────────

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel
      .findById(id)
      .select('-passwordHash')
      .lean();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ─── Self-update ─────────────────────────────────────────────────────────────

  async updateSelf(id: string, dto: UpdateUserDto): Promise<UserDocument> {
    const update: Partial<User> = {};

    if (dto.login) {
      const conflict = await this.userModel
        .findOne({ login: dto.login, _id: { $ne: new Types.ObjectId(id) } })
        .lean();
      if (conflict) throw new ConflictException('Login already taken');
      update.login = dto.login;
    }

    if (dto.password) {
      update.passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    }

    const updated = await this.userModel
      .findByIdAndUpdate(id, { $set: update }, { new: true })
      .select('-passwordHash')
      .lean();

    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  // ─── Admin update (role, approval, login, password) ─────────────────────────

  async adminUpdate(
    id: string,
    dto: AdminUpdateUserDto,
  ): Promise<UserDocument> {
    const update: Partial<User> = {};

    if (dto.login) {
      const conflict = await this.userModel
        .findOne({ login: dto.login, _id: { $ne: new Types.ObjectId(id) } })
        .lean();
      if (conflict) throw new ConflictException('Login already taken');
      update.login = dto.login;
    }

    if (dto.password) {
      update.passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    }

    if (dto.role !== undefined) update.role = dto.role;
    if (dto.isApproved !== undefined) update.isApproved = dto.isApproved;

    const updated = await this.userModel
      .findByIdAndUpdate(id, { $set: update }, { new: true })
      .select('-passwordHash')
      .lean();

    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  // ─── Delete (admin only) ─────────────────────────────────────────────────────

  async remove(id: string): Promise<void> {
    const user = await this.userModel.findById(id).lean();
    if (!user) throw new NotFoundException('User not found');
    if (user.role === Role.ADMIN)
      throw new ForbiddenException('Cannot delete the admin account');
    await this.userModel.findByIdAndDelete(id);
  }

  // ─── Approve registration request (admin) ────────────────────────────────────

  async approve(id: string): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(id, { $set: { isApproved: true } }, { new: true })
      .select('-passwordHash')
      .lean();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ─── Pending approvals list (admin) ──────────────────────────────────────────

  async findPending(): Promise<UserDocument[]> {
    return this.userModel
      .find({ isApproved: false })
      .select('-passwordHash')
      .lean();
  }
}
