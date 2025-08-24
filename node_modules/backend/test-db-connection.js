const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testConnection() {
  console.log('🔍 Test de connexion à la base de données...\n');
  console.log('📍 DATABASE_URL:', process.env.DATABASE_URL ? 'Configurée' : 'Non configurée');
  
  try {
    // Tenter de se connecter
    await prisma.$connect();
    console.log('✅ Connexion à la base de données réussie!\n');
    
    // Tester une requête simple
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Requête de test exécutée avec succès:', result);
    
    // Vérifier les tables
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('\n📊 Tables dans la base de données:');
    if (tables.length > 0) {
      tables.forEach(table => {
        console.log(`   - ${table.table_name}`);
      });
    } else {
      console.log('   Aucune table trouvée');
    }
    
    console.log('\n✅ La base de données est bien connectée et opérationnelle!');
    
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:');
    console.error('   Message:', error.message);
    if (error.code) {
      console.error('   Code:', error.code);
    }
    if (error.meta) {
      console.error('   Détails:', error.meta);
    }
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Connexion fermée');
  }
}

testConnection();
