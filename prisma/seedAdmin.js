const { hashPassword } = require('../utils/password');
const { prisma } = require('../config/prisma');

/**
 * Bootstrap script: creates a single admin user.
 * 
 * Reads ADMIN_EMAIL and ADMIN_PASSWORD from environment variables.
 * MUST NOT be committed to git — these are only used by this script.
 * Add both to .env.example with a comment that they are ONLY used
 * by this script and can be removed from .env after the admin is created.
 * 
 * If ADMIN_EMAIL or ADMIN_PASSWORD is missing, prints a clear error and
 * exits with code 1 — does NOT create an admin with a default/hardcoded
 * password under any circumstance.
 * 
 * Checks if a User with that email already exists:
 *   - if yes AND role is already ADMIN: log "Admin already exists,
     nothing to do" and exit 0
 *   - if yes AND role is CANDIDATE: print error explaining a candidate
     account with this email already exists, and exit 1 (promoting an
     existing candidate account to admin should be a deliberate, separate
     decision, not a side effect of running this script)
 *   - if no such user: hash ADMIN_PASSWORD with hashPassword(), create a
     User with role: 'ADMIN', isEmailVerified: true
 * 
 * This script does NOT create a Profile for the admin (Profile/18
 * sections are a candidate concept; admins don't have one).
 * 
 * Same disconnect/exit pattern as prisma/seed.js.
 */
async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error(
      'Error: ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment variables.'
    );
    process.exit(1);
  }

  // Check if a user with this email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingUser) {
    if (existingUser.role === 'ADMIN') {
      console.log('Admin already exists, nothing to do');
      return; // fall through to outer .then() which disconnects and exits 0
    } else if (existingUser.role === 'CANDIDATE') {
      throw new Error(
        `A candidate account with email "${adminEmail}" already exists. ` +
          'Promoting an existing candidate account to admin should be a ' +
          'deliberate, separate decision, not a side effect of running this script.'
      );
    }
  }

  // Create the admin user
  const passwordHash = await hashPassword(adminPassword);

  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      role: 'ADMIN',
      isEmailVerified: true,
    },
  });

  console.log(`Admin created: ${adminUser.email} with role ADMIN`);
  // falls through to outer .then() which disconnects and exits 0
}

main()
  .catch((e) => {
    console.error('Admin seeding failed:', e);
    return prisma.$disconnect().finally(() => process.exit(1));
  })
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });