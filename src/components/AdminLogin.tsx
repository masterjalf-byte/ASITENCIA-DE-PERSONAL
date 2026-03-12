import React, { useState } from 'react';
import { Shield, X, LogIn } from 'lucide-react';
import { motion } from 'motion/react';

interface AdminLoginProps {
  onLogin: () => void;
  onCancel: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, onCancel }) => {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const creds = JSON.parse(localStorage.getItem('admin_credentials') || '{"username":"admin","password":"admin"}');
    if (user === creds.username && pass === creds.password) {
      onLogin();
    } else {
      setError(true);
    }
  };

  const inputClasses = "w-full px-4 py-3 rounded-xl border-b-4 border-blue-300 bg-white text-blue-900 font-black text-lg shadow-inner focus:border-blue-500 focus:outline-none transition-all";
  const labelClasses = "text-sm font-black text-blue-100 uppercase tracking-wider flex items-center mb-2 drop-shadow-sm";

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md bg-gradient-to-b from-blue-500 to-blue-800 p-8 rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] border-t-4 border-blue-400 border-l-2 border-r-2 border-blue-600 relative"
    >
      <button 
        onClick={onCancel}
        className="absolute top-4 right-4 text-blue-200 hover:text-white transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="text-center space-y-3 mb-8 bg-blue-900/40 p-6 rounded-2xl border-b-4 border-blue-900/60 shadow-inner">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center shadow-[0_4px_0_#b45309]">
            <Shield className="w-8 h-8 text-blue-900" />
          </div>
        </div>
        <h1 className="text-lg font-black text-white tracking-widest drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] uppercase">ADMINISTRADOR</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className={labelClasses}>USUARIO</label>
          <input
            type="text"
            value={user}
            onChange={(e) => { setUser(e.target.value); setError(false); }}
            className={inputClasses}
            placeholder="admin"
          />
        </div>

        <div>
          <label className={labelClasses}>CONTRASEÑA</label>
          <input
            type="password"
            value={pass}
            onChange={(e) => { setPass(e.target.value); setError(false); }}
            className={inputClasses}
            placeholder="•••••"
          />
        </div>

        {error && (
          <div className="text-red-300 font-bold text-sm text-center bg-red-900/50 py-2 rounded-lg border border-red-500/50">
            USUARIO O CONTRASEÑA INCORRECTOS
          </div>
        )}

        <div className="pt-4">
          <button
            type="submit"
            className="w-full py-4 bg-yellow-400 text-blue-900 rounded-xl font-black text-xl uppercase tracking-widest shadow-[0_6px_0_#b45309] hover:shadow-[0_4px_0_#b45309] hover:translate-y-[2px] active:shadow-none active:translate-y-[6px] transition-all flex items-center justify-center space-x-2"
          >
            <LogIn className="w-6 h-6" />
            <span>INGRESAR</span>
          </button>
        </div>
      </form>
    </motion.div>
  );
};
