# 📋 Liste des Tâches Restantes - SaaS-RH SDIS

## 🔴 PRIORITÉ CRITIQUE (À faire immédiatement)

### Sécurité & Qualité

#### Sécuriser le projet
- [ ] Retirer backend/.env du tracking Git
- [ ] Ajouter .env dans .gitignore

---

## 🟠 PRIORITÉ HAUTE

### Module Aptitudes Médicales (2 semaines)

#### Modèle de données
- [ ] Créer table aptitudes_medicales
- [ ] Définir enum statuts (APTE, APTE_RESTRICTIONS, INAPTE)
- [ ] Établir relations avec table personnels
- [ ] Ajouter champs dates visite/prochaine visite

#### Backend API
- [ ] CRUD aptitudes médicales
- [ ] Endpoint vérification aptitude avant inscription FMPA
- [ ] Calcul automatique dates expiration
- [ ] Service de notifications automatiques
- [ ] Endpoint statistiques aptitudes par centre

#### Frontend
- [ ] Page gestion aptitudes
- [ ] Formulaire saisie visite médicale
- [ ] Dashboard alertes expirations
- [ ] Badge statut sur profil personnel
- [ ] Filtres par statut/date expiration

#### Automatisations
- [ ] Cron job vérification quotidienne (8h00)
- [ ] Alertes J-90 (email + notification)
- [ ] Alertes J-30 (email + notification urgente)
- [ ] Alertes J-7 (notification critique + SMS si disponible)
- [ ] Blocage automatique inscription FMPA si inapte
- [ ] Rapport mensuel aptitudes au chef de centre

### Socket.IO Temps Réel

#### Backend Socket.IO
- [ ] Installation et configuration Socket.IO
- [ ] Middleware authentification JWT pour WebSocket
- [ ] Création rooms par centre
- [ ] Création rooms par utilisateur
- [ ] Events FMPA (nouvelle session, inscription, annulation)
- [ ] Events notifications système

#### Frontend Socket.IO
- [ ] Créer hook useSocket
- [ ] Gestion connexion/reconnexion automatique
- [ ] Indicateur état connexion
- [ ] Context provider Socket global

#### Notifications temps réel
- [ ] Nouvelle session FMPA disponible
- [ ] Places restantes mise à jour live
- [ ] Rappel J-1 formation
- [ ] Alerte aptitude expirée
- [ ] Message nouveau dans messagerie
- [ ] Toast notifications avec actions

---

## 🟡 PRIORITÉ MOYENNE

### Module Compétences

#### Gestion certifications
- [ ] Table types_competences (PSE1, PSE2, COD1, FDF, etc.)
- [ ] Table personnel_competences
- [ ] Gestion dates obtention/expiration
- [ ] Niveaux (débutant, confirmé, expert)
- [ ] Documents justificatifs (upload PDF)

#### Interface compétences
- [ ] Matrice compétences du centre
- [ ] Profil compétences personnel
- [ ] Timeline formations/recyclages
- [ ] Recherche personnel par compétence
- [ ] Export matrice Excel

#### Recyclages obligatoires
- [ ] Planning recyclages automatique
- [ ] Notifications rappels progressifs
- [ ] Blocage activités si certification expirée
- [ ] Dashboard recyclages à prévoir

### Messagerie Interne

#### Backend messagerie
- [ ] Tables conversations et messages
- [ ] Table messages_lus (accusés lecture)
- [ ] API envoi/réception messages
- [ ] Gestion pièces jointes (max 10MB)
- [ ] Recherche full-text dans messages
- [ ] Archivage conversations

#### Frontend messagerie
- [ ] Interface chat style WhatsApp Web
- [ ] Conversations individuelles
- [ ] Groupes de discussion
- [ ] Indicateurs lu/non lu
- [ ] Typing indicators
- [ ] Prévisualisation liens

#### Fonctionnalités avancées
- [ ] Groupes dynamiques (par grade, centre, spécialité)
- [ ] Messages épinglés importants
- [ ] Partage documents/images
- [ ] Historique recherchable
- [ ] Export conversation PDF

---

## 🟢 PRIORITÉ BASSE

### Gestion Matériels & EPI

#### Inventaire matériels
- [ ] Table materiels (véhicules, ARI, matériel médical)
- [ ] Table categories_materiels
- [ ] Table incidents_materiels
- [ ] Suivi maintenance préventive
- [ ] QR codes pour identification rapide
- [ ] Photos état matériel

#### Gestion EPI
- [ ] Attribution individuelle avec tailles
- [ ] Suivi dates péremption
- [ ] Demandes renouvellement
- [ ] Historique dotations
- [ ] Stock disponible par référence

#### Signalements
- [ ] Formulaire incident avec upload photos
- [ ] Workflow validation chef centre
- [ ] Suivi état réparations
- [ ] Calcul coûts maintenance
- [ ] Statistiques pannes récurrentes

### Agenda Partagé

#### Calendrier centre
- [ ] Intégration FullCalendar ou similaire
- [ ] Types événements (formation, réunion, cérémonie, manœuvre)
- [ ] Événements récurrents
- [ ] Invitations avec RSVP
- [ ] Pièces jointes événements
- [ ] Rappels configurables

#### Synchronisation
- [ ] Export format iCal
- [ ] API sync Google Calendar
- [ ] API sync Outlook
- [ ] Webhook notifications
- [ ] Gestion conflits horaires

### Planning Gardes

#### Gestion planning
- [ ] Grille mensuelle gardes
- [ ] Règles métier (repos obligatoire, max heures)
- [ ] Demandes échanges entre agents
- [ ] Workflow validation chef centre
- [ ] Calcul heures mensuelles

#### Disponibilités
- [ ] Déclaration disponibilités SPV
- [ ] Vue effectifs temps réel
- [ ] Alertes sous-effectif critique
- [ ] Statistiques taux présence
- [ ] Export planning PDF

---

## 💙 OPTIMISATIONS

### PWA & Mobile

#### Progressive Web App
- [ ] Configuration Service Worker
- [ ] Manifest.json avec métadonnées
- [ ] Icons multiples résolutions
- [ ] Splash screens iOS/Android
- [ ] Prompt installation personnalisé

#### Mode Offline
- [ ] Stratégies cache (network-first, cache-first)
- [ ] Background sync API
- [ ] Queue requêtes hors ligne
- [ ] Résolution conflits données
- [ ] Indicateur mode offline

#### Optimisations Performance
- [ ] Code splitting par route
- [ ] Lazy loading composants
- [ ] Compression images automatique
- [ ] CDN pour assets statiques
- [ ] Minification bundle
- [ ] Tree shaking agressif

### Tableaux de Bord Avancés

#### Analytics
- [ ] Taux présence formations par type
- [ ] Heures FMPA par agent/mois
- [ ] Coûts formations totaux
- [ ] Tendances inscriptions
- [ ] Taux remplissage sessions
- [ ] Délais moyens inscriptions

#### Rapports
- [ ] Export PDF mensuel automatique
- [ ] Graphiques interactifs (Chart.js)
- [ ] Comparaisons année N-1
- [ ] KPIs personnalisables par rôle
- [ ] Envoi email rapport mensuel

---

## 📝 DOCUMENTATION & FORMATION

### Documentation Technique
- [ ] API documentation complète (Swagger/OpenAPI)
- [ ] Guide déploiement production
- [ ] Diagrammes architecture (C4 model)
- [ ] Schema base de données commenté
- [ ] Guide contribution (CONTRIBUTING.md)
- [ ] Procédures backup/restore

### Documentation Utilisateur
- [ ] Manuel utilisateur pompier (20 pages)
- [ ] Manuel formateur (30 pages)
- [ ] Manuel chef de centre (40 pages)
- [ ] Manuel admin SDIS (50 pages)
- [ ] Tutoriels vidéo par fonctionnalité (5-10 min)
- [ ] FAQ interactive (50+ questions)
- [ ] Guide quick start (5 pages)
- [ ] Procédures mode dégradé

### Formation & Déploiement
- [ ] Plan de formation détaillé
- [ ] Supports PowerPoint formation
- [ ] Environnement test avec données fictives
- [ ] Scripts migration données Excel → BDD
- [ ] Checklist go-live
- [ ] Plan de rollback
- [ ] Contrats support/maintenance

---

## 📌 Notes Importantes

### Dépendances Critiques
- Le module Aptitudes DOIT être terminé avant le planning des gardes
- Socket.IO est prérequis pour la messagerie temps réel
- Les tests doivent couvrir 80% du code avant production

### Risques Identifiés
- Migration des données Excel existantes (prévoir 2 semaines buffer)
- Formation des utilisateurs (résistance au changement)
- Intégration avec systèmes RH existants (API à valider)

### Quick Wins
- Export TTA déjà fonctionnel = ROI immédiat
- Dashboard simple mais efficace = adoption rapide
- Notifications = engagement utilisateur
