import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StudentsController } from './controllers/students.controller';
import { Student, StudentSchema } from './schemas/student.schema';
import { StudentsService } from './services/students.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Student.name, schema: StudentSchema }]),
  ],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService, MongooseModule],
})
export class StudentsModule {}
