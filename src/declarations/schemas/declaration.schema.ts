import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { DeclarationState } from '../domain/declaration-state.eum';

export type DeclarationDocument = HydratedDocument<Declaration>;

@Schema({ timestamps: true, collection: 'declarations' })
export class Declaration {
  @Prop({ type: Types.ObjectId, ref: 'Teaching', required: true })
  teaching: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  student: Types.ObjectId;

  @Prop({
    required: true,
    enum: DeclarationState,
    default: DeclarationState.PARTIAL,
  })
  state: DeclarationState;

  // ─── Grades (set by instructor, required when teaching is FULLY_GRADED) ─────

  @Prop({ type: Number, min: 0, max: 10, default: null })
  theoryGrade: number | null;

  @Prop({ type: Number, min: 0, max: 10, default: null })
  labGrade: number | null;

  /** Computed: theoryWeight * theoryGrade + labWeight * labGrade */
  @Prop({ type: Number, min: 0, max: 10, default: null })
  finalGrade: number | null;
}

export const DeclarationSchema = SchemaFactory.createForClass(Declaration);

// A student can only declare a specific teaching once
DeclarationSchema.index({ teaching: 1, student: 1 }, { unique: true });
