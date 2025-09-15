import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PermissionGate } from '../../components/auth';
import { usePermissions } from '../../hooks/usePermissions';

// Mock functions temporaires
const exportTTA = (_params: { startDate: string; endDate: string }) => ({
  unwrap: () => Promise.resolve(new ArrayBuffer(0))
});
const clearExportError = () => ({ type: 'CLEAR_EXPORT_ERROR' });

// Fonction toast temporaire
const toast = {
  error: (message: string) => console.error(message),
  success: (message: string) => console.log(message)
};

// Fonction saveAs temporaire
const saveAs = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default function TTAExport() {
  const dispatch = useDispatch();
  const { isExporting, exportError } = { isExporting: false, exportError: null }; // Mock temporaire
  const { canExportData, hasPermission, user } = usePermissions();
  
  // Effet pour nettoyer les erreurs lors du démontage du composant
  useEffect(() => {
    return () => {
      dispatch(clearExportError());
    };
  }, [dispatch]);
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date;
  });
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  const validateDates = (start: Date | undefined, end: Date | undefined): { valid: boolean; message?: string } => {
    if (!start || !end) {
      return { valid: false, message: 'Veuillez sélectionner une période valide' };
    }

    // Vérifier que la plage de dates ne dépasse pas 1 an
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    if (start < oneYearAgo) {
      return { 
        valid: false, 
        message: 'La date de début ne peut pas être antérieure à un an' 
      };
    }

    if (start > end) {
      return { 
        valid: false, 
        message: 'La date de début doit être antérieure à la date de fin' 
      };
    }

    // Vérifier que la plage de dates ne dépasse pas 3 mois
    const threeMonthsLater = new Date(start);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    
    if (end > threeMonthsLater) {
      return { 
        valid: false, 
        message: 'La plage de dates ne peut pas dépasser 3 mois' 
      };
    }

    return { valid: true };
  };

  const handleExport = async () => {
    // Vérifier les permissions avant de continuer
    if (!canExportData()) {
      toast.error('Vous n\'avez pas les permissions nécessaires pour effectuer cet export');
      return;
    }

    if (!startDate || !endDate) {
      toast.error('Veuillez sélectionner une période valide');
      return;
    }
    
    const { valid, message } = validateDates(startDate, endDate);
    if (!valid) {
      toast.error(message || 'Période invalide');
      return;
    }

    try {
      // On est sûr que startDate et endDate ne sont pas undefined grâce à la vérification plus haut
      const start = format(startDate as Date, 'yyyy-MM-dd');
      const end = format(endDate as Date, 'yyyy-MM-dd');
      
      // Log de l'action d'export pour audit
      console.log(`Export TTA initié par ${user?.matricule} pour la période ${start} - ${end}`);
      
      const response = await exportTTA({ 
        startDate: start, 
        endDate: end
      }).unwrap();
      
      if (response) {
        // Créer un blob à partir de la réponse
        const blob = new Blob([response], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        
        // Générer un nom de fichier avec la date
        const filename = `export_tta_${start}_${end}.xlsx`;
        
        // Télécharger le fichier
        saveAs(blob, filename);
        
        toast.success('Export TTA généré avec succès');
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'export TTA:', error);
      // La gestion d'erreur est maintenant gérée par le slice Redux
    }
  };

  // Formater la date pour l'affichage
  const formatDateDisplay = (date: Date | undefined) => {
    if (!date) return '';
    return format(date, 'dd/MM/yyyy', { locale: fr });
  };

  // Calculer le nombre de jours entre deux dates
  const getDaysBetweenDates = (start: Date, end: Date) => {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Afficher un résumé de la période sélectionnée
  const renderDateRangeSummary = () => {
    if (!startDate || !endDate) return null;
    
    const days = getDaysBetweenDates(startDate, endDate) + 1; // +1 pour inclure le dernier jour
    
    return (
      <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#eff6ff', borderRadius: '6px', fontSize: '14px', color: '#1e40af' }}>
        <p>Période sélectionnée : du {formatDateDisplay(startDate)} au {formatDateDisplay(endDate)}</p>
        <p>Total : {days} jour{days > 1 ? 's' : ''}</p>
      </div>
    );
  };

  // Composant de message d'accès refusé
  const AccessDeniedMessage = () => (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px', backgroundColor: 'white' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
          <span style={{ fontSize: '64px', marginBottom: '16px' }}>🛡️</span>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>Accès non autorisé</h2>
          <p style={{ color: '#6b7280', textAlign: 'center', marginBottom: '16px' }}>
            Vous n'avez pas les permissions nécessaires pour accéder à cette fonctionnalité.
          </p>
          <p style={{ fontSize: '14px', color: '#9ca3af' }}>
            Permissions requises : export.tta ou export.fmpa
          </p>
        </div>
      </div>
    </div>
  );

  // Vérifier les permissions avant de rendre le composant
  if (!canExportData()) {
    return <AccessDeniedMessage />;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '16px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Export TTA</h1>
          <p style={{ color: '#666', marginBottom: '8px' }}>Générez des exports pour le traitement comptable</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <span style={{ fontSize: '12px', backgroundColor: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '9999px' }}>
              Connecté : {user?.matricule}
            </span>
            {hasPermission('export.tta') && (
              <span style={{ fontSize: '12px', backgroundColor: '#dbeafe', color: '#1e40af', padding: '4px 8px', borderRadius: '9999px' }}>
                Export TTA autorisé
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
          <button 
            style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer' }}
            onClick={() => {
              const date = new Date();
              setStartDate(new Date(date.getFullYear(), date.getMonth(), 1));
              setEndDate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
            }}
          >
            Ce mois-ci
          </button>
          <button 
            style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer' }}
            onClick={() => {
              const date = new Date();
              setStartDate(new Date(date.getFullYear(), 0, 1));
              setEndDate(new Date(date.getFullYear(), 11, 31));
            }}
          >
            Cette année
          </button>
        </div>
      </div>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px', backgroundColor: 'white' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Générer un export TTA</h2>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Exportez les données des sessions FMPA au format Excel pour le traitement par le service comptable.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {renderDateRangeSummary()}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="start-date" style={{ fontSize: '14px', fontWeight: '500' }}>Date de début</label>
              <input
                type="date"
                value={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : undefined)}
                style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="end-date" style={{ fontSize: '14px', fontWeight: '500' }}>Date de fin</label>
              <input
                type="date"
                value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : undefined)}
                style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              {!canExportData() && (
                <div style={{ color: '#d97706', fontSize: '14px', padding: '8px', backgroundColor: '#fffbeb', borderRadius: '6px', border: '1px solid #fed7aa' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🛡️</span>
                    <span>Permissions insuffisantes pour effectuer l'export</span>
                  </div>
                </div>
              )}
              <PermissionGate permissions={['export.tta', 'export.fmpa']}>
                <button 
                  onClick={handleExport} 
                  disabled={!startDate || !endDate || isExporting || !canExportData()}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '12px 24px', 
                    backgroundColor: '#3b82f6', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '6px', 
                    cursor: 'pointer',
                    opacity: (!startDate || !endDate || isExporting || !canExportData()) ? 0.5 : 1
                  }}
                >
                {isExporting ? (
                  <>
                    <span>⏳</span>
                    <span>Génération en cours...</span>
                  </>
                ) : (
                  <>
                    <span>📥</span>
                    <span>Générer l'export</span>
                  </>
                )}
                </button>
              </PermissionGate>
              {exportError && (
                <div style={{ marginTop: '8px', fontSize: '14px', color: '#dc2626' }}>
                  <p style={{ fontWeight: '500' }}>Erreur lors de la génération de l'export :</p>
                  <p>{exportError}</p>
                  <button 
                    style={{ height: 'auto', padding: '0', fontSize: '14px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => console.log('Clear error')}
                  >
                    Fermer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
