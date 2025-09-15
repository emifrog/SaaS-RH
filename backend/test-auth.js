const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = 'http://localhost:3000/api';

async function testAuthentication() {
  console.log('🔐 Test d\'authentification...\n');
  
  try {
    // Test de login avec l'utilisateur test
    console.log('1️⃣ Test de connexion avec l\'utilisateur test...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      matricule: 'TEST001',
      password: 'test123'
    });
    
    console.log('✅ Connexion réussie !');
    console.log('   Token reçu:', loginResponse.data.accessToken ? 'Oui' : 'Non');
    console.log('   Utilisateur:', loginResponse.data.user?.nom, loginResponse.data.user?.prenom);
    console.log('   Rôles:', loginResponse.data.user?.roles?.map(r => r.nom).join(', ') || 'Aucun');
    
    const token = loginResponse.data.accessToken;
    
    // Test de validation du token
    console.log('\n2️⃣ Test de validation du token...');
    const validateResponse = await axios.post(`${API_BASE_URL}/auth/validate`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Token valide !');
    console.log('   Utilisateur validé:', validateResponse.data.user?.nom, validateResponse.data.user?.prenom);
    
    // Test d'accès à une route protégée (exemple)
    console.log('\n3️⃣ Test d\'accès aux données utilisateur...');
    const userResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Accès aux données utilisateur réussi !');
    console.log('   Matricule:', userResponse.data.matricule);
    console.log('   Email:', userResponse.data.email);
    console.log('   Centre:', userResponse.data.centre?.nom || 'Non assigné');
    
    console.log('\n🎉 Tous les tests d\'authentification ont réussi !');
    
  } catch (error) {
    console.error('❌ Erreur lors du test d\'authentification:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Message:', error.response.data?.message || error.response.statusText);
      console.error('   Détails:', error.response.data?.error || 'Aucun détail');
    } else if (error.request) {
      console.error('   Erreur réseau - Le serveur backend est-il démarré ?');
      console.error('   URL tentée:', error.config?.url);
    } else {
      console.error('   Erreur:', error.message);
    }
  }
}

testAuthentication();
