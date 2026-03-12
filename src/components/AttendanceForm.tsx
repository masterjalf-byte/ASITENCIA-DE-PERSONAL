import React, { useState } from 'react';
import { CameraCapture } from './CameraCapture';
import { LocationDisplay } from './LocationDisplay';
import { motion } from 'motion/react';
import { User, CreditCard, Hash, Check, Send, Camera, Clock, Loader2, Building2 } from 'lucide-react';

interface FormData {
  type: 'ENTRADA' | 'SALIDA';
  name: string;
  employeeId: string;
  registerId: string;
  locationDescription: string;
  delegacion?: string;
  photo: string | null;
  location: {
    latitude: number;
    longitude: number;
  } | null;
}

export const AttendanceForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    type: 'ENTRADA',
    name: '',
    employeeId: '',
    registerId: '',
    locationDescription: '',
    delegacion: '',
    photo: null,
    location: null,
  });

  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Forzar mayúsculas en todos los inputs
    setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
  };

  const handleCapture = (imageSrc: string) => {
    setFormData(prev => ({ ...prev, photo: imageSrc }));
  };

  const handleLocationUpdate = (location: any) => {
    setFormData(prev => ({ ...prev, location }));
  };

  const uploadToDrive = async (data: any, token: string) => {
    if (token === 'mock_token_for_demo') {
      console.log('[Mock] Subiendo registro a Google Drive...');
      return;
    }

    const filename = `registro_${data.employeeId}_${new Date().getTime()}.json`;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });

    const metadata = {
      name: filename,
      mimeType: 'application/json'
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    try {
      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: form
      });
    } catch (error) {
      console.error('Error al subir a Drive:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.photo || !formData.location) {
      alert('POR FAVOR COMPLETE TODOS LOS CAMPOS REQUERIDOS (FOTO Y UBICACIÓN).');
      return;
    }
    
    if (formData.locationDescription === 'DELEGACIONES' && !formData.delegacion) {
      alert('POR FAVOR SELECCIONE UNA DELEGACIÓN.');
      return;
    }
    
    setIsSubmitting(true);

    try {
      const scriptUrl = import.meta.env.VITE_GOOGLE_SHEETS_URL;
      
      const finalLocation = formData.locationDescription === 'DELEGACIONES' && formData.delegacion
        ? `DELEGACIÓN ${formData.delegacion}`
        : formData.locationDescription;

      const dataToSubmit = {
        ...formData,
        locationDescription: finalLocation,
        timestamp: new Date().toISOString()
      };
      
      if (scriptUrl) {
        await fetch(scriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: JSON.stringify(dataToSubmit)
        });
      } else {
        console.log('Form Data Submitted:', dataToSubmit);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Guardar en localStorage para el panel de Admin
      const newRecord = {
        id: Date.now().toString(),
        ...dataToSubmit
      };
      const existingRecords = JSON.parse(localStorage.getItem('attendance_records') || '[]');
      localStorage.setItem('attendance_records', JSON.stringify([newRecord, ...existingRecords]));

      const googleToken = localStorage.getItem('google_drive_token');
      if (googleToken) {
        uploadToDrive(newRecord, googleToken);
      }

      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('HUBO UN ERROR AL ENVIAR EL REGISTRO. POR FAVOR INTENTE NUEVAMENTE.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="flex flex-col items-center justify-center p-8 bg-gradient-to-b from-blue-500 to-blue-700 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-t-4 border-blue-300 border-l-2 max-w-md mx-auto text-center space-y-6 text-white"
      >
        <div className="w-24 h-24 bg-green-400 rounded-full flex items-center justify-center shadow-[0_8px_0_#166534] border-4 border-green-200">
          <Check className="w-12 h-12 text-green-900" />
        </div>
        <h2 className="text-3xl font-black uppercase tracking-widest drop-shadow-md">¡REGISTRO EXITOSO!</h2>
        <p className="text-blue-100 font-bold text-lg">
          EL REGISTRO DE <span className="text-yellow-300">{formData.type}</span> PARA <span className="text-yellow-300">{formData.name}</span> HA SIDO GUARDADO.
        </p>
        <div className="text-sm text-blue-900 bg-blue-50 p-6 rounded-xl w-full text-left space-y-3 font-bold shadow-inner border-b-4 border-blue-200">
          <p className="flex justify-between border-b border-blue-200 pb-2"><span>TIPO:</span> <span className="text-blue-600">{formData.type}</span></p>
          <p className="flex justify-between border-b border-blue-200 pb-2"><span>ID EMPLEADO:</span> <span className="text-blue-600">{formData.employeeId}</span></p>
          <p className="flex justify-between border-b border-blue-200 pb-2"><span>CAJA:</span> <span className="text-blue-600">{formData.registerId}</span></p>
          <p className="flex justify-between border-b border-blue-200 pb-2"><span>LUGAR:</span> <span className="text-blue-600">{formData.locationDescription}</span></p>
          <p className="flex justify-between"><span>UBICACIÓN:</span> <span className="text-blue-600">CAPTURADA</span></p>
        </div>
        <button 
          onClick={() => {
            setSubmitted(false);
            setFormData({
              type: 'ENTRADA',
              name: '',
              employeeId: '',
              registerId: '',
              locationDescription: '',
              delegacion: '',
              photo: null,
              location: null,
            });
          }}
          className="w-full py-4 bg-yellow-400 text-blue-900 rounded-xl font-black text-lg uppercase tracking-wider shadow-[0_6px_0_#b45309] hover:shadow-[0_4px_0_#b45309] hover:translate-y-[2px] active:shadow-none active:translate-y-[6px] transition-all"
        >
          NUEVO REGISTRO
        </button>
      </motion.div>
    );
  }

  const inputClasses = "w-full px-4 py-3 rounded-xl border-b-4 border-blue-300 bg-white text-blue-900 uppercase font-black text-lg shadow-inner focus:border-blue-500 focus:outline-none transition-all";
  const labelClasses = "text-sm font-black text-blue-100 uppercase tracking-wider flex items-center mb-2 drop-shadow-sm";

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl mx-auto bg-gradient-to-b from-blue-500 to-blue-800 p-6 md:p-10 rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] border-t-4 border-blue-400 border-l-2 border-r-2 border-blue-600">
      <div className="text-center space-y-3 mb-8 bg-blue-900/40 p-6 rounded-2xl border-b-4 border-blue-900/60 shadow-inner">
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-widest drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] uppercase leading-tight">
          REGISTRO DE ASISTENCIA
        </h1>
        <p className="text-blue-200 font-bold uppercase tracking-wide text-sm md:text-base max-w-lg mx-auto">
          DEL PERSONAL ADSCRITO A RECAUDACIÓN DE LA TESORERÍA DE H. AYUNTAMIENTO DE TLAQUEPAQUE
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <label className={labelClasses}>
              <Clock className="w-5 h-5 mr-2 text-yellow-300" />
              TIPO DE REGISTRO
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className={inputClasses}
            >
              <option value="ENTRADA">ENTRADA</option>
              <option value="SALIDA">SALIDA</option>
            </select>
          </div>

          <div>
            <label className={labelClasses}>
              <User className="w-5 h-5 mr-2 text-yellow-300" />
              NOMBRE COMPLETO
            </label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleInputChange}
              className={inputClasses}
              placeholder="EJ. JUAN PÉREZ"
            />
          </div>

          <div>
            <label className={labelClasses}>
              <Hash className="w-5 h-5 mr-2 text-yellow-300" />
              NÚMERO DE EMPLEADO
            </label>
            <input
              type="text"
              name="employeeId"
              required
              value={formData.employeeId}
              onChange={handleInputChange}
              className={inputClasses}
              placeholder="EJ. EMP-123"
            />
          </div>

          <div>
            <label className={labelClasses}>
              <CreditCard className="w-5 h-5 mr-2 text-yellow-300" />
              NÚMERO DE CAJA
            </label>
            <input
              type="text"
              name="registerId"
              required
              value={formData.registerId}
              onChange={handleInputChange}
              className={inputClasses}
              placeholder="EJ. CAJA-01"
            />
          </div>

          <div>
            <label className={labelClasses}>
              <Building2 className="w-5 h-5 mr-2 text-yellow-300" />
              LUGAR DE TRABAJO
            </label>
            <select
              name="locationDescription"
              required
              value={formData.locationDescription}
              onChange={handleInputChange}
              className={inputClasses}
            >
              <option value="" disabled>SELECCIONE...</option>
              <option value="TESORERÍA">TESORERÍA</option>
              <option value="CATASTRO">CATASTRO</option>
              <option value="OBRAS PÚBLICAS">OBRAS PÚBLICAS</option>
              <option value="CRUZ VERDE">CRUZ VERDE</option>
              <option value="DELEGACIONES">DELEGACIONES</option>
            </select>
          </div>

          {formData.locationDescription === 'DELEGACIONES' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4"
            >
              <label className={labelClasses}>
                <Building2 className="w-5 h-5 mr-2 text-yellow-300" />
                DELEGACIÓN
              </label>
              <select
                name="delegacion"
                required
                value={formData.delegacion}
                onChange={handleInputChange}
                className={inputClasses}
              >
                <option value="" disabled>SELECCIONE...</option>
                <option value="SANTA MARÍA">SANTA MARÍA</option>
                <option value="SANTA ANITA">SANTA ANITA</option>
                <option value="SAN PEDRITO">SAN PEDRITO</option>
                <option value="SAN MARTÍN DE LAS FLORES">SAN MARTÍN DE LAS FLORES</option>
                <option value="TOLUQUILLA">TOLUQUILLA</option>
                <option value="LOMA BONITA">LOMA BONITA</option>
              </select>
            </motion.div>
          )}
          
          <LocationDisplay onLocationUpdate={handleLocationUpdate} />
        </div>

        <div className="space-y-4 flex flex-col h-full">
          <label className={labelClasses}>
            <Camera className="w-5 h-5 mr-2 text-yellow-300" />
            FOTOGRAFÍA DE EVIDENCIA
          </label>
          <div className="flex-grow flex items-center justify-center bg-blue-800/50 rounded-2xl border-4 border-dashed border-blue-400 p-4 shadow-inner">
             <CameraCapture onCapture={handleCapture} />
          </div>
        </div>
      </div>

      <div className="pt-8 mt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-5 bg-yellow-400 text-blue-900 rounded-xl font-black text-2xl uppercase tracking-widest shadow-[0_8px_0_#b45309] hover:shadow-[0_5px_0_#b45309] hover:translate-y-[3px] active:shadow-none active:translate-y-[8px] transition-all flex items-center justify-center space-x-3 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-[0_8px_0_#b45309]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin" />
              <span>ENVIANDO...</span>
            </>
          ) : (
            <>
              <Send className="w-8 h-8" />
              <span>ENVIAR REGISTRO</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
