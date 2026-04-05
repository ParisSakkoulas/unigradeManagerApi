import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateStudentDto } from '../dto/create-student.dto';
import { UpdateStudentDto } from '../dto/update-student.dto';
import { Student, StudentDocument } from '../schemas/student.schema';

@Injectable()
export class StudentsService {
  constructor(
    @InjectModel(Student.name)
    private readonly studentModel: Model<StudentDocument>,
  ) {}

  async create(dto: CreateStudentDto): Promise<StudentDocument> {
    const exists = await this.studentModel
      .findOne({
        $or: [
          { registrationNumber: dto.registrationNumber },
          { userId: new Types.ObjectId(dto.userId) },
        ],
      })
      .lean();
    if (exists)
      throw new ConflictException('Student or user already has a profile');
    return this.studentModel.create({
      ...dto,
      userId: new Types.ObjectId(dto.userId),
    });
  }

  async findAll(): Promise<StudentDocument[]> {
    return this.studentModel.find().populate('userId', 'login role').lean();
  }

  async findById(id: string): Promise<StudentDocument> {
    const doc = await this.studentModel
      .findById(id)
      .populate('userId', 'login role')
      .lean();
    if (!doc) throw new NotFoundException('Student not found');
    return doc;
  }

  async findByUserId(userId: string): Promise<StudentDocument> {
    const doc = await this.studentModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .lean();
    if (!doc) throw new NotFoundException('Student profile not found');
    return doc;
  }

  async update(id: string, dto: UpdateStudentDto): Promise<StudentDocument> {
    const doc = await this.studentModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .lean();
    if (!doc) throw new NotFoundException('Student not found');
    return doc;
  }

  async remove(id: string): Promise<void> {
    const doc = await this.studentModel.findByIdAndDelete(id).lean();
    if (!doc) throw new NotFoundException('Student not found');
  }
}
