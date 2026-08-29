const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'khalid.pk38@gmail.com' },
    update: {},
    create: {
      email: 'khalid.pk38@gmail.com',
      name: 'Sameer Khalid',
      password: hash,
      roles: 'Supervisor',
    },
  });
  console.log('Database seeded with admin user.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
