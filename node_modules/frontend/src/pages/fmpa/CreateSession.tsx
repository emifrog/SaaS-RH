import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { createSession, updateSession, fetchSession } from '@/store/slices/fmpaSlice';
import { api } from '@/services/api';
import toast from 'react-hot-toast';

export default function CreateSession() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { currentSession } = useSelector((state: RootState) => state.fmpa);
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [formData, setFormData] = useState({
    typeFMPAId: '',
    dateDebut: '',
    dateFin: '',
    lieu: '',
    placesMax: 12,
    formateurPrincipalId: user?.id || '',
    centreId: user?.centreId || '',
    statut: 'PLANIFIE',
    codeTTA: '',
    tauxHoraire: 12.50,
    observations: '',
  });

  const [typesFMPA, setTypesFMPA] = useState<any[]>([]);
  const [formateurs, setFormateurs] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
    if (id) {
      dispatch(fetchSession(id));
    }
  }, [id, dispatch]);

  useEffect(() => {
    if (id && currentSession) {
      setFormData({
        typeFMPAId: currentSession.typeFMPA.id,
        dateDebut: currentSession.dateDebut.slice(0, 16),
        dateFin: currentSession.dateFin.slice(0, 16),
        lieu: currentSession.lieu,
        placesMax: currentSession.placesMax,
        formateurPrincipalId: currentSession.formateurPrincipal.id,
        centreId: currentSession.centreId,
        statut: currentSession.statut,
        codeTTA: currentSession.codeTTA || '',
        tauxHoraire: currentSession.tauxHoraire,
        observations: currentSession.observations || '',
      });
    }
  }, [id, currentSession]);

  const fetchData = async () => {
    try {
      const [typesRes, formateursRes] = await Promise.all([
        api.get('/fmpa/types'),
        api.get('/personnels/formateurs'),
      ]);
      setTypesFMPA(typesRes.data);
      setFormateurs(formateursRes.data);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (id) {
        await dispatch(updateSession({ id, data: formData })).unwrap();
        toast.success('Session mise à jour');
      } else {
        await dispatch(createSession(formData)).unwrap();
        toast.success('Session créée');
      }
      navigate('/fmpa/sessions');
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'placesMax' || name === 'tauxHoraire' ? Number(value) : value,
    }));
  };

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate('/fmpa/sessions')}
          className="text-primary-600 hover:text-primary-700 mb-4 inline-block"
        >
          ← Retour aux sessions
        </button>
        
        <h1 className="text-2xl font-bold text-gray-900">
          {id ? 'Modifier la session' : 'Nouvelle session FMPA'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label">Type de FMPA</label>
            <select
              name="typeFMPAId"
              value={formData.typeFMPAId}
              onChange={handleChange}
              className="input"
              required
            >
              <option value="">Sélectionner un type</option>
              {typesFMPA.map(type => (
                <option key={type.id} value={type.id}>
                  {type.libelle} ({type.dureeHeures}h)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Formateur principal</label>
            <select
              name="formateurPrincipalId"
              value={formData.formateurPrincipalId}
              onChange={handleChange}
              className="input"
              required
            >
              <option value="">Sélectionner un formateur</option>
              {formateurs.map(formateur => (
                <option key={formateur.id} value={formateur.id}>
                  {formateur.prenom} {formateur.nom}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Date de début</label>
            <input
              type="datetime-local"
              name="dateDebut"
              value={formData.dateDebut}
              onChange={handleChange}
              className="input"
              required
            />
          </div>

          <div>
            <label className="label">Date de fin</label>
            <input
              type="datetime-local"
              name="dateFin"
              value={formData.dateFin}
              onChange={handleChange}
              className="input"
              required
            />
          </div>

          <div>
            <label className="label">Lieu</label>
            <input
              type="text"
              name="lieu"
              value={formData.lieu}
              onChange={handleChange}
              className="input"
              placeholder="Ex: CIS Nice - Salle de formation"
              required
            />
          </div>

          <div>
            <label className="label">Places maximum</label>
            <input
              type="number"
              name="placesMax"
              value={formData.placesMax}
              onChange={handleChange}
              className="input"
              min="4"
              max="20"
              required
            />
          </div>

          <div>
            <label className="label">Statut</label>
            <select
              name="statut"
              value={formData.statut}
              onChange={handleChange}
              className="input"
              required
            >
              <option value="PLANIFIE">Planifié</option>
              <option value="CONFIRME">Confirmé</option>
              <option value="EN_COURS">En cours</option>
              <option value="TERMINE">Terminé</option>
              <option value="ANNULE">Annulé</option>
            </select>
          </div>

          <div>
            <label className="label">Code TTA</label>
            <input
              type="text"
              name="codeTTA"
              value={formData.codeTTA}
              onChange={handleChange}
              className="input"
              placeholder="Ex: FMPA_SAP_2024"
            />
          </div>

          <div>
            <label className="label">Taux horaire (€)</label>
            <input
              type="number"
              name="tauxHoraire"
              value={formData.tauxHoraire}
              onChange={handleChange}
              className="input"
              step="0.01"
              min="0"
              required
            />
          </div>
        </div>

        <div className="mt-6">
          <label className="label">Observations</label>
          <textarea
            name="observations"
            value={formData.observations}
            onChange={handleChange}
            className="input"
            rows={3}
            placeholder="Informations complémentaires..."
          />
        </div>

        <div className="mt-6 flex gap-4">
          <button type="submit" className="btn btn-primary">
            {id ? 'Mettre à jour' : 'Créer la session'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/fmpa/sessions')}
            className="btn btn-secondary"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
