import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { InstructorRank } from '../domain/instructor-rank.enum';

export type InstructorDocument = HydratedDocument<Instructor>;

@Schema({ timestamps: true, collection: 'instructors' })
export class Instructor {
  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ required: true, enum: InstructorRank })
  rank: InstructorRank;

  /** Back-reference to User account */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;
}

export const InstructorSchema = SchemaFactory.createForClass(Instructor);
