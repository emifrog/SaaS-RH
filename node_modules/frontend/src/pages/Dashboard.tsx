import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { api } from '@/services/api';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [stats, setStats] = useState({
    sessionsCount: 0,
    upcomingSessions: 0,
    myInscriptions: 0,
    personnelsCount: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/stats/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tableau de bord</h1>
      
      <div className="mb-6">
        <p className="text-lg">
          Bienvenue, {user?.prenom} {user?.nom}
        </p>
        <p className="text-sm text-gray-600">
          {user?.grade} - {user?.roles.join(', ')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Sessions FMPA</h3>
          <p className="text-3xl font-bold text-primary-600">{stats.sessionsCount}</p>
          <p className="text-sm text-gray-600">Total des sessions</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Sessions à venir</h3>
          <p className="text-3xl font-bold text-green-600">{stats.upcomingSessions}</p>
          <p className="text-sm text-gray-600">Dans les 30 prochains jours</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Mes inscriptions</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.myInscriptions}</p>
          <p className="text-sm text-gray-600">Sessions inscrites</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Personnels</h3>
          <p className="text-3xl font-bold text-purple-600">{stats.personnelsCount}</p>
          <p className="text-sm text-gray-600">Personnels actifs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Actions rapides</h3>
          <div className="space-y-2">
            <Link to="/fmpa/sessions" className="block p-3 bg-gray-50 rounded hover:bg-gray-100">
              → Voir les sessions FMPA
            </Link>
            {(user?.roles.includes('FORMATEUR') || user?.roles.includes('ADMIN_SDIS')) && (
              <Link to="/fmpa/sessions/new" className="block p-3 bg-gray-50 rounded hover:bg-gray-100">
                → Créer une nouvelle session
              </Link>
            )}
            <Link to="/profile" className="block p-3 bg-gray-50 rounded hover:bg-gray-100">
              → Mon profil
            </Link>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Prochaines sessions</h3>
          <p className="text-sm text-gray-600">
            Fonctionnalité à venir...
          </p>
        </div>
      </div>
    </div>
  );
}
