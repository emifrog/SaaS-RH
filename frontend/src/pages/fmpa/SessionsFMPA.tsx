import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { AppDispatch, RootState } from '@/store';
import { fetchSessions } from '@/store/slices/fmpaSlice';
import LoadingSpinner from '@/components/LoadingSpinner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function SessionsFMPA() {
  const dispatch = useDispatch<AppDispatch>();
  const { sessions, isLoading } = useSelector((state: RootState) => state.fmpa);
  const { user } = useSelector((state: RootState) => state.auth);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    dispatch(fetchSessions());
  }, [dispatch]);

  const filteredSessions = sessions.filter(session => {
    if (filter === 'all') return true;
    return session.statut === filter;
  });

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      PLANIFIE: 'bg-blue-100 text-blue-800',
      CONFIRME: 'bg-green-100 text-green-800',
      EN_COURS: 'bg-yellow-100 text-yellow-800',
      TERMINE: 'bg-gray-100 text-gray-800',
      ANNULE: 'bg-red-100 text-red-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sessions FMPA</h1>
        {(user?.roles.includes('FORMATEUR') || user?.roles.includes('ADMIN_SDIS')) && (
          <Link to="/fmpa/sessions/new" className="btn btn-primary">
            Nouvelle session
          </Link>
        )}
      </div>

      <div className="mb-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input w-48"
        >
          <option value="all">Toutes les sessions</option>
          <option value="PLANIFIE">Planifiées</option>
          <option value="CONFIRME">Confirmées</option>
          <option value="EN_COURS">En cours</option>
          <option value="TERMINE">Terminées</option>
          <option value="ANNULE">Annulées</option>
        </select>
      </div>

      <div className="grid gap-4">
        {filteredSessions.map((session) => (
          <div key={session.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">{session.typeFMPA.libelle}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(session.statut)}`}>
                    {session.statut}
                  </span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>📅 {format(new Date(session.dateDebut), 'dd MMMM yyyy à HH:mm', { locale: fr })}</p>
                  <p>📍 {session.lieu}</p>
                  <p>👥 {session.placesOccupees}/{session.placesMax} inscrits</p>
                  <p>👨‍🏫 Formateur: {session.formateurPrincipal.prenom} {session.formateurPrincipal.nom}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/fmpa/sessions/${session.id}`}
                  className="btn btn-secondary text-sm"
                >
                  Détails
                </Link>
                {(user?.roles.includes('FORMATEUR') || user?.roles.includes('ADMIN_SDIS')) && (
                  <Link
                    to={`/fmpa/sessions/${session.id}/edit`}
                    className="btn btn-secondary text-sm"
                  >
                    Modifier
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredSessions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Aucune session trouvée
        </div>
      )}
    </div>
  );
}
