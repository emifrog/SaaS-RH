const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('🔧 Création d\'un utilisateur test...');

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash('test123', 10);

    // Créer un centre si nécessaire
    let centre = await prisma.centre.findFirst({
      where: { code: 'TEST_CENTRE' }
    });

    if (!centre) {
      centre = await prisma.centre.create({
        data: {
          code: 'TEST_CENTRE',
          nom: 'Centre Test',
          type: 'CIS',
          adresse: '1 Rue Test',
          ville: 'Nice',
          codePostal: '06000',
          telephone: '0400000000',
          email: 'test@sdis06.fr',
          actif: true,
        },
      });
      console.log('✅ Centre test créé');
    }

    // Créer un rôle admin si nécessaire
    let adminRole = await prisma.role.findFirst({
      where: { code: 'ADMIN' }
    });

    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: {
          code: 'ADMIN',
          libelle: 'Administrateur',
          permissions: ['export.tta', 'export.fmpa', 'admin.all']
        }
      });
      console.log('✅ Rôle admin créé');
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.personnel.findUnique({
      where: { matricule: 'TEST001' }
    });

    if (existingUser) {
      console.log('ℹ️  Utilisateur test existe déjà');
      console.log('📋 Informations de connexion :');
      console.log('   Matricule: TEST001');
      console.log('   Mot de passe: test123');
      return;
    }

    // Créer l'utilisateur test
    const testUser = await prisma.personnel.create({
      data: {
        matricule: 'TEST001',
        nom: 'TEST',
        prenom: 'User',
        email: 'test@sdis06.fr',
        telephone: '0600000000',
        password: hashedPassword,
        centreId: centre.id,
        categorie: 'SPP',
        statut: 'ACTIF',
        dateEntree: new Date(),
      },
    });

    // Assigner le rôle admin
    await prisma.personnelRole.create({
      data: {
        personnelId: testUser.id,
        roleId: adminRole.id,
        dateAttribution: new Date(),
      }
    });

    console.log('✅ Utilisateur test créé avec succès !');
    console.log('');
    console.log('📋 Informations de connexion :');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   Matricule: TEST001');
    console.log('   Mot de passe: test123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'utilisateur test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
