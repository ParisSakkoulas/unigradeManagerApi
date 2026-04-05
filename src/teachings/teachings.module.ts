import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TeachingsController } from './controllers/teachings.controller';
import { Teaching, TeachingSchema } from './schemas/teaching.schema';
import { TeachingsService } from './services/teaching.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Teaching.name, schema: TeachingSchema },
    ]),
  ],
  controllers: [TeachingsController],
  providers: [TeachingsService],
  exports: [TeachingsService, MongooseModule],
})
export class TeachingsModule {}
