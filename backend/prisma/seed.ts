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
        adresse: '1 Avenue de la République, 06000 Nice',
        telephone: '0493000001',
        email: 'cis.nice@sdis06.fr',
      },
    }),
    prisma.centre.create({
      data: {
        code: 'CSP_ANTIBES',
        nom: 'CSP Antibes',
        type: 'CSP',
        adresse: '10 Boulevard Wilson, 06600 Antibes',
        telephone: '0493000002',
        email: 'csp.antibes@sdis06.fr',
      },
    }),
    prisma.centre.create({
      data: {
        code: 'CPI_GRASSE',
        nom: 'CPI Grasse',
        type: 'CPI',
        adresse: '5 Rue du Commandant, 06130 Grasse',
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
        tauxHoraire: 12.50,
        description: 'Formation de maintien des acquis en secours à personne',
      },
    }),
    prisma.typeFMPA.create({
      data: {
        code: 'FMPA_INC',
        libelle: 'FMPA Incendie',
        dureeHeures: 4,
        tauxHoraire: 15.00,
        description: 'Formation de maintien des acquis incendie',
      },
    }),
    prisma.typeFMPA.create({
      data: {
        code: 'FMPA_DIV',
        libelle: 'FMPA Opérations Diverses',
        dureeHeures: 3.5,
        tauxHoraire: 12.50,
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
      grade: 'COL',
      centreId: centres[0].id,
      categorie: 'SPP',
      roles: ['ADMIN_SDIS', 'USER'],
      aptitudeMedicale: {
        create: {
          statut: 'APTE',
          dateVisite: new Date('2024-01-15'),
          dateProchainExamen: new Date('2025-01-15'),
          medecin: 'Dr. Martin',
        },
      },
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
      grade: 'CNE',
      centreId: centres[0].id,
      categorie: 'SPP',
      roles: ['CHEF_CENTRE', 'USER'],
      aptitudeMedicale: {
        create: {
          statut: 'APTE',
          dateVisite: new Date('2024-02-10'),
          dateProchainExamen: new Date('2025-02-10'),
          medecin: 'Dr. Dubois',
        },
      },
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
      grade: 'ADJ',
      centreId: centres[0].id,
      categorie: 'SPP',
      roles: ['FORMATEUR', 'USER'],
      aptitudeMedicale: {
        create: {
          statut: 'APTE',
          dateVisite: new Date('2024-03-05'),
          dateProchainExamen: new Date('2025-03-05'),
          medecin: 'Dr. Leroy',
        },
      },
      competences: {
        create: [
          {
            code: 'FOR_SAP',
            libelle: 'Formateur SAP',
            dateObtention: new Date('2020-06-15'),
            dateExpiration: new Date('2025-06-15'),
            niveau: 'Formateur',
            organisme: 'ENSOSP',
          },
          {
            code: 'FOR_INC',
            libelle: 'Formateur Incendie',
            dateObtention: new Date('2019-09-20'),
            dateExpiration: new Date('2024-09-20'),
            niveau: 'Formateur',
            organisme: 'ENSOSP',
          },
        ],
      },
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
        grade: 'CAP',
        centreId: centres[0].id,
        categorie: 'SPV',
        roles: ['USER'],
        aptitudeMedicale: {
          create: {
            statut: 'APTE',
            dateVisite: new Date('2024-04-01'),
            dateProchainExamen: new Date('2025-04-01'),
            medecin: 'Dr. Petit',
          },
        },
        competences: {
          create: [
            {
              code: 'PSE2',
              libelle: 'Premiers Secours en Équipe niveau 2',
              dateObtention: new Date('2022-05-10'),
              dateExpiration: new Date('2025-05-10'),
              niveau: '2',
              organisme: 'SDIS 06',
            },
          ],
        },
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
        grade: 'SAP1',
        centreId: centres[1].id,
        categorie: 'SPV',
        roles: ['USER'],
        aptitudeMedicale: {
          create: {
            statut: 'APTE',
            dateVisite: new Date('2024-05-15'),
            dateProchainExamen: new Date('2025-05-15'),
            medecin: 'Dr. Blanc',
          },
        },
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
        grade: 'SGT',
        centreId: centres[0].id,
        categorie: 'SPV',
        roles: ['USER'],
        aptitudeMedicale: {
          create: {
            statut: 'APTE',
            dateVisite: new Date('2024-06-20'),
            dateProchainExamen: new Date('2025-06-20'),
            medecin: 'Dr. Roux',
          },
        },
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
        placesMax: 12,
        formateurPrincipalId: formateur.id,
        centreId: centres[0].id,
        statut: 'PLANIFIE',
        codeTTA: 'FMPA_SAP_2024',
        tauxHoraire: 12.50,
        observations: 'Apporter sa tenue de sport',
      },
    }),
    prisma.sessionFMPA.create({
      data: {
        typeFMPAId: typesFMPA[1].id,
        dateDebut: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 15, 14, 0),
        dateFin: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 15, 18, 0),
        lieu: 'CSP Antibes - Plateau technique',
        placesMax: 10,
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
      sessionId: sessions[0].id,
      personnelId: spvs[0].id,
      statut: 'INSCRIT',
    },
  });

  await prisma.inscriptionFMPA.create({
    data: {
      sessionId: sessions[0].id,
      personnelId: spvs[2].id,
      statut: 'INSCRIT',
    },
  });

  await prisma.sessionFMPA.update({
    where: { id: sessions[0].id },
    data: { placesOccupees: 2 },
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
