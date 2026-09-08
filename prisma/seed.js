const { prisma } = require('../config/prisma');

const skills = [
  { name: 'JavaScript', category: 'Programming Languages' },
  { name: 'Python', category: 'Programming Languages' },
  { name: 'Java', category: 'Programming Languages' },
  { name: 'C++', category: 'Programming Languages' },
  { name: 'TypeScript', category: 'Programming Languages' },
  { name: 'Go', category: 'Programming Languages' },
  { name: 'Rust', category: 'Programming Languages' },
  { name: 'C#', category: 'Programming Languages' },
  { name: 'Ruby', category: 'Programming Languages' },
  { name: 'PHP', category: 'Programming Languages' },

  { name: 'React', category: 'Web Development' },
  { name: 'Node.js', category: 'Web Development' },
  { name: 'Express', category: 'Web Development' },
  { name: 'HTML/CSS', category: 'Web Development' },
  { name: 'REST APIs', category: 'Web Development' },
  { name: 'GraphQL', category: 'Web Development' },
  { name: 'Next.js', category: 'Web Development' },
  { name: 'Vue.js', category: 'Web Development' },
  { name: 'Webpack', category: 'Web Development' },
  { name: 'Tailwind CSS', category: 'Web Development' },

  { name: 'PostgreSQL', category: 'Databases' },
  { name: 'MongoDB', category: 'Databases' },
  { name: 'MySQL', category: 'Databases' },
  { name: 'Redis', category: 'Databases' },
  { name: 'SQLite', category: 'Databases' },
  { name: 'DynamoDB', category: 'Databases' },
  { name: 'Elasticsearch', category: 'Databases' },
  { name: 'Cassandra', category: 'Databases' },
  { name: 'MariaDB', category: 'Databases' },
  { name: 'Firebase', category: 'Databases' },

  { name: 'AWS', category: 'Cloud & DevOps' },
  { name: 'Docker', category: 'Cloud & DevOps' },
  { name: 'Kubernetes', category: 'Cloud & DevOps' },
  { name: 'CI/CD', category: 'Cloud & DevOps' },
  { name: 'Git', category: 'Cloud & DevOps' },
  { name: 'Terraform', category: 'Cloud & DevOps' },
  { name: 'Ansible', category: 'Cloud & DevOps' },
  { name: 'Jenkins', category: 'Cloud & DevOps' },
  { name: 'GitHub Actions', category: 'Cloud & DevOps' },
  { name: 'Prometheus', category: 'Cloud & DevOps' },

  { name: 'Machine Learning', category: 'Data & AI' },
  { name: 'Data Analysis', category: 'Data & AI' },
  { name: 'SQL', category: 'Data & AI' },
  { name: 'Pandas', category: 'Data & AI' },
  { name: 'TensorFlow', category: 'Data & AI' },
  { name: 'PyTorch', category: 'Data & AI' },
  { name: 'Scikit-learn', category: 'Data & AI' },
  { name: 'Data Visualization', category: 'Data & AI' },
  { name: 'Big Data', category: 'Data & AI' },
  { name: 'NLP', category: 'Data & AI' },

  { name: 'Communication', category: 'Soft Skills' },
  { name: 'Leadership', category: 'Soft Skills' },
  { name: 'Team Collaboration', category: 'Soft Skills' },
  { name: 'Problem Solving', category: 'Soft Skills' },
  { name: 'Critical Thinking', category: 'Soft Skills' },
  { name: 'Time Management', category: 'Soft Skills' },
  { name: 'Adaptability', category: 'Soft Skills' },
  { name: 'Mentoring', category: 'Soft Skills' },
  { name: 'Public Speaking', category: 'Soft Skills' },
  { name: 'Conflict Resolution', category: 'Soft Skills' },
];

async function main() {
  let created = 0;
  let updated = 0;

  for (const skill of skills) {
    const existing = await prisma.skill.findUnique({ where: { name: skill.name } });

    await prisma.skill.upsert({
      where: { name: skill.name },
      create: skill,
      update: { category: skill.category },
    });

    if (existing === null) {
      created++;
    } else {
      updated++;
    }
  }

  console.log(`Seeding complete: ${created} skills created, ${updated} skills already existed.`);
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    return prisma.$disconnect().finally(() => process.exit(1));
  })
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
