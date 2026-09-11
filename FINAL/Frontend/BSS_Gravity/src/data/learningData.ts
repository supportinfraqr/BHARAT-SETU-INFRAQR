export const learningCourses = [
  {
    id: 'course-1',
    title: "Advanced Scaffolding Safety",
    provider: "NSDC - Skill India",
    duration: "4 Hours",
    rating: 4.8,
    progress: 60,
    image: "/images/scaffolding_safety.png",
    badge: "Mandatory for Site A",
    category: "Safety",
    description: "Learn the latest safety protocols for high-rise scaffolding operations. This mandatory course ensures you comply with national safety standards and reduces on-site accident risks.",
    modules: [
      { id: 'm1', title: "Introduction to Scaffolding Risks", duration: "45 mins", completed: true },
      { id: 'm2', title: "Harnesses & Personal Protective Equipment (PPE)", duration: "60 mins", completed: true },
      { id: 'm3', title: "Structural Integrity Checks", duration: "90 mins", completed: false },
      { id: 'm4', title: "Emergency Procedures", duration: "45 mins", completed: false }
    ],
    instructor: "Rajesh Kumar, Safety Officer",
    certification: "NSDC Safety Badge"
  },
  {
    id: 'course-2',
    title: "Digital Financial Literacy",
    provider: "Bharat Shram Setu",
    duration: "2 Hours",
    rating: 4.9,
    progress: 0,
    image: "/images/financial_literacy.png",
    badge: "Highly Recommended",
    category: "Life Skills",
    description: "A comprehensive guide for blue-collar workers to understand digital banking, UPI payments, and how to safely send money to family without falling for scams.",
    modules: [
      { id: 'm1', title: "Setting up your UPI Account", duration: "30 mins", completed: false },
      { id: 'm2', title: "Sending Money Securely", duration: "45 mins", completed: false },
      { id: 'm3', title: "Identifying Scams & Frauds", duration: "45 mins", completed: false }
    ],
    instructor: "BSS Digital Empowerment Team",
    certification: "Digital Citizen Certificate"
  },
  {
    id: 'course-3',
    title: "Modern Masonry Techniques",
    provider: "L&T Skilling Institute",
    duration: "12 Hours",
    rating: 4.7,
    progress: 100,
    image: "/images/masonry_skills.png",
    badge: "Completed",
    category: "Technical",
    description: "Upgrade your core masonry skills with modern techniques, proper cement mixing ratios, and time-saving tools used in tier-1 construction projects.",
    modules: [
      { id: 'm1', title: "Understanding Modern Mix Ratios", duration: "3 Hours", completed: true },
      { id: 'm2', title: "Bricklaying Efficiency", duration: "4 Hours", completed: true },
      { id: 'm3', title: "Waterproofing & Curing", duration: "5 Hours", completed: true }
    ],
    instructor: "Amit Desai, Lead Engineer",
    certification: "Advanced Mason (L3)"
  }
];
