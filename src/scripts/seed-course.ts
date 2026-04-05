/**
 * Test seed — instructors, students, courses.
 *
 * Usage (from inside api/ folder):
 *   npx ts-node -r tsconfig-paths/register src/scripts/seed-test.ts
 *
 * Or add to package.json:
 *   "seed:test": "ts-node -r tsconfig-paths/register src/scripts/seed-test.ts"
 *
 * Requires:
 *   - MongoDB running
 *   - Admin already seeded (npm run seed)
 *   - api/.env with MONGODB_URI
 *
 * Safe to re-run — uses upsert on unique fields.
 */

import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const URI =
  process.env.MONGODB_URI ?? 'mongodb://localhost:27017/grade_manager';
const SALT_ROUNDS = 10;
const PASSWORD = 'Test1234!';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema(
  {
    login: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true },
    profileId: { type: mongoose.Schema.Types.ObjectId, default: null },
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'users' },
);

const InstructorSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    rank: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'instructors' },
);

const StudentSchema = new mongoose.Schema(
  {
    registrationNumber: { type: String, unique: true },
    firstName: String,
    lastName: String,
    enrollmentYear: Number,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'students' },
);

const CourseSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true },
    name: String,
    description: String,
    prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  },
  { timestamps: true, collection: 'courses' },
);

// ─── Helper ──────────────────────────────────────────────────────────────────

