import { useRef, useEffect } from 'react';
import SignaturePad from 'signature_pad';

interface SignatureModalProps {
  onClose: () => void;
  onSave: (signature: string) => void;
}

export default function SignatureModal({ onClose, onSave }: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      signaturePadRef.current = new SignaturePad(canvasRef.current, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)',
      });
      
      // Ajuster la taille du canvas
      const resizeCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ratio = Math.max(window.devicePixelRatio || 1, 1);
          canvas.width = canvas.offsetWidth * ratio;
          canvas.height = canvas.offsetHeight * ratio;
          canvas.getContext('2d')?.scale(ratio, ratio);
          signaturePadRef.current?.clear();
        }
      };
      
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      
      return () => {
        window.removeEventListener('resize', resizeCanvas);
      };
    }
  }, []);

  const handleClear = () => {
    signaturePadRef.current?.clear();
  };

  const handleSave = () => {
    if (signaturePadRef.current?.isEmpty()) {
      alert('Veuillez signer avant de sauvegarder');
      return;
    }
    
    const dataURL = signaturePadRef.current?.toDataURL();
    if (dataURL) {
      onSave(dataURL);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h2 className="text-xl font-bold mb-4">Signature électronique</h2>
        
        <div className="border-2 border-gray-300 rounded-lg mb-4">
          <canvas
            ref={canvasRef}
            className="w-full"
            style={{ height: '300px' }}
          />
        </div>
        
        <div className="flex justify-between">
          <button
            onClick={handleClear}
            className="btn btn-secondary"
          >
            Effacer
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="btn btn-secondary"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="btn btn-primary"
            >
              Sauvegarder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
