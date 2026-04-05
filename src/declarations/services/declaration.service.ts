import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TeachingState } from '../../teachings/domain/teaching-state.enum';
import {
  Student,
  StudentDocument,
} from '../../students/schemas/student.schema';
import { Course } from '../../courses/schemas/course.schema';
import {
  Declaration,
  DeclarationDocument,
} from '../schemas/declaration.schema';
import { BulkGradesDto } from '../dto/bulk-grades.dto';
import { CreateDeclarationDto } from '../dto/create-declaration.dto';
import { SetGradeDto } from '../dto/set-grade.dto';
import { TeachingsService } from 'src/teachings/services/teaching.service';
import { DeclarationState } from '../domain/declaration-state.eum';
import { QueryDeclarationsDto } from '../dto/quere.declaration.dto';

@Injectable()
export class DeclarationsService {
  constructor(
    @InjectModel(Declaration.name)
    private readonly declarationModel: Model<DeclarationDocument>,
    @InjectModel(Student.name)
    private readonly studentModel: Model<StudentDocument>,
    private readonly teachingsService: TeachingsService,
  ) {}

  // ─── Student: declare a course ───────────────────────────────────────────────

  async declare(
    dto: CreateDeclarationDto,
    studentUserId: string,
  ): Promise<DeclarationDocument> {
    const student = await this.studentModel
      .findOne({ userId: new Types.ObjectId(studentUserId) })
      .lean();
    if (!student) throw new NotFoundException('Student profile not found');

    const teaching = await this.teachingsService.findById(dto.teachingId);

    // Teaching must be in GRADING_DEFINED state or earlier (but assigned at minimum)
    if (
      teaching.state === TeachingState.FULLY_GRADED ||
      teaching.state === TeachingState.ENTERED
    ) {
      throw new BadRequestException(
        'This teaching is not open for declarations',
      );
    }

    // Prerequisite check
    await this.assertPrerequisitesMet(teaching, student._id.toString());

    const exists = await this.declarationModel
      .findOne({
        teaching: new Types.ObjectId(dto.teachingId),
        student: student._id,
      })
      .lean();
    if (exists)
      throw new ConflictException('You have already declared this course');

    const created = await this.declarationModel.create({
      teaching: new Types.ObjectId(dto.teachingId),
      student: student._id,
      state: DeclarationState.PARTIAL,
    });

    return this.findById(created._id.toString());
  }

  // ─── Student: remove a course from declaration ───────────────────────────────

  async undeclare(declarationId: string, studentUserId: string): Promise<void> {
    const student = await this.studentModel
      .findOne({ userId: new Types.ObjectId(studentUserId) })
      .lean();
    if (!student) throw new NotFoundException('Student profile not found');

    const declaration = await this.declarationModel
      .findById(declarationId)
      .lean();
    if (!declaration) throw new NotFoundException('Declaration not found');

    if (declaration.student.toString() !== student._id.toString()) {
      throw new ForbiddenException('This is not your declaration');
    }

    if (declaration.state === DeclarationState.FINALIZED) {
      throw new ForbiddenException(
        'Declaration has been finalized and cannot be modified',
      );
    }

    await this.declarationModel.findByIdAndDelete(declarationId);
  }

  // ─── Student: finalize declaration ───────────────────────────────────────────

  async finalizeDeclaration(
    declarationId: string,
    studentUserId: string,
  ): Promise<DeclarationDocument> {
    const student = await this.studentModel
      .findOne({ userId: new Types.ObjectId(studentUserId) })
      .lean();
    if (!student) throw new NotFoundException('Student profile not found');

    const declaration = await this.declarationModel.findById(declarationId);
    if (!declaration) throw new NotFoundException('Declaration not found');

    if (declaration.student.toString() !== student._id.toString()) {
      throw new ForbiddenException('This is not your declaration');
    }

    if (declaration.state === DeclarationState.FINALIZED) {
      throw new BadRequestException('Already finalized');
    }

    declaration.state = DeclarationState.FINALIZED;
    return declaration.save();
  }

  // ─── Query ───────────────────────────────────────────────────────────────────

  async findAll(query: QueryDeclarationsDto): Promise<DeclarationDocument[]> {
    const filter: Record<string, any> = {};
    if (query.teachingId)
      filter.teaching = new Types.ObjectId(query.teachingId);
    if (query.studentId) filter.student = new Types.ObjectId(query.studentId);

    return this.declarationModel
      .find(filter)
      .populate({
        path: 'teaching',
        populate: { path: 'course', select: 'code name' },
      })
      .populate('student', 'registrationNumber firstName lastName')
      .lean();
  }

  async findById(id: string): Promise<DeclarationDocument> {
    const doc = await this.declarationModel
      .findById(id)
      .populate({
        path: 'teaching',
        populate: { path: 'course', select: 'code name' },
      })
      .populate('student', 'registrationNumber firstName lastName')
      .lean();
    if (!doc) throw new NotFoundException('Declaration not found');
    return doc;
  }

  // ─── Instructor: set single grade ────────────────────────────────────────────

  async setGrade(
    declarationId: string,
    dto: SetGradeDto,
    instructorId: string,
  ): Promise<DeclarationDocument> {
    const declaration = await this.declarationModel
      .findById(declarationId)
      .populate('teaching')
      .exec();
    if (!declaration) throw new NotFoundException('Declaration not found');

    // After populate, teaching is the full object — extract _id explicitly
    const teachingId =
      (declaration.teaching as any)?._id?.toString() ??
      declaration.teaching.toString();

    const teaching = await this.teachingsService.assertGradingOpen(teachingId);

    this.assertIsTeachingInstructor(teaching, instructorId);

    if (dto.theoryGrade !== undefined)
      declaration.theoryGrade = dto.theoryGrade;
    if (dto.labGrade !== undefined) declaration.labGrade = dto.labGrade;

    declaration.finalGrade = this.computeFinalGrade(declaration, teaching);

    const saved = await declaration.save();

    // Transition teaching state on first grade entry
    if (teaching.state === TeachingState.GRADING_DEFINED) {
      await this.teachingsService.transitionToPartiallyGraded(
        teaching._id.toString(),
      );
    }

    return saved;
  }

