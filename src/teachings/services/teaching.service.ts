import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AssignInstructorDto } from '../dto/assign-instructor.dto';
import { CreateTeachingDto } from '../dto/create-teaching.dto';
import { TeachingState } from '../domain/teaching-state.enum';
import { Teaching, TeachingDocument } from '../schemas/teaching.schema';
import { DefineGradingDto } from '../dto/define-grade.dto';
import { QueryTeachingsDto } from '../dto/query-teaching.dto';

@Injectable()
export class TeachingsService {
  constructor(
    @InjectModel(Teaching.name)
    private readonly teachingModel: Model<TeachingDocument>,
  ) { }

  // ─── Create ──────────────────────────────────────────────────────────────────

  async create(dto: CreateTeachingDto): Promise<TeachingDocument> {
    const exists = await this.teachingModel.findOne({
      course: new Types.ObjectId(dto.courseId),
      year: dto.year,
      semester: dto.semester,
    }).lean();
    if (exists) throw new ConflictException('This course is already scheduled for that year/semester');

    const created = await this.teachingModel.create({
      course: new Types.ObjectId(dto.courseId),
      year: dto.year,
      semester: dto.semester,
      state: TeachingState.ENTERED,
    });

    return this.findById(created._id.toString());
  }

  // ─── Query ───────────────────────────────────────────────────────────────────

  async findAll(query: QueryTeachingsDto): Promise<TeachingDocument[]> {
    const filter: Record<string, any> = {};
    if (query.courseId) filter.course = new Types.ObjectId(query.courseId);
    if (query.instructorId) filter.instructor = new Types.ObjectId(query.instructorId);
    if (query.year) filter.year = query.year;
    if (query.semester) filter.semester = query.semester;

    return this.teachingModel
      .find(filter)
      .populate('course', 'code name')
      .populate('instructor', 'firstName lastName rank')
      .lean();
  }

  async findById(id: string): Promise<TeachingDocument> {
    const doc = await this.teachingModel
      .findById(id)
      .populate('course', 'code name description prerequisites')
      .populate('instructor', 'firstName lastName rank')
      .lean();
    if (!doc) throw new NotFoundException('Teaching not found');
    return doc;
  }

  // ─── State transitions ───────────────────────────────────────────────────────

  /**
   * ENTERED → ASSIGNED
   * Admin assigns an instructor to the teaching.
   */
  async assignInstructor(id: string, dto: AssignInstructorDto): Promise<TeachingDocument> {
    const teaching = await this.teachingModel.findById(id);
    if (!teaching) throw new NotFoundException('Teaching not found');

    if (teaching.state !== TeachingState.ENTERED) {
      throw new BadRequestException(`Cannot assign instructor in state "${teaching.state}"`);
    }

    teaching.instructor = new Types.ObjectId(dto.instructorId);
    teaching.state = TeachingState.ASSIGNED;
    await teaching.save();

    return this.findById(id);
  }

  /**
   * ASSIGNED → GRADING_DEFINED  (new)
   * GRADING_DEFINED → GRADING_DEFINED  (update)
   * Instructor defines or updates grading weights.
   */
  async defineGrading(id: string, dto: DefineGradingDto, instructorId: string): Promise<TeachingDocument> {
    const teaching = await this.teachingModel.findById(id);
    if (!teaching) throw new NotFoundException('Teaching not found');

    const allowedStates = [TeachingState.ASSIGNED, TeachingState.GRADING_DEFINED];
    if (!allowedStates.includes(teaching.state)) {
      throw new BadRequestException(`Cannot define grading in state "${teaching.state}"`);
    }

    this.assertIsTeachingInstructor(teaching, instructorId);

    if (Math.abs(dto.theoryWeight + dto.labWeight - 1) > 0.0001) {
      throw new BadRequestException('theoryWeight + labWeight must equal 1');
    }

    teaching.theoryWeight = dto.theoryWeight;
    teaching.labWeight = dto.labWeight;
    teaching.theoryRetentionYear = dto.theoryRetentionYear ?? null;
    teaching.labRetentionYear = dto.labRetentionYear ?? null;
    teaching.state = TeachingState.GRADING_DEFINED;

    await teaching.save();
    return this.findById(id);
  }

  /**
   * Called by DeclarationsService after first grade is entered.
   * GRADING_DEFINED → PARTIALLY_GRADED
   */
  async transitionToPartiallyGraded(id: string): Promise<void> {
    await this.teachingModel.findByIdAndUpdate(id, {
      $set: { state: TeachingState.PARTIALLY_GRADED },
    });
  }

  /**
   * PARTIALLY_GRADED → FULLY_GRADED
   * Instructor finalizes — no more grade edits allowed.
   */
  async finalizeGrades(id: string, instructorId: string): Promise<TeachingDocument> {
    const teaching = await this.teachingModel.findById(id);
    if (!teaching) throw new NotFoundException('Teaching not found');

    if (teaching.state !== TeachingState.PARTIALLY_GRADED) {
      throw new BadRequestException(`Cannot finalize grades in state "${teaching.state}"`);
    }

    this.assertIsTeachingInstructor(teaching, instructorId);

    teaching.state = TeachingState.FULLY_GRADED;
    await teaching.save();
    return this.findById(id);
  }

  /**
   * FULLY_GRADED → ENTERED (semester ended, cycle resets for next year)
   * Called by admin at semester rollover.
   */
  async expireSemester(id: string): Promise<TeachingDocument> {
    const teaching = await this.teachingModel.findById(id);
    if (!teaching) throw new NotFoundException('Teaching not found');

    if (teaching.state !== TeachingState.FULLY_GRADED) {
      throw new BadRequestException(`Cannot expire semester in state "${teaching.state}"`);
    }

    teaching.state = TeachingState.ENTERED;
    teaching.instructor = null;
    teaching.theoryWeight = null;
    teaching.labWeight = null;
    teaching.theoryRetentionYear = null;
    teaching.labRetentionYear = null;

    return teaching.save();
  }

  // ─── Delete (admin only, only in ENTERED state) ───────────────────────────────

  async remove(id: string): Promise<void> {
    const teaching = await this.teachingModel.findById(id).lean();
    if (!teaching) throw new NotFoundException('Teaching not found');
    if (teaching.state !== TeachingState.ENTERED) {
      throw new BadRequestException('Can only delete a teaching that has not yet been assigned');
    }
    await this.teachingModel.findByIdAndDelete(id);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private assertIsTeachingInstructor(teaching: TeachingDocument, instructorId: string): void {
    if (teaching.instructor?.toString() !== instructorId) {
      throw new ForbiddenException('You are not the assigned instructor for this teaching');
    }
  }

  async assertGradingOpen(teachingId: string): Promise<TeachingDocument> {
    const teaching = await this.teachingModel.findById(teachingId).lean();
    if (!teaching) throw new NotFoundException('Teaching not found');
    if (teaching.state === TeachingState.FULLY_GRADED) {
      throw new ForbiddenException('Grades have been finalized and cannot be modified');
    }
    if (
      teaching.state !== TeachingState.GRADING_DEFINED &&
      teaching.state !== TeachingState.PARTIALLY_GRADED
    ) {
      throw new BadRequestException('Grading is not yet open for this teaching');
    }
    return teaching as TeachingDocument;
  }
}
