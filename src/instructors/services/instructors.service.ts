import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateInstructorDto } from '../dto/create-instructor.dto';
import { UpdateInstructorDto } from '../dto/update-instructor.dto';
import { Instructor, InstructorDocument } from '../schemas/instructor.schema';

@Injectable()
export class InstructorsService {
  constructor(
    @InjectModel(Instructor.name)
    private readonly instructorModel: Model<InstructorDocument>,
  ) {}

  async create(dto: CreateInstructorDto): Promise<InstructorDocument> {
    const exists = await this.instructorModel
      .findOne({ userId: new Types.ObjectId(dto.userId) })
      .lean();
    if (exists)
      throw new ConflictException('A profile already exists for this user');
    return this.instructorModel.create({
      ...dto,
      userId: new Types.ObjectId(dto.userId),
    });
  }

  async findAll(): Promise<InstructorDocument[]> {
    return this.instructorModel.find().populate('userId', 'login role').lean();
  }

  async findById(id: string): Promise<InstructorDocument> {
    const doc = await this.instructorModel
      .findById(id)
      .populate('userId', 'login role')
      .lean();
    if (!doc) throw new NotFoundException('Instructor not found');
    return doc;
  }

  async findByUserId(userId: string): Promise<InstructorDocument> {
    const doc = await this.instructorModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .lean();
    if (!doc) throw new NotFoundException('Instructor profile not found');
    return doc;
  }

  async update(
    id: string,
    dto: UpdateInstructorDto,
  ): Promise<InstructorDocument> {
    const doc = await this.instructorModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .lean();
    if (!doc) throw new NotFoundException('Instructor not found');
    return doc;
  }

  async remove(id: string): Promise<void> {
    const doc = await this.instructorModel.findByIdAndDelete(id).lean();
    if (!doc) throw new NotFoundException('Instructor not found');
  }
}
