# Prompt Master pour Windsurf

## Contexte du Projet

Je développe une application web de gestion administrative pour les Services Départementaux d'Incendie et de Secours (SDIS) du 06, similaire à MOON.SP. L'objectif est de digitaliser et centraliser la gestion des activités non-opérationnelles des sapeurs-pompiers.

### Problème Principal
Les SDIS gèrent actuellement leurs formations (FMPA) et le temps d'activité (TTA) sur Excel, causant :
- 5 jours/mois de travail administratif manuel
- Erreurs fréquentes dans les calculs de paie
- Pas de traçabilité des présences
- Difficultés pour les inscriptions aux formations

### Solution Attendue
Application web moderne permettant :
1. **Gestion des FMPA** (Formation de Maintien et Perfectionnement des Acquis) - PRIORITÉ ABSOLUE
2. **Export automatique TTA** pour la paie
3. **Suivi des aptitudes médicales** et compétences
4. **Communication interne** entre pompiers
5. **Planning et agenda** partagé

## Stack Technique

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Express avec TypeScript (strict mode)
- **Base de données**: PostgreSQL 15
- **ORM**: Prisma
- **Authentification**: JWT + refresh tokens
- **Validation**: Zod
- **Queue**: Bull (Redis) pour exports
- **Email**: Nodemailer
- **Temps réel**: Socket.io (phase 2)

### Frontend
- **Framework**: React 18 avec TypeScript
- **Build**: Vite
- **Styling**: Tailwind CSS
- **State**: Redux Toolkit
- **Forms**: React Hook Form + Zod
- **Calendrier**: FullCalendar
- **Charts**: Recharts
- **PWA**: Workbox (phase finale)

### Infrastructure
- **Docker**: PostgreSQL + Redis + MailHog (dev)
- **Multi-tenant**: Un schema PostgreSQL par SDIS
- **Stockage**: Local avec backup S3

## Structure du Projet

```
illidan-app/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.routes.ts
│   │   │   │   └── auth.validation.ts
│   │   │   ├── fmpa/          # PRIORITÉ 1
│   │   │   │   ├── fmpa.controller.ts
│   │   │   │   ├── fmpa.service.ts
│   │   │   │   ├── fmpa.routes.ts
│   │   │   │   └── fmpa.validation.ts
│   │   │   ├── personnels/
│   │   │   ├── aptitudes/
│   │   │   └── exports/
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── validation.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── services/
│   │   │   ├── email.service.ts
│   │   │   ├── export.service.ts
│   │   │   └── notification.service.ts
│   │   ├── utils/
│   │   │   ├── logger.ts
│   │   │   └── constants.ts
│   │   └── server.ts
│   ├── .env.example
│   ├── docker-compose.yml
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── forms/
│   │   │   └── layouts/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── FMPA/
│   │   │   └── Login.tsx
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   └── App.tsx
│   └── package.json
└── docs/
```

## Modèles de Données Principaux

### Personnel (Utilisateur)
```typescript
{
  id: number
  matricule: string (unique)
  nom: string
  prenom: string
  email: string
  telephone: string
  grade: Grade
  centre: Centre
  categorie: 'SPV' | 'SPP' | 'PATS'
  statut: 'actif' | 'suspendu' | 'retraite'
  roles: Role[]
  aptitudeMedicale: AptitudeMedicale
  competences: Competence[]
}
```

### Session FMPA (Formation)
```typescript
{
  id: number
  typeFMPA: TypeFMPA
  dateDebut: DateTime
  dateFin: DateTime
  lieu: string
  placesMax: number
  formateurPrincipal: Personnel
  statut: 'planifie' | 'confirme' | 'termine' | 'annule'
  codeTTA: string
  tauxHoraire: number
  inscriptions: InscriptionFMPA[]
}
```

### Inscription FMPA
```typescript
{
  sessionId: number
  personnelId: number
  statut: 'inscrit' | 'present' | 'absent_justifie' | 'absent'
  signatureElectronique: string (base64)
  heuresValidees: number
  montantTTA: number
}
```

## Fonctionnalités par Sprint

