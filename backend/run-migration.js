const { execSync } = require('child_process');

console.log('🚀 Exécution de la migration Prisma...\n');

try {
  // Générer le client Prisma
  console.log('1️⃣ Génération du client Prisma...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // Appliquer le schéma à la base de données
  console.log('\n2️⃣ Application du schéma à la base de données...');
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  
  console.log('\n✅ Migration terminée avec succès!');
} catch (error) {
  console.error('\n❌ Erreur lors de la migration:', error.message);
  process.exit(1);
}
