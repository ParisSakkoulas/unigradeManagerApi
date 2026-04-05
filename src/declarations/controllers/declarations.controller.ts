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
import { CreateDeclarationDto } from '../dto/create-declaration.dto';
import { BulkGradesDto } from '../dto/bulk-grades.dto';
import { SetGradeDto } from '../dto/set-grade.dto';
import { QueryDeclarationsDto } from '../dto/quere.declaration.dto';
import { DeclarationsService } from '../services/declaration.service';

@Controller('declarations')
export class DeclarationsController {
  constructor(private readonly declarationsService: DeclarationsService) {}

  // ─── Student: manage own declarations ────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT, Role.ADMIN)
  @Post()
  declare(@Body() dto: CreateDeclarationDto, @CurrentUser() user: JwtPayload) {
    return this.declarationsService.declare(dto, user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT, Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  undeclare(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.declarationsService.undeclare(id, user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT, Role.ADMIN)
  @Patch(':id/finalize')
  finalizeDeclaration(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.declarationsService.finalizeDeclaration(id, user.sub);
  }

  // ─── Query ───────────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.INSTRUCTOR, Role.STUDENT)
  @Get()
  findAll(@Query() query: QueryDeclarationsDto) {
    return this.declarationsService.findAll(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.INSTRUCTOR, Role.STUDENT)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.declarationsService.findById(id);
  }

  // ─── Instructor: grade entry ──────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Patch(':id/grade')
  setGrade(
    @Param('id') id: string,
    @Body() dto: SetGradeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.declarationsService.setGrade(id, dto, user.profileId!);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Post('teaching/:teachingId/bulk-grade')
  bulkSetGrades(
    @Param('teachingId') teachingId: string,
    @Body() dto: BulkGradesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.declarationsService.bulkSetGrades(
      teachingId,
      dto,
      user.profileId!,
    );
  }

  // ─── Statistics ───────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Get('teaching/:teachingId/stats')
  getTeachingStats(@Param('teachingId') teachingId: string) {
    return this.declarationsService.getTeachingStats(teachingId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Get('instructor/:instructorId/stats')
  getInstructorStats(@Param('instructorId') instructorId: string) {
    return this.declarationsService.getInstructorStats(instructorId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT, Role.ADMIN)
  @Get('student/:studentId/stats')
  getStudentStats(@Param('studentId') studentId: string) {
    return this.declarationsService.getStudentStats(studentId);
  }
}