### Sprint 1 - Fondations (Semaines 1-6)
1. **Setup projet** avec Docker et structure
2. **Authentification JWT** avec 4 rôles (USER, FORMATEUR, CHEF_CENTRE, ADMIN_SDIS)
3. **CRUD Personnels** avec import CSV
4. **Dashboard basique** avec stats

### Sprint 2 - Module FMPA [PRIORITÉ MAXIMALE] (Semaines 7-12)
1. **Gestion sessions FMPA**
   - Création/modification par formateurs
   - Calendrier mensuel
   - Gestion places disponibles
2. **Inscriptions**
   - Interface inscription/désinscription
   - Vérification aptitude médicale
   - Notifications automatiques J-7 et J-1
3. **Présences et signature**
   - Feuille de présence électronique
   - Signature sur Canvas HTML5
   - Validation formateur
4. **Export TTA**
   - Calcul automatique heures/montants
   - Export CSV format : `MATRICULE|NOM|PRENOM|DATE|HEURES|TAUX|MONTANT|CODE`
   - Validation chef de centre
   - Historique exports

### Sprint 3 - Aptitudes & Compétences (Semaines 13-16)
1. **Suivi médical**
   - Dates visites médicales
   - Alertes 90/30/7 jours avant expiration
   - Blocage inscription si inapte
2. **Gestion compétences**
   - Certifications (PSE1, PSE2, COD1, etc.)
   - Dates expiration et recyclages
   - Matrice compétences du centre

### Sprint 4 - Communication (Semaines 17-20)
1. **Messagerie interne** (sans temps réel au début)
2. **Notifications** multi-canal (email, push)
3. **Annuaire intelligent** avec recherche

### Sprint 5 - Planning (Semaines 21-26)
1. **Agenda partagé** centre
2. **Gestion des gardes** avec échanges
3. **Événements** et invitations

### Sprint 6 - Finalisation (Semaines 27-30)
1. **Gestion matériels** et EPI
2. **Tableaux de bord** avancés
3. **PWA** et mode offline

## Règles Métier Critiques

### FMPA
- Minimum 5 inscrits pour maintenir une session
- Maximum 15 participants par session
- Inscription impossible si aptitude médicale invalide
- Signature obligatoire pour validation présence et paiement
- Export TTA avant le 5 de chaque mois

### Grades (ordre hiérarchique)
SPV/SPP : SAP2, SAP1, CAP, CCH, SGT, SCH, ADJ, ADC, LTN, CNE, CDT, LCL, COL

### Types de Centres
- CIS : Centre d'Incendie et de Secours
- CSP : Centre de Secours Principal
- CPI : Centre de Première Intervention

## Conventions de Code

### Backend
```typescript
// Toujours utiliser async/await
async function createSession(data: CreateSessionDTO): Promise<Session> {
  // Validation métier
  if (data.placesMax > 15) {
    throw new BusinessError('Maximum 15 places par session');
  }
  
  // Transaction pour opérations multiples
  return await prisma.$transaction(async (tx) => {
    const session = await tx.sessionFMPA.create({ data });
    await notificationService.notifyNewSession(session);
    return session;
  });
}
```

### Frontend
```tsx
// Composants fonctionnels avec TypeScript
interface FMPACardProps {
  session: SessionFMPA;
  onInscription: (id: number) => void;
}

export const FMPACard: FC<FMPACardProps> = ({ session, onInscription }) => {
  const placesRestantes = session.placesMax - session.inscrits;
  
  return (
    <div className="bg-white rounded-lg shadow p-4">
      {/* Mobile-first, gros boutons tactiles */}
      <button 
        onClick={() => onInscription(session.id)}
        className="w-full py-3 bg-blue-600 text-white rounded-lg"
      >
        S'inscrire ({placesRestantes} places)
      </button>
    </div>
  );
};
```

## API Endpoints Prioritaires

