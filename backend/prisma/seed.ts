import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seed...');

  // Créer les centres
  const centres = await Promise.all([
    prisma.centre.create({
      data: {
        code: 'CIS_NICE',
        nom: 'CIS Nice',
        type: 'CIS',
        adresse: '1 Avenue de la République',
        ville: 'Nice',
        codePostal: '06000',
        telephone: '0493000001',
        email: 'cis.nice@sdis06.fr',
      },
    }),
    prisma.centre.create({
      data: {
        code: 'CSP_ANTIBES',
        nom: 'CSP Antibes',
        type: 'CSP',
        adresse: '10 Boulevard Wilson',
        ville: 'Antibes',
        codePostal: '06600',
        telephone: '0493000002',
        email: 'csp.antibes@sdis06.fr',
      },
    }),
    prisma.centre.create({
      data: {
        code: 'CPI_GRASSE',
        nom: 'CPI Grasse',
        type: 'CPI',
        adresse: '5 Rue du Commandant',
        ville: 'Grasse',
        codePostal: '06130',
        telephone: '0493000003',
        email: 'cpi.grasse@sdis06.fr',
      },
    }),
  ]);

  console.log(`✅ ${centres.length} centres créés`);

  // Créer les types de FMPA
  const typesFMPA = await Promise.all([
    prisma.typeFMPA.create({
      data: {
        code: 'FMPA_SAP',
        libelle: 'FMPA Secours à Personne',
        dureeHeures: 7.5,
        description: 'Formation de maintien des acquis en secours à personne',
      },
    }),
    prisma.typeFMPA.create({
      data: {
        code: 'FMPA_INC',
        libelle: 'FMPA Incendie',
        dureeHeures: 4,
        description: 'Formation de maintien des acquis incendie',
      },
    }),
    prisma.typeFMPA.create({
      data: {
        code: 'FMPA_DIV',
        libelle: 'FMPA Opérations Diverses',
        dureeHeures: 3.5,
        description: 'Formation de maintien des acquis opérations diverses',
      },
    }),
  ]);

  console.log(`✅ ${typesFMPA.length} types de FMPA créés`);

  // Créer les personnels avec différents rôles
  const hashedPassword = await bcrypt.hash('Password123!', 10);

  // Admin SDIS
  const admin = await prisma.personnel.create({
    data: {
      matricule: 'ADM001',
      nom: 'DUPONT',
      prenom: 'Jean',
      email: 'admin@sdis06.fr',
      telephone: '0601020304',
      password: hashedPassword,
      centreId: centres[0].id,
      categorie: 'SPP',
      statut: 'ACTIF',
      dateEntree: new Date(),
    },
  });

  // Chef de centre
  const chefCentre = await prisma.personnel.create({
    data: {
      matricule: 'CHF001',
      nom: 'MARTIN',
      prenom: 'Sophie',
      email: 'chef.centre@sdis06.fr',
      telephone: '0601020305',
      password: hashedPassword,
      centreId: centres[0].id,
      categorie: 'SPP',
      statut: 'ACTIF',
      dateEntree: new Date(),
    },
  });

  // Formateur
  const formateur = await prisma.personnel.create({
    data: {
      matricule: 'FOR001',
      nom: 'BERNARD',
      prenom: 'Pierre',
      email: 'formateur@sdis06.fr',
      telephone: '0601020306',
      password: hashedPassword,
      centreId: centres[0].id,
      categorie: 'SPP',
      statut: 'ACTIF',
      dateEntree: new Date(),
    },
  });

  // Sapeurs-pompiers volontaires
  const spvs = await Promise.all([
    prisma.personnel.create({
      data: {
        matricule: 'SPV001',
        nom: 'DURAND',
        prenom: 'Marie',
        email: 'marie.durand@sdis06.fr',
        telephone: '0601020307',
        password: hashedPassword,
        centreId: centres[0].id,
        categorie: 'SPV',
        statut: 'ACTIF',
        dateEntree: new Date(),
      },
    }),
    prisma.personnel.create({
      data: {
        matricule: 'SPV002',
        nom: 'MOREAU',
        prenom: 'Thomas',
        email: 'thomas.moreau@sdis06.fr',
        telephone: '0601020308',
        password: hashedPassword,
        centreId: centres[1].id,
        categorie: 'SPV',
        statut: 'ACTIF',
        dateEntree: new Date(),
      },
    }),
    prisma.personnel.create({
      data: {
        matricule: 'SPV003',
        nom: 'GARCIA',
        prenom: 'Luis',
        email: 'luis.garcia@sdis06.fr',
        telephone: '0601020309',
        password: hashedPassword,
        centreId: centres[0].id,
        categorie: 'SPV',
        statut: 'ACTIF',
        dateEntree: new Date(),
      },
    }),
  ]);

  console.log(`✅ ${3 + spvs.length} personnels créés`);

  // Créer des sessions FMPA
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  
  const sessions = await Promise.all([
    prisma.sessionFMPA.create({
      data: {
        typeFMPAId: typesFMPA[0].id,
        dateDebut: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 10, 8, 0),
        dateFin: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 10, 17, 30),
        lieu: 'CIS Nice - Salle de formation',
        nombrePlacesMax: 12,
        formateurPrincipalId: formateur.id,
        centreId: centres[0].id,
        statut: 'PLANIFIE',
        codeTTA: 'FMPA_SAP_2024',
        tauxHoraire: 12.50,
        commentaires: 'Apporter sa tenue de sport',
      },
    }),
    prisma.sessionFMPA.create({
      data: {
        typeFMPAId: typesFMPA[1].id,
        dateDebut: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 15, 14, 0),
        dateFin: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 15, 18, 0),
        lieu: 'CSP Antibes - Plateau technique',
        nombrePlacesMax: 10,
        formateurPrincipalId: formateur.id,
        centreId: centres[1].id,
        statut: 'CONFIRME',
        codeTTA: 'FMPA_INC_2024',
        tauxHoraire: 15.00,
      },
    }),
  ]);

  console.log(`✅ ${sessions.length} sessions FMPA créées`);

  // Créer quelques inscriptions
  await prisma.inscriptionFMPA.create({
    data: {
      sessionFMPAId: sessions[0].id,
      personnelId: spvs[0].id,
      statutInscription: 'INSCRIT',
    },
  });

  await prisma.inscriptionFMPA.create({
    data: {
      sessionFMPAId: sessions[0].id,
      personnelId: spvs[2].id,
      statutInscription: 'INSCRIT',
    },
  });

  await prisma.sessionFMPA.update({
    where: { id: sessions[0].id },
    data: { nombreInscrits: 2 },
  });

  console.log('✅ Inscriptions créées');

  console.log('\n📋 Comptes de test créés :');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin SDIS    : matricule: ADM001, password: Password123!');
  console.log('Chef Centre   : matricule: CHF001, password: Password123!');
  console.log('Formateur     : matricule: FOR001, password: Password123!');
  console.log('SPV           : matricule: SPV001, password: Password123!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  console.log('\n🎉 Seed terminé avec succès !');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
