export enum TeachingState {
  /** Course entered but not yet assigned to instructor */
  ENTERED = 'entered',
  /** Assigned to instructor for current semester */
  ASSIGNED = 'assigned',
  /** Instructor has defined grading weights */
  GRADING_DEFINED = 'grading_defined',
  /** Grades have been partially entered */
  PARTIALLY_GRADED = 'partially_graded',
  /** All grades finalized — no further edits allowed */
  FULLY_GRADED = 'fully_graded',
}

export enum Semester {
  FALL = 'fall',
  SPRING = 'spring',
}
