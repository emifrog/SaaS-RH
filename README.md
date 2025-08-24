# SaaS-RH FMPA - Système de Gestion des Formations SDIS 06

Application web complète pour la gestion des formations FMPA (Formation de Maintien et de Perfectionnement des Acquis) du SDIS 06.

## 🚀 Fonctionnalités

### Module FMPA
- **Gestion des sessions de formation** : Création, modification, suppression
- **Inscriptions** : Gestion des inscriptions et désinscriptions des personnels
- **Présences** : Suivi des présences et absences
- **Signatures électroniques** : Capture et stockage des signatures
- **Export TTA** : Génération de rapports Excel pour les attestations
- **Rapport mensuel** : Export des statistiques mensuelles

### Authentification et Sécurité
- **JWT** : Authentification sécurisée par tokens
- **4 rôles** : POMPIER, FORMATEUR, CHEF_CENTRE, ADMIN_SDIS
- **Autorisations** : Contrôle d'accès basé sur les rôles

## 🛠 Stack Technique

### Backend
- **Node.js** avec Express et TypeScript
- **Prisma ORM** pour la gestion de base de données
- **PostgreSQL 15** comme base de données principale
- **Redis** pour le cache et les sessions
- **JWT** pour l'authentification
- **ExcelJS** pour les exports Excel

### Frontend
- **React 18** avec TypeScript
- **Vite** comme bundler
- **Tailwind CSS** pour le styling
- **Redux Toolkit** pour la gestion d'état
- **React Router** pour la navigation
- **React Hook Form** pour les formulaires
- **Axios** pour les requêtes API

## 📋 Prérequis

- Node.js 18+ et npm
- Docker et Docker Compose
- PostgreSQL 15 (via Docker)
- Redis (via Docker)

## 🚀 Installation

### 1. Cloner le repository
```bash
git clone https://github.com/votre-repo/SaaS-RH.git
cd SaaS-RH
```

### 2. Installer les dépendances

#### Backend
```bash
cd backend
npm install
```

#### Frontend
```bash
cd frontend
npm install
```

### 3. Configuration de l'environnement

Créer un fichier `.env` dans le dossier `backend` :

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/saas_rh?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-secret-key-change-in-production"
JWT_REFRESH_SECRET="your-refresh-secret-key-change-in-production"

# Server
PORT=3000
NODE_ENV=development

# Email (optionnel)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
```

### 4. Démarrer les services Docker

```bash
docker-compose up -d
```

### 5. Initialiser la base de données

```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

### 6. Lancer l'application

#### Backend (Terminal 1)
```bash
cd backend
npm run dev
```

#### Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```

## 🌐 Accès à l'application

- **Frontend** : http://localhost:5173
- **Backend API** : http://localhost:3000
- **PostgreSQL** : localhost:5432
- **Redis** : localhost:6379

## 📁 Structure du projet

```
SaaS-RH/
├── backend/
│   ├── src/
│   │   ├── middleware/     # Middlewares (auth, validation, error)
│   │   ├── modules/         # Modules métier
│   │   │   ├── auth/       # Authentification
│   │   │   ├── fmpa/       # Module FMPA complet
│   │   │   └── exports/    # Exports TTA
│   │   ├── services/       # Services (email, notifications)
│   │   ├── utils/          # Utilitaires
│   │   └── server.ts       # Point d'entrée
│   ├── prisma/
│   │   └── schema.prisma   # Schéma de base de données
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # Composants React
│   │   ├── pages/          # Pages de l'application
│   │   │   └── fmpa/      # Pages du module FMPA
│   │   ├── services/       # Services API
│   │   ├── store/          # Redux store
│   │   └── App.tsx         # Composant principal
│   └── package.json
└── docker-compose.yml      # Configuration Docker
```

## 🔑 Comptes de test

Pour tester l'application, vous pouvez créer des utilisateurs avec les rôles suivants :
- **ADMIN_SDIS** : Accès complet
- **CHEF_CENTRE** : Gestion du centre et exports
- **FORMATEUR** : Gestion des sessions et présences
- **POMPIER** : Inscription aux sessions

## 📊 Modèles de données principaux

- **Personnel** : Informations des personnels
- **SessionFMPA** : Sessions de formation
- **InscriptionFMPA** : Inscriptions aux sessions
- **SignatureFMPA** : Signatures électroniques
- **TypeFMPA** : Types de formations
- **Centre** : Centres de secours

## 🧪 Tests

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

## 📝 API Documentation

Les principales routes de l'API :

### Auth
- `POST /api/auth/login` - Connexion
- `POST /api/auth/refresh` - Rafraîchir le token
- `POST /api/auth/logout` - Déconnexion

### FMPA
- `GET /api/fmpa/sessions` - Liste des sessions
- `POST /api/fmpa/sessions` - Créer une session
- `PUT /api/fmpa/sessions/:id` - Modifier une session
- `DELETE /api/fmpa/sessions/:id` - Supprimer une session
- `POST /api/fmpa/sessions/:id/inscription` - S'inscrire
- `POST /api/fmpa/sessions/:id/presence` - Marquer présence
- `POST /api/fmpa/sessions/:id/signatures` - Ajouter signature
- `GET /api/fmpa/sessions/:id/export-tta` - Export TTA

## 🚧 Développement

### Build pour production

```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

### Linting et formatage

```bash
# Backend
cd backend
npm run lint
npm run format

# Frontend
cd frontend
npm run lint
npm run format
```

## 📄 License

MIT

## 👥 Contributeurs

- Équipe de développement SDIS 06

## 📞 Support

Pour toute question ou problème, contactez l'équipe de développement.

---

**Note** : Cette application est en développement actif. Certaines fonctionnalités peuvent être en cours d'implémentation.
