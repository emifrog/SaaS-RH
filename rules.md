# Règles de Développement SDIS

## Contexte
Application de gestion pour sapeurs-pompiers (clone MOON.SP)
Stack: React + TypeScript + Node.js + PostgreSQL

## Conventions de Code

### Backend
- TypeScript strict mode
- Async/await plutôt que callbacks
- Validation avec Zod
- Erreurs typées avec classes custom
- Commentaires en français pour le métier

### Frontend  
- Composants fonctionnels React
- Hooks personnalisés dans /hooks
- Tailwind CSS pour styling
- Pas de CSS inline

### Base de données
- Noms de tables au pluriel (personnels, sessions_fmpa)
- Timestamps: created_at, updated_at
- Soft delete avec deleted_at
- Index sur foreign keys

## Sécurité
- JWT avec refresh tokens
- Bcrypt pour passwords (10 rounds)
- Rate limiting sur auth endpoints
- Validation entrées utilisateur
- Escape SQL queries (Prisma)

## Priorités
1. FMPA et export TTA (critique)
2. Aptitudes médicales (légal)
3. Reste secondaire

## Vocabulaire Métier
- SDIS: Service Départemental d'Incendie et de Secours
- FMPA: Formation de Maintien et Perfectionnement des Acquis
- TTA: Traitement du Temps d'Activité (paie)
- SPV: Sapeur-Pompier Volontaire
- SPP: Sapeur-Pompier Professionnel
- CIS: Centre d'Incendie et de Secours