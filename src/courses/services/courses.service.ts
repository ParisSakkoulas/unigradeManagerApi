import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateCourseDto } from '../dto/create-course.dto';
import { UpdateCourseDto } from '../dto/update-course.dto';
import { Course, CourseDocument } from '../schemas/course.schema';
import { SearchCourseDto } from '../dto/search-course.dto';

@Injectable()
export class CoursesService {
  constructor(
    @InjectModel(Course.name)
    private readonly courseModel: Model<CourseDocument>,
  ) {}

  async create(dto: CreateCourseDto): Promise<CourseDocument> {
    const exists = await this.courseModel.findOne({ code: dto.code }).lean();
    if (exists)
      throw new ConflictException(
        `Course with code "${dto.code}" already exists`,
      );

    return this.courseModel.create({
      ...dto,
      prerequisites: (dto.prerequisites ?? []).map(
        (id) => new Types.ObjectId(id),
      ),
    });
  }

  async search(dto: SearchCourseDto): Promise<CourseDocument[]> {
    const filter = dto.q ? { $text: { $search: dto.q } } : {};
    return this.courseModel
      .find(filter)
      .populate('prerequisites', 'code name')
      .lean();
  }

  async findAll(): Promise<CourseDocument[]> {
    return this.courseModel
      .find()
      .populate('prerequisites', 'code name')
      .lean();
  }

  async findById(id: string): Promise<CourseDocument> {
    const doc = await this.courseModel
      .findById(id)
      .populate('prerequisites', 'code name')
      .lean();
    if (!doc) throw new NotFoundException('Course not found');
    return doc;
  }

  async update(id: string, dto: UpdateCourseDto): Promise<CourseDocument> {
    const update: Partial<Course> = { ...dto } as any;
    if (dto.prerequisites) {
      (update as any).prerequisites = dto.prerequisites.map(
        (p) => new Types.ObjectId(p),
      );
    }

    const doc = await this.courseModel
      .findByIdAndUpdate(id, { $set: update }, { new: true })
      .populate('prerequisites', 'code name')
      .lean();
    if (!doc) throw new NotFoundException('Course not found');
    return doc;
  }

  async remove(id: string): Promise<void> {
    const doc = await this.courseModel.findByIdAndDelete(id).lean();
    if (!doc) throw new NotFoundException('Course not found');
    // Remove this course from other courses' prerequisites
    await this.courseModel.updateMany(
      { prerequisites: new Types.ObjectId(id) },
      { $pull: { prerequisites: new Types.ObjectId(id) } },
    );
  }

  /** Used by declarations to verify prerequisites are satisfied */
  async findPrerequisiteIds(courseId: string): Promise<Types.ObjectId[]> {
    const doc = await this.courseModel.findById(courseId).lean();
    if (!doc) throw new NotFoundException('Course not found');
    return doc.prerequisites;
  }
}
