/**
 * Demo seed — populates realistic data for testing and the presentation video.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/seed-demo.ts
 *
 * Requires the admin seed to have run first (seed.ts).
 * Safe to re-run — skips documents that already exist (upsert by unique key).
 */

import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import mongoose, { Types } from 'mongoose';

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI ?? 'mongodb://localhost:27017/grade_manager';
const SALT_ROUNDS = 12;

// ─── Minimal schemas (mirrors the real ones) ──────────────────────────────────

const UserSchema = new mongoose.Schema(
  {
    login: String,
    passwordHash: String,
    role: String,
    profileId: mongoose.Schema.Types.ObjectId,
    isApproved: Boolean,
  },
  { timestamps: true, collection: 'users' },
);

const InstructorSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    rank: String,
    userId: mongoose.Schema.Types.ObjectId,
  },
  { timestamps: true, collection: 'instructors' },
);

const StudentSchema = new mongoose.Schema(
  {
    registrationNumber: String,
    firstName: String,
    lastName: String,
    enrollmentYear: Number,
    userId: mongoose.Schema.Types.ObjectId,
  },
  { timestamps: true, collection: 'students' },
);

const CourseSchema = new mongoose.Schema(
  {
    code: String,
    name: String,
    description: String,
    prerequisites: [mongoose.Schema.Types.ObjectId],
  },
  { timestamps: true, collection: 'courses' },
);

const TeachingSchema = new mongoose.Schema(
  {
    course: mongoose.Schema.Types.ObjectId,
    year: Number,
    semester: String,
    instructor: mongoose.Schema.Types.ObjectId,
    state: String,
    theoryWeight: Number,
    labWeight: Number,
    theoryRetentionYear: Number,
    labRetentionYear: Number,
  },
  { timestamps: true, collection: 'teachings' },
);

