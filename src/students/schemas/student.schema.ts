import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type StudentDocument = HydratedDocument<Student>;

@Schema({ timestamps: true, collection: 'students' })
export class Student {
  /** University registration number (ΑΜ) */
  @Prop({ required: true, unique: true, trim: true })
  registrationNumber: string;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ required: true })
  enrollmentYear: number;

  /** Back-reference to User account */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;
}

export const StudentSchema = SchemaFactory.createForClass(Student);
