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
    console.log('   Token reçu:', loginResponse.data.data.accessToken ? 'Oui' : 'Non');
    console.log('   Utilisateur:', loginResponse.data.data.user?.nom, loginResponse.data.data.user?.prenom);
    console.log('   Rôles:', loginResponse.data.data.user?.roles?.map(r => r.nom).join(', ') || 'Aucun');
    
    const token = loginResponse.data.data.accessToken;
    
    // Test d'accès aux données utilisateur (remplace le test de validation)
    console.log('\n2️⃣ Test d\'accès aux données utilisateur...');
    const userResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Token valide et accès aux données réussi !');
    console.log('   Matricule:', userResponse.data.matricule);
    console.log('   Rôles:', userResponse.data.roles?.map(r => r.code).join(', ') || 'Aucun');
    
    // Test de refresh token
    console.log('\n3️⃣ Test de refresh token...');
    const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken: loginResponse.data.data.refreshToken
    });
    
    console.log('✅ Refresh token réussi !');
    console.log('   Nouveau token reçu:', refreshResponse.data.data.accessToken ? 'Oui' : 'Non');
    
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
