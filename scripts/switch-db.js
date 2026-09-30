const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const target = process.argv[2] || 'sqlite'; // 'sqlite' or 'supabase'

const rootDir = path.resolve(__dirname, '..');
const prismaDir = path.join(rootDir, 'prisma');
const envPath = path.join(rootDir, '.env');

console.log(`🔄 Alternando ambiente de banco para: ${target.toUpperCase()}...`);

if (target === 'sqlite') {
  const sqliteSchema = path.join(prismaDir, 'schema.sqlite.prisma');
  const targetSchema = path.join(prismaDir, 'schema.prisma');
  fs.copyFileSync(sqliteSchema, targetSchema);

  // Atualizar .env para SQLite local
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    envContent = envContent.replace(
      /DATABASE_URL=".*?"/,
      'DATABASE_URL="file:./dev.db"'
    );
    if (!envContent.includes('DATABASE_URL="file:./dev.db"')) {
      envContent = `DATABASE_URL="file:./dev.db"\n` + envContent;
    }
    fs.writeFileSync(envPath, envContent, 'utf8');
  }

  console.log('✅ Prisma configurado para SQLite Local (dev.db)');
} else if (target === 'supabase' || target === 'postgres') {
  const postgresSchema = path.join(prismaDir, 'schema.postgresql.prisma');
  const targetSchema = path.join(prismaDir, 'schema.prisma');
  fs.copyFileSync(postgresSchema, targetSchema);

  console.log('✅ Prisma configurado para PostgreSQL / Supabase (Vercel Deploy)');
} else {
  console.error('❌ Opção inválida. Use "sqlite" ou "supabase".');
  process.exit(1);
}

try {
  console.log('📦 Gerando Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit', cwd: rootDir });
  console.log('🎉 Pronto! Ambiente configurado com sucesso.');
} catch (err) {
  console.error('❌ Erro ao gerar cliente prisma:', err.message);
}
