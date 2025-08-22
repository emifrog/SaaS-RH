import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { fetchSession, inscribeToSession } from '@/store/slices/fmpaSlice';
import LoadingSpinner from '@/components/LoadingSpinner';
import SignatureModal from '@/components/SignatureModal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { api } from '@/services/api';

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { currentSession, isLoading } = useSelector((state: RootState) => state.fmpa);
  const { user } = useSelector((state: RootState) => state.auth);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureFor, setSignatureFor] = useState<{ type: string; personnelId: string } | null>(null);

  useEffect(() => {
    if (id) {
      dispatch(fetchSession(id));
    }
  }, [dispatch, id]);

  const handleInscription = async () => {
    if (!currentSession || !user) return;
    
    try {
      await dispatch(inscribeToSession({
        sessionId: currentSession.id,
        personnelId: user.id,
      })).unwrap();
      toast.success('Inscription réussie');
      dispatch(fetchSession(currentSession.id));
    } catch (error) {
      toast.error('Erreur lors de l\'inscription');
    }
  };

  const handlePresence = async (inscriptionId: string, present: boolean) => {
    try {
      await api.put(`/fmpa/inscriptions/${inscriptionId}/presence`, { present });
      toast.success('Présence mise à jour');
      if (id) dispatch(fetchSession(id));
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const openSignatureModal = (type: string, personnelId: string) => {
    setSignatureFor({ type, personnelId });
    setShowSignatureModal(true);
  };

  const handleSignatureSave = async (signature: string) => {
    if (!signatureFor || !currentSession) return;

    try {
      await api.post(`/fmpa/sessions/${currentSession.id}/signatures`, {
        personnelId: signatureFor.personnelId,
        type: signatureFor.type,
        signature,
      });
      toast.success('Signature enregistrée');
      setShowSignatureModal(false);
      if (id) dispatch(fetchSession(id));
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement de la signature');
    }
  };

  if (isLoading || !currentSession) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const isFormateur = user?.id === currentSession.formateurPrincipal.id;
  const isAdmin = user?.roles.includes('ADMIN_SDIS');
  const canManage = isFormateur || isAdmin;

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate('/fmpa/sessions')}
          className="text-primary-600 hover:text-primary-700 mb-4 inline-block"
        >
          ← Retour aux sessions
        </button>
        
        <div className="card">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {currentSession.typeFMPA.libelle}
              </h1>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {currentSession.statut}
              </span>
            </div>
            {canManage && (
              <button
                onClick={() => navigate(`/fmpa/sessions/${currentSession.id}/edit`)}
                className="btn btn-primary"
              >
                Modifier
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold">Date début:</p>
              <p>{format(new Date(currentSession.dateDebut), 'dd MMMM yyyy à HH:mm', { locale: fr })}</p>
            </div>
            <div>
              <p className="font-semibold">Date fin:</p>
              <p>{format(new Date(currentSession.dateFin), 'dd MMMM yyyy à HH:mm', { locale: fr })}</p>
            </div>
            <div>
              <p className="font-semibold">Lieu:</p>
              <p>{currentSession.lieu}</p>
            </div>
            <div>
              <p className="font-semibold">Places:</p>
              <p>{currentSession.placesOccupees}/{currentSession.placesMax}</p>
            </div>
            <div>
              <p className="font-semibold">Formateur principal:</p>
              <p>{currentSession.formateurPrincipal.prenom} {currentSession.formateurPrincipal.nom}</p>
            </div>
            <div>
              <p className="font-semibold">Code TTA:</p>
              <p>{currentSession.codeTTA || 'Non défini'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Inscriptions ({currentSession.inscriptions?.length || 0})</h2>
        
        {!canManage && currentSession.placesOccupees < currentSession.placesMax && (
          <button onClick={handleInscription} className="btn btn-primary mb-4">
            S'inscrire à cette session
          </button>
        )}

        {currentSession.inscriptions && currentSession.inscriptions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Personnel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Présence
                  </th>
                  {canManage && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentSession.inscriptions.map((inscription: any) => (
                  <tr key={inscription.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {inscription.personnel.prenom} {inscription.personnel.nom}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {inscription.personnel.grade}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        inscription.statut === 'INSCRIT' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {inscription.statut}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {canManage ? (
                        <input
                          type="checkbox"
                          checked={inscription.present || false}
                          onChange={(e) => handlePresence(inscription.id, e.target.checked)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                      ) : (
                        <span>{inscription.present ? '✓' : '-'}</span>
                      )}
                    </td>
                    {canManage && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => openSignatureModal('emargement', inscription.personnel.id)}
                          className="text-primary-600 hover:text-primary-900 mr-2"
                        >
                          Signature
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">Aucune inscription pour le moment</p>
        )}
      </div>

      {showSignatureModal && (
        <SignatureModal
          onClose={() => setShowSignatureModal(false)}
          onSave={handleSignatureSave}
        />
      )}
    </div>
  );
}
