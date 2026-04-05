import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtPayload } from '../../auth/domain/jwt-payload.interface';
import { Role } from '../../auth/domain/role.enum';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CreateTeachingDto } from '../dto/create-teaching.dto';
import { QueryTeachingsDto } from '../dto/query-teaching.dto';
import { TeachingsService } from '../services/teaching.service';
import { DefineGradingDto } from '../dto/define-grade.dto';
import { AssignInstructorDto } from '../dto/assign-instructor.dto';

@Controller('teachings')
export class TeachingsController {
  constructor(private readonly teachingsService: TeachingsService) {}

  // Public
  @Get()
  findAll(@Query() query: QueryTeachingsDto) {
    return this.teachingsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teachingsService.findById(id);
  }

  // Admin: create, assign instructor, expire semester, delete
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateTeachingDto) {
    return this.teachingsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/assign')
  assignInstructor(@Param('id') id: string, @Body() dto: AssignInstructorDto) {
    return this.teachingsService.assignInstructor(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/expire')
  expireSemester(@Param('id') id: string) {
    return this.teachingsService.expireSemester(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.teachingsService.remove(id);
  }

  // Instructor: define/update grading, finalize grades
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @Patch(':id/grading')
  defineGrading(
    @Param('id') id: string,
    @Body() dto: DefineGradingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.teachingsService.defineGrading(id, dto, user.profileId!);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @Patch(':id/finalize')
  finalizeGrades(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.teachingsService.finalizeGrades(id, user.profileId!);
  }
}
