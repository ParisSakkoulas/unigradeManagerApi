import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CourseDocument = HydratedDocument<Course>;

@Schema({ timestamps: true, collection: 'courses' })
export class Course {
  /** Unique course identifier (e.g. "CS101") */
  @Prop({ required: true, unique: true, trim: true })
  code: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: String, trim: true, default: null })
  description: string | null;

  /** Prerequisites — other Course IDs */
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Course' }], default: [] })
  prerequisites: Types.ObjectId[];
}

export const CourseSchema = SchemaFactory.createForClass(Course);

CourseSchema.index({ name: 'text', code: 'text', description: 'text' });
