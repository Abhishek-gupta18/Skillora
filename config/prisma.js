const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const fs = require('fs');
const path = require('path');

const globalForPrisma = globalThis;

// SSL configuration: respect DATABASE_SSL and DATABASE_SSL_CA_PATH env vars
let sslConfig;
const dbSSL = process.env.DATABASE_SSL;
const dbSSLCAPath = process.env.DATABASE_SSL_CA_PATH;

if (dbSSL === 'false') {
  // No SSL - explicitly pass false to PrismaPg
  sslConfig = false;
} else {
  let caPath;
  if (dbSSLCAPath) {
    caPath = dbSSLCAPath;
  } else {
    caPath = path.join(__dirname, '..', 'certs', 'supabase-ca.crt');
    if (!fs.existsSync(caPath)) {
      throw new Error(
        'Missing certs/supabase-ca.crt (Supabase CA certificate). ' +
        'Download it from Supabase Dashboard > Project Settings > Database > SSL Configuration, ' +
        'or set DATABASE_SSL_CA_PATH to the path of your CA certificate file.'
      );
    }
  }
  sslConfig = { ca: fs.readFileSync(caPath, 'utf8') };
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
});

const prisma = globalForPrisma.prisma || new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = { prisma };