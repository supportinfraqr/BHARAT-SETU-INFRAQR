// Contractor Skills & Courses — CSV BSS_contractor.csv / 71
// "Old app provides creation of course modules with video lectures and auto
//  certificate generation after completion; this module is not available in
//  new app." This dataset powers the Contractor Skills Centre.

export type ContractorCourseModule = {
  id: string;
  title: string;
  duration: string;
  completed: boolean; // simulated learner progress on the demo course detail page
};

export type ContractorCourse = {
  id: string;
  title: string;
  category: string;
  provider: string;
  duration: string;
  instructor: string;
  certification: string;
  description: string;
  image: string;
  status: 'Draft' | 'Published';
  learners: number;
  completedLearners: number;
  certificatesIssued: number;
  publishedOn?: string;
  modules: ContractorCourseModule[];
};

export const contractorCourses: ContractorCourse[] = [
  {
    id: 'course-101',
    title: 'Site Induction & Safety Awareness',
    category: 'Safety',
    provider: 'RK Buildcon Skilling Academy',
    duration: '6 Hours',
    instructor: 'Rajesh Kumar, Safety Officer',
    certification: 'RK Buildcon Safety Badge',
    description: 'Mandatory pre-site induction course for every worker bound to our projects. Covers site rules, emergency procedures, PPE usage and health & safety responsibilities before a gate pass is issued.',
    image: '/images/scaffolding_safety.png',
    status: 'Published',
    learners: 0,
    completedLearners: 0,
    certificatesIssued: 0,
    publishedOn: '2026-07-10',
    modules: [
      { id: 'm1', title: 'Introduction to Site Rules & Zones', duration: '60 mins', completed: true },
      { id: 'm2', title: 'PPE & Personal Protective Equipment', duration: '90 mins', completed: true },
      { id: 'm3', title: 'Emergency & Evacuation Procedures', duration: '90 mins', completed: true },
      { id: 'm4', title: 'Health & Safety Responsibilities', duration: '60 mins', completed: true },
    ],
  },
  {
    id: 'course-102',
    title: 'Bar Bending & Rebar Workmanship',
    category: 'Technical',
    provider: 'RK Buildcon Skilling Academy',
    duration: '12 Hours',
    instructor: 'Amit Desai, Lead Engineer',
    certification: 'Certified Bar Bender (L3)',
    description: 'Advanced rebar techniques for metro and high-rise works — cutting schedules, lapping, bending tolerances and site quality checks. Certificate auto-issues when all video lessons are completed.',
    image: '/images/masonry_skills.png',
    status: 'Published',
    learners: 0,
    completedLearners: 0,
    certificatesIssued: 0,
    publishedOn: '2026-06-18',
    modules: [
      { id: 'm1', title: 'Reading Bar Bending Schedules', duration: '3 Hours', completed: true },
      { id: 'm2', title: 'Cutting, Bending & Tolerances', duration: '4 Hours', completed: true },
      { id: 'm3', title: 'Lapping, Cover & Fixing', duration: '3 Hours', completed: false },
      { id: 'm4', title: 'Quality Checks on Site', duration: '2 Hours', completed: false },
    ],
  },
  {
    id: 'course-103',
    title: 'Digital Wage & PF Awareness',
    category: 'Life Skills',
    provider: 'Bharat Shram Setu',
    duration: '2 Hours',
    instructor: 'BSS Digital Empowerment Team',
    certification: 'Digital Citizen Certificate',
    description: 'How workers can verify wage slips, EPF contributions and grievance channels digitally. Draft course — review and publish from the course dashboard.',
    image: '/images/financial_literacy.png',
    status: 'Draft',
    learners: 0,
    completedLearners: 0,
    certificatesIssued: 0,
    modules: [
      { id: 'm1', title: 'Reading Your Wage Slip', duration: '40 mins', completed: false },
      { id: 'm2', title: 'EPF & ESIC Basics', duration: '40 mins', completed: false },
      { id: 'm3', title: 'Raising Grievances Digitally', duration: '40 mins', completed: false },
    ],
  },
];

export const courseCategories = ['Safety', 'Technical', 'Life Skills', 'Compliance', 'Leadership'] as const;
export const courseDurations = ['2 Hours', '4 Hours', '6 Hours', '12 Hours'] as const;
