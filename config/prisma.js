const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const fs = require('fs');
const path = require('path');

const globalForPrisma = globalThis;

const caPath = path.join(__dirname, '..', 'certs', 'supabase-ca.crt');
if (!fs.existsSync(caPath)) {
  throw new Error('Missing certs/supabase-ca.crt (Supabase CA certificate). Download it from Supabase Dashboard > Project Settings > Database > SSL Configuration.');
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { ca: fs.readFileSync(caPath, 'utf8') },
});

const prisma = globalForPrisma.prisma || new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = { prisma };