import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InstructorsController } from './controllers/instructors.controller';
import { Instructor, InstructorSchema } from './schemas/instructor.schema';
import { InstructorsService } from './services/instructors.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Instructor.name, schema: InstructorSchema },
    ]),
  ],
  controllers: [InstructorsController],
  providers: [InstructorsService],
  exports: [InstructorsService, MongooseModule],
})
export class InstructorsModule {}