  // ─── Instructor: bulk grade import ───────────────────────────────────────────

  async bulkSetGrades(
    teachingId: string,
    dto: BulkGradesDto,
    instructorId: string,
  ): Promise<{ updated: number; notFound: string[] }> {
    const teaching = await this.teachingsService.assertGradingOpen(teachingId);
    this.assertIsTeachingInstructor(teaching, instructorId);

    let updated = 0;
    const notFound: string[] = [];

    for (const entry of dto.grades) {
      const student = await this.studentModel
        .findOne({ registrationNumber: entry.registrationNumber })
        .lean();

      if (!student) {
        notFound.push(entry.registrationNumber);
        continue;
      }

      const declaration = await this.declarationModel.findOne({
        teaching: new Types.ObjectId(teachingId),
        student: student._id,
      });

      if (!declaration) {
        notFound.push(entry.registrationNumber);
        continue;
      }

      if (entry.theoryGrade !== undefined)
        declaration.theoryGrade = entry.theoryGrade;
      if (entry.labGrade !== undefined) declaration.labGrade = entry.labGrade;
      declaration.finalGrade = this.computeFinalGrade(declaration, teaching);
      await declaration.save();
      updated++;
    }

    // Transition teaching state on first bulk entry
    if (updated > 0 && teaching.state === TeachingState.GRADING_DEFINED) {
      await this.teachingsService.transitionToPartiallyGraded(teachingId);
    }

    return { updated, notFound };
  }

  // ─── Statistics ──────────────────────────────────────────────────────────────

  /** Instructor stats: pass/fail counts per teaching */
  async getTeachingStats(teachingId: string) {
    const declarations = await this.declarationModel
      .find({ teaching: new Types.ObjectId(teachingId) })
      .lean();

    const total = declarations.length;
    const passed = declarations.filter(
      (d) => d.finalGrade !== null && d.finalGrade >= 5,
    ).length;
    const failed = declarations.filter(
      (d) => d.finalGrade !== null && d.finalGrade < 5,
    ).length;
    const pending = declarations.filter((d) => d.finalGrade === null).length;

    return {
      total,
      passed,
      failed,
      pending,
      passRate: total ? passed / total : 0,
    };
  }

  /** Instructor stats: pass/fail across all their teachings */
  async getInstructorStats(instructorId: string) {
    const teachings = await this.teachingsService.findAll({ instructorId });
    const results = await Promise.all(
      teachings.map(async (t) => ({
        teaching: t,
        stats: await this.getTeachingStats(t._id.toString()),
      })),
    );

    const allDeclarations = results.flatMap((r) =>
      Array(r.stats.total)
        .fill(null)
        .map((_, i) => i < r.stats.passed),
    );
    const totalPassed = results.reduce((acc, r) => acc + r.stats.passed, 0);
    const totalStudents = results.reduce((acc, r) => acc + r.stats.total, 0);

    return {
      perTeaching: results,
      overall: {
        totalStudents,
        totalPassed,
        totalFailed: totalStudents - totalPassed,
        passRate: totalStudents ? totalPassed / totalStudents : 0,
      },
    };
  }

  /** Student stats: passed/failed per year+semester */
  async getStudentStats(studentId: string) {
    const declarations = await this.declarationModel
      .find({ student: new Types.ObjectId(studentId) })
      .populate({ path: 'teaching', select: 'year semester' })
      .lean();

    const passed = declarations.filter(
      (d) => d.finalGrade !== null && d.finalGrade >= 5,
    );
    const failed = declarations.filter(
      (d) => d.finalGrade !== null && d.finalGrade < 5,
    );

    return {
      totalPassed: passed.length,
      totalFailed: failed.length,
      declarations,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  private computeFinalGrade(
    declaration: DeclarationDocument,
    teaching: any,
  ): number | null {
    if (
      declaration.theoryGrade === null ||
      declaration.labGrade === null ||
      teaching.theoryWeight === null ||
      teaching.labWeight === null
    ) {
      return null;
    }
    return (
      teaching.theoryWeight * declaration.theoryGrade +
      teaching.labWeight * declaration.labGrade
    );
  }

  private assertIsTeachingInstructor(
    teaching: any,
    instructorId: string,
  ): void {
    if (teaching.instructor?.toString() !== instructorId) {
      throw new ForbiddenException(
        'You are not the assigned instructor for this teaching',
      );
    }
  }

  private async assertPrerequisitesMet(
    teaching: any,
    studentId: string,
  ): Promise<void> {
    const course = teaching.course as any;
    if (!course?.prerequisites?.length) return;

    // Find all teachings the student has a passing grade in
    const passedDeclarations = await this.declarationModel
      .find({ student: new Types.ObjectId(studentId), finalGrade: { $gte: 5 } })
      .populate({ path: 'teaching', select: 'course' })
      .lean();

    const passedCourseIds = new Set(
      passedDeclarations.map((d: any) => d.teaching?.course?.toString()),
    );

    const unmet = course.prerequisites.filter(
      (prereqId: Types.ObjectId) => !passedCourseIds.has(prereqId.toString()),
    );

    if (unmet.length > 0) {
      throw new BadRequestException(
        `Prerequisites not met. Missing course IDs: ${unmet.join(', ')}`,
      );
    }
  }
}
