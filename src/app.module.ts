import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { CoursesModule } from './courses/course.module';
import { DeclarationsModule } from './declarations/declarations.module';
import { InstructorsModule } from './instructors/instructors.module';
import { StudentsModule } from './students/students.module';
import { TeachingsModule } from './teachings/teachings.module';

@Module({
  imports: [
    // Config — reads .env
    ConfigModule.forRoot({ isGlobal: true }),

    // MongoDB
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
    }),

    AuthModule,
    InstructorsModule,
    StudentsModule,
    CoursesModule,
    TeachingsModule,
    DeclarationsModule,
  ],
})
export class AppModule {}