const DeclarationSchema = new mongoose.Schema(
  {
    teaching: mongoose.Schema.Types.ObjectId,
    student: mongoose.Schema.Types.ObjectId,
    state: String,
    theoryGrade: Number,
    labGrade: Number,
    finalGrade: Number,
  },
  { timestamps: true, collection: 'declarations' },
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function upsertUser(
  User: mongoose.Model<any>,
  login: string,
  password: string,
  role: string,
  profileId: Types.ObjectId | null = null,
) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  return User.findOneAndUpdate(
    { login },
    { login, passwordHash, role, profileId, isApproved: true },
    { upsert: true, new: true },
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seedDemo() {
  console.log('Connecting to MongoDB…');
  await mongoose.connect(MONGODB_URI);

  const User = mongoose.model('User', UserSchema);
  const Instructor = mongoose.model('Instructor', InstructorSchema);
  const Student = mongoose.model('Student', StudentSchema);
  const Course = mongoose.model('Course', CourseSchema);
  const Teaching = mongoose.model('Teaching', TeachingSchema);
  const Declaration = mongoose.model('Declaration', DeclarationSchema);

  // ── Instructors ─────────────────────────────────────────────────────────────
  console.log('Seeding instructors…');

  const instrUser1 = await upsertUser(
    User,
    'ppapadopoulos',
    'Pass1234!',
    'instructor',
  );
  const instrUser2 = await upsertUser(
    User,
    'mkonstantinou',
    'Pass1234!',
    'instructor',
  );

  const instr1 = await Instructor.findOneAndUpdate(
    { userId: instrUser1._id },
    {
      firstName: 'Petros',
      lastName: 'Papadopoulos',
      rank: 'professor',
      userId: instrUser1._id,
    },
    { upsert: true, new: true },
  );
  const instr2 = await Instructor.findOneAndUpdate(
    { userId: instrUser2._id },
    {
      firstName: 'Maria',
      lastName: 'Konstantinou',
      rank: 'associate',
      userId: instrUser2._id,
    },
    { upsert: true, new: true },
  );

  // Update profileId on user accounts
  await User.findByIdAndUpdate(instrUser1._id, { profileId: instr1._id });
  await User.findByIdAndUpdate(instrUser2._id, { profileId: instr2._id });

  // ── Students ────────────────────────────────────────────────────────────────
  console.log('Seeding students…');

  const studentData = [
    {
      login: 'student_nik',
      am: 'CS2101',
      first: 'Nikos',
      last: 'Alexandrou',
      year: 2021,
    },
    {
      login: 'student_eli',
      am: 'CS2102',
      first: 'Eleni',
      last: 'Georgiou',
      year: 2021,
    },
    {
      login: 'student_dim',
      am: 'CS2201',
      first: 'Dimitris',
      last: 'Vasileiadis',
      year: 2022,
    },
    {
      login: 'student_sof',
      am: 'CS2202',
      first: 'Sofia',
      last: 'Papadimitriou',
      year: 2022,
    },
  ];

  const studentDocs: { doc: any; userId: any }[] = [];
  for (const s of studentData) {
    const u = await upsertUser(User, s.login, 'Pass1234!', 'student');
    const doc = await Student.findOneAndUpdate(
      { registrationNumber: s.am },
      {
        registrationNumber: s.am,
        firstName: s.first,
        lastName: s.last,
        enrollmentYear: s.year,
        userId: u._id,
      },
      { upsert: true, new: true },
    );
    await User.findByIdAndUpdate(u._id, { profileId: doc._id });
    studentDocs.push({ doc, userId: u._id });
  }

  // ── Courses ─────────────────────────────────────────────────────────────────
  console.log('Seeding courses…');

  const cs101 = await Course.findOneAndUpdate(
    { code: 'CS101' },
    {
      code: 'CS101',
      name: 'Introduction to Programming',
      description: 'Basic programming concepts using Python.',
      prerequisites: [],
    },
    { upsert: true, new: true },
  );
  const cs201 = await Course.findOneAndUpdate(
    { code: 'CS201' },
    {
      code: 'CS201',
      name: 'Data Structures',
      description: 'Arrays, lists, trees, graphs.',
      prerequisites: [cs101._id],
    },
    { upsert: true, new: true },
  );
  const cs301 = await Course.findOneAndUpdate(
    { code: 'CS301' },
    {
      code: 'CS301',
      name: 'Algorithms',
      description: 'Sorting, searching, complexity.',
      prerequisites: [cs201._id],
    },
    { upsert: true, new: true },
  );
  const cs202 = await Course.findOneAndUpdate(
    { code: 'CS202' },
    {
      code: 'CS202',
      name: 'Databases',
      description: 'Relational and NoSQL databases.',
      prerequisites: [cs101._id],
    },
    { upsert: true, new: true },
  );

  // ── Teachings ────────────────────────────────────────────────────────────────
  console.log('Seeding teachings…');

  const t1 = await Teaching.findOneAndUpdate(
    { course: cs101._id, year: 2024, semester: 'fall' },
    {
      course: cs101._id,
      year: 2024,
      semester: 'fall',
      instructor: instr1._id,
      state: 'fully_graded',
      theoryWeight: 0.7,
      labWeight: 0.3,
    },
    { upsert: true, new: true },
  );

  const t2 = await Teaching.findOneAndUpdate(
    { course: cs201._id, year: 2024, semester: 'fall' },
    {
      course: cs201._id,
      year: 2024,
      semester: 'fall',
      instructor: instr1._id,
      state: 'partially_graded',
      theoryWeight: 0.6,
      labWeight: 0.4,
    },
    { upsert: true, new: true },
  );

  const t3 = await Teaching.findOneAndUpdate(
    { course: cs202._id, year: 2024, semester: 'fall' },
    {
      course: cs202._id,
      year: 2024,
      semester: 'fall',
      instructor: instr2._id,
      state: 'grading_defined',
      theoryWeight: 0.5,
      labWeight: 0.5,
    },
    { upsert: true, new: true },
  );

  // Current semester — assigned, grading not yet defined
  const t4 = await Teaching.findOneAndUpdate(
    { course: cs101._id, year: 2025, semester: 'spring' },
    {
      course: cs101._id,
      year: 2025,
      semester: 'spring',
      instructor: instr2._id,
      state: 'assigned',
    },
    { upsert: true, new: true },
  );

  // ── Declarations + grades ───────────────────────────────────────────────────
  console.log('Seeding declarations…');

  const gradeMatrix = [
    // [teachingDoc, studentIndex, theory, lab, state]
    [t1, 0, 7.5, 8.0, 'finalized'],
    [t1, 1, 5.0, 6.0, 'finalized'],
    [t1, 2, 9.0, 9.5, 'finalized'],
    [t1, 3, 3.5, 4.0, 'finalized'], // failed
    [t2, 0, 6.0, null, 'partial'],
    [t2, 1, 7.0, null, 'partial'],
    [t3, 2, null, null, 'partial'],
    [t3, 3, null, null, 'partial'],
    [t4, 0, null, null, 'partial'],
    [t4, 1, null, null, 'partial'],
  ] as const;

  for (const [teaching, si, theory, lab, dState] of gradeMatrix) {
    const student = studentDocs[si].doc;
    const tw = (teaching as any).theoryWeight ?? null;
    const lw = (teaching as any).labWeight ?? null;
    const final =
      theory !== null && lab !== null && tw !== null && lw !== null
        ? tw * (theory as number) + lw * (lab as number)
        : null;

    await Declaration.findOneAndUpdate(
      { teaching: (teaching as any)._id, student: student._id },
      {
        teaching: (teaching as any)._id,
        student: student._id,
        state: dState,
        theoryGrade: theory,
        labGrade: lab,
        finalGrade: final,
      },
      { upsert: true, new: true },
    );
  }

  console.log('Demo seed complete.');
  console.log('─────────────────────────────────────────');
  console.log('Logins (password: Pass1234! for all)');
  console.log('  Instructors : ppapadopoulos, mkonstantinou');
  console.log(
    '  Students    : student_nik, student_eli, student_dim, student_sof',
  );
  console.log('  Admin       : admin  (see .env ADMIN_PASSWORD)');

  await mongoose.disconnect();
}

seedDemo().catch((err) => {
  console.error('Demo seed failed:', err);
  process.exit(1);
});
