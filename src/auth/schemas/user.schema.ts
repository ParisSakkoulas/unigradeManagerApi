import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Role } from '../domain/role.enum';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, trim: true })
  login: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true, enum: Role, default: Role.STUDENT })
  role: Role;

  /**
   * Polymorphic ref: points to either Student or Instructor document.
   * Null for admin (no separate profile entity needed).
   */
  @Prop({ type: Types.ObjectId, default: null })
  profileId: Types.ObjectId | null;

  /**
   * New users register and wait for admin approval before they can log in.
   * Admin account is pre-seeded and already approved.
   */
  @Prop({ required: true, default: false })
  isApproved: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Enforce single admin constraint at DB level
UserSchema.index(
  { role: 1 },
  {
    unique: true,
    partialFilterExpression: { role: Role.ADMIN },
    name: 'unique_admin',
  },
);
