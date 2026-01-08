const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'harris@admin.com' },
  });

  if (existingAdmin) {
    console.log('ℹ️  Admin user already exists, skipping creation...');
  } else {
    // Hash password
    const hashedPassword = await bcrypt.hash('12345678', 10);

    // Create default admin user
    const adminUser = await prisma.user.create({
      data: {
        email: 'harris@admin.com',
        name: 'harris',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    console.log('✅ Default admin user created:', {
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role,
    });
  }

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