async function upsertUser(
  User: mongoose.Model<any>,
  login: string,
  role: string,
): Promise<mongoose.Document & { _id: mongoose.Types.ObjectId }> {
  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);
  return User.findOneAndUpdate(
    { login },
    { login, passwordHash, role, isApproved: true },
    { upsert: true, new: true },
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\nConnecting to MongoDB…');
  await mongoose.connect(URI);
  console.log('Connected.\n');

  const User = mongoose.model('User', UserSchema);
  const Instructor = mongoose.model('Instructor', InstructorSchema);
  const Student = mongoose.model('Student', StudentSchema);
  const Course = mongoose.model('Course', CourseSchema);

  // ── Instructors ──────────────────────────────────────────────────────────────
  console.log('Seeding instructors…');

  const instructorData = [
    {
      login: 'ppapadopoulos',
      firstName: 'Petros',
      lastName: 'Papadopoulos',
      rank: 'professor',
    },
    {
      login: 'mkonstantinou',
      firstName: 'Maria',
      lastName: 'Konstantinou',
      rank: 'associate',
    },
    {
      login: 'ngeorgiou',
      firstName: 'Nikolaos',
      lastName: 'Georgiou',
      rank: 'assistant',
    },
  ];

  for (const data of instructorData) {
    const user = await upsertUser(User, data.login, 'instructor');
    const instructor = await Instructor.findOneAndUpdate(
      { userId: user._id },
      {
        firstName: data.firstName,
        lastName: data.lastName,
        rank: data.rank,
        userId: user._id,
      },
      { upsert: true, new: true },
    );
    await User.findByIdAndUpdate(user._id, { profileId: instructor._id });
    console.log(`  ✓ ${data.firstName} ${data.lastName} (${data.login})`);
  }

  // ── Students ─────────────────────────────────────────────────────────────────
  console.log('\nSeeding students…');

  const studentData = [
    {
      login: 'student_nikos',
      am: 'CS2101',
      firstName: 'Nikos',
      lastName: 'Alexandrou',
      year: 2021,
    },
    {
      login: 'student_eleni',
      am: 'CS2102',
      firstName: 'Eleni',
      lastName: 'Georgiou',
      year: 2021,
    },
    {
      login: 'student_dim',
      am: 'CS2201',
      firstName: 'Dimitris',
      lastName: 'Vasileiadis',
      year: 2022,
    },
    {
      login: 'student_sofia',
      am: 'CS2202',
      firstName: 'Sofia',
      lastName: 'Papadimitriou',
      year: 2022,
    },
    {
      login: 'student_kostas',
      am: 'CS2301',
      firstName: 'Kostas',
      lastName: 'Andreou',
      year: 2023,
    },
    {
      login: 'student_anna',
      am: 'CS2302',
      firstName: 'Anna',
      lastName: 'Petrou',
      year: 2023,
    },
  ];

  for (const data of studentData) {
    const user = await upsertUser(User, data.login, 'student');
    const student = await Student.findOneAndUpdate(
      { registrationNumber: data.am },
      {
        registrationNumber: data.am,
        firstName: data.firstName,
        lastName: data.lastName,
        enrollmentYear: data.year,
        userId: user._id,
      },
      { upsert: true, new: true },
    );
    await User.findByIdAndUpdate(user._id, { profileId: student._id });
    console.log(`  ✓ ${data.firstName} ${data.lastName} (${data.am})`);
  }

  // ── Courses ───────────────────────────────────────────────────────────────────
  console.log('\nSeeding courses…');

  // Seed in dependency order so prerequisites exist when referenced
  const cs101 = await Course.findOneAndUpdate(
    { code: 'CS101' },
    {
      code: 'CS101',
      name: 'Introduction to Programming',
      description:
        'Fundamental programming concepts using Python. Variables, control flow, functions, and basic data structures.',
      prerequisites: [],
    },
    { upsert: true, new: true },
  );
  console.log('  ✓ CS101 — Introduction to Programming');

  const cs102 = await Course.findOneAndUpdate(
    { code: 'CS102' },
    {
      code: 'CS102',
      name: 'Discrete Mathematics',
      description: 'Logic, set theory, graph theory, and combinatorics.',
      prerequisites: [],
    },
    { upsert: true, new: true },
  );
  console.log('  ✓ CS102 — Discrete Mathematics');

  const cs201 = await Course.findOneAndUpdate(
    { code: 'CS201' },
    {
      code: 'CS201',
      name: 'Data Structures',
      description: 'Arrays, linked lists, stacks, queues, trees, and graphs.',
      prerequisites: [cs101._id],
    },
    { upsert: true, new: true },
  );
  console.log('  ✓ CS201 — Data Structures');

  const cs202 = await Course.findOneAndUpdate(
    { code: 'CS202' },
    {
      code: 'CS202',
      name: 'Databases',
      description:
        'Relational and NoSQL databases. SQL, normalization, transactions.',
      prerequisites: [cs101._id],
    },
    { upsert: true, new: true },
  );
  console.log('  ✓ CS202 — Databases');

  const cs301 = await Course.findOneAndUpdate(
    { code: 'CS301' },
    {
      code: 'CS301',
      name: 'Algorithms',
      description:
        'Sorting, searching, graph algorithms, and complexity analysis.',
      prerequisites: [cs201._id, cs102._id],
    },
    { upsert: true, new: true },
  );
  console.log('  ✓ CS301 — Algorithms');

  const cs302 = await Course.findOneAndUpdate(
    { code: 'CS302' },
    {
      code: 'CS302',
      name: 'Operating Systems',
      description: 'Processes, threads, memory management, and file systems.',
      prerequisites: [cs201._id],
    },
    { upsert: true, new: true },
  );
  console.log('  ✓ CS302 — Operating Systems');

  const cs401 = await Course.findOneAndUpdate(
    { code: 'CS401' },
    {
      code: 'CS401',
      name: 'Software Engineering',
      description: 'SDLC, design patterns, testing, and agile methodologies.',
      prerequisites: [cs301._id, cs202._id],
    },
    { upsert: true, new: true },
  );
  console.log('  ✓ CS401 — Software Engineering');

  const cs402 = await Course.findOneAndUpdate(
    { code: 'CS402' },
    {
      code: 'CS402',
      name: 'Computer Networks',
      description: 'TCP/IP, routing, network security, and protocols.',
      prerequisites: [cs302._id],
    },
    { upsert: true, new: true },
  );
  console.log('  ✓ CS402 — Computer Networks');

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────');
  console.log('Seed complete!');
  console.log('\nAll passwords:', PASSWORD);
  console.log('\nInstructor logins:');
  instructorData.forEach((i) => console.log(`  ${i.login}`));
  console.log('\nStudent logins:');
  studentData.forEach((s) => console.log(`  ${s.login}  (AM: ${s.am})`));
  console.log(
    '\nCourses seeded: CS101, CS102, CS201, CS202, CS301, CS302, CS401, CS402',
  );
  console.log('─────────────────────────────────────────\n');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
