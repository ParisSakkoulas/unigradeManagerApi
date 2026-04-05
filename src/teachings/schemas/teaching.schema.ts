import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Semester, TeachingState } from '../domain/teaching-state.enum';

export type TeachingDocument = HydratedDocument<Teaching>;

@Schema({ timestamps: true, collection: 'teachings' })
export class Teaching {
  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  course: Types.ObjectId;

  @Prop({ required: true, min: 1900 })
  year: number;

  @Prop({ required: true, enum: Semester })
  semester: Semester;

  @Prop({ type: Types.ObjectId, ref: 'Instructor', default: null })
  instructor: Types.ObjectId | null;

  @Prop({ required: true, enum: TeachingState, default: TeachingState.ENTERED })
  state: TeachingState;

  // ─── Grading weights (required once grading is defined) ─────────────────────

  /** Weight for theory part (0–1), e.g. 0.7 */
  @Prop({ type: Number, min: 0, max: 1, default: null })
  theoryWeight: number | null;

  /** Weight for lab part (0–1), e.g. 0.3. theoryWeight + labWeight must = 1 */
  @Prop({ type: Number, min: 0, max: 1, default: null })
  labWeight: number | null;

  /**
   * Theory constraint: passing grade from this year onward is retained.
   * Null means no retention constraint.
   */
  @Prop({ type: Number, default: null })
  theoryRetentionYear: number | null;

  /**
   * Lab constraint: passing grade from this year onward is retained.
   */
  @Prop({ type: Number, default: null })
  labRetentionYear: number | null;
}

export const TeachingSchema = SchemaFactory.createForClass(Teaching);

// A course can only be taught once per year+semester
TeachingSchema.index({ course: 1, year: 1, semester: 1 }, { unique: true });