```typescript
// Auth
POST   /api/auth/login         { matricule, password }
POST   /api/auth/refresh       { refreshToken }
POST   /api/auth/logout

// FMPA (PRIORITÉ 1)
GET    /api/fmpa/sessions      ?mois=2024-08&centre=CIS_NORD
POST   /api/fmpa/sessions      { type, dateDebut, dateFin, placesMax }
GET    /api/fmpa/sessions/:id
PUT    /api/fmpa/sessions/:id
DELETE /api/fmpa/sessions/:id

POST   /api/fmpa/sessions/:id/inscription     { personnelId }
DELETE /api/fmpa/sessions/:id/inscription/:personnelId
POST   /api/fmpa/sessions/:id/presence        { personnelId, signature }
GET    /api/fmpa/export-tta                   ?mois=2024-08&centre=CIS_NORD

// Personnels
GET    /api/personnels
POST   /api/personnels/import  (multipart/form-data CSV)
GET    /api/personnels/:id
PUT    /api/personnels/:id
```

## Format Export TTA

```csv
MATRICULE|NOM|PRENOM|DATE|HEURES|TAUX|MONTANT|CODE
SP001|MARTIN|Jean|12/08/2024|7.5|12.50|93.75|FMPA_SAP
SP002|DUPONT|Marie|12/08/2024|7.5|12.50|93.75|FMPA_SAP
SP003|BERNARD|Pierre|13/08/2024|4|15.00|60.00|FMPA_INC
```

## Sécurité

1. **Authentification**
   - JWT access token (15 min) + refresh token (7 jours)
   - Bcrypt rounds: 10
   - Rate limiting: 5 tentatives/IP/5min

2. **Autorisations**
   - Middleware de vérification des rôles
   - Audit log sur actions sensibles
   - Soft delete pour traçabilité

3. **RGPD**
   - Consentement explicite à l'inscription
   - Anonymisation des logs après 1 an
   - Export données personnelles sur demande

## Tests

```typescript
// Jest pour backend
describe('FMPA Service', () => {
  it('should prevent registration if no medical aptitude', async () => {
    const personnel = await createPersonnel({ aptitude: 'inapte' });
    await expect(
      fmpaService.inscrire(sessionId, personnel.id)
    ).rejects.toThrow('Aptitude médicale invalide');
  });
  
  it('should calculate TTA amount correctly', () => {
    const montant = calculateTTA(7.5, 12.50); // heures * taux
    expect(montant).toBe(93.75);
  });
});
```

## Commandes Utiles

```bash
# Backend
npm run dev                 # Serveur avec hot-reload
npm run prisma:migrate      # Appliquer migrations
npm run prisma:seed         # Données de test
npm run test:watch          # Tests en continu

# Frontend
npm run dev                 # Vite dev server
npm run build              # Build production
npm run preview            # Preview build

# Docker
docker-compose up -d       # Démarrer services
docker-compose logs -f     # Voir logs
docker-compose down -v     # Arrêter et nettoyer
```

---

## Points d'Attention

1. **Mobile-first** : 70% des pompiers utilisent leur smartphone
2. **Simplicité** : Interface intuitive sans formation
3. **Fiabilité** : Zéro perte de données, backup quotidien
4. **Conformité** : Respect RGPD et réglementation SDIS
5. **Performance** : Application fluide même avec 500+ utilisateurs simultanés

## Vocabulaire Métier

- **SDIS** : Service Départemental d'Incendie et de Secours
- **FMPA** : Formation de Maintien et Perfectionnement des Acquis
- **TTA** : Traitement du Temps d'Activité (paie des vacations)
- **SPV** : Sapeur-Pompier Volontaire
- **SPP** : Sapeur-Pompier Professionnel
- **PATS** : Personnel Administratif et Technique Spécialisé
- **CIS/CSP/CPI** : Types de centres de secours
- **CODIS** : Centre Opérationnel Départemental d'Incendie et de Secours
- **Vacation** : Période d'activité rémunérée pour les SPV

---

## Prompt de Démarrage Windsurf

Utilise ce prompt dans Windsurf Cascade (Cmd+K) pour initialiser le projet :

Créer une application complète de gestion pour le SDIS 06, basée sur les spécifications ci-dessus. Commencer par :
1. Initialiser le monorepo avec backend Node.js/Express/TypeScript/Prisma et frontend React/TypeScript/Vite/Tailwind
2. Configurer Docker-compose avec PostgreSQL 15 et Redis
3. Implémenter le système d'authentification JWT avec les 4 rôles
4. Créer le module FMPA complet avec CRUD, inscriptions, signatures électroniques et export TTA
5. Ajouter les tests unitaires pour les fonctions critiques
