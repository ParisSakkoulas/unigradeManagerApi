import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TeachingsModule } from '../teachings/teachings.module';
import { DeclarationsController } from './controllers/declarations.controller';
import { Declaration, DeclarationSchema } from './schemas/declaration.schema';
import { DeclarationsService } from './services/declaration.service';
import { StudentsModule } from 'src/students/students.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Declaration.name, schema: DeclarationSchema },
    ]),
    TeachingsModule,
    StudentsModule,
  ],
  controllers: [DeclarationsController],
  providers: [DeclarationsService],
  exports: [DeclarationsService],
})
export class DeclarationsModule {}
