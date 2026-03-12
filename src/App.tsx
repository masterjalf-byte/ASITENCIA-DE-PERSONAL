/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { AttendanceForm } from './components/AttendanceForm';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { ShieldAlert } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'form' | 'login' | 'dashboard'>('form');

  useEffect(() => {
    if (window.location.hash.includes('access_token=')) {
      const params = new URLSearchParams(window.location.hash.substring(1));
      const token = params.get('access_token');
      if (token && window.opener) {
        window.opener.postMessage({ type: 'GOOGLE_AUTH_TOKEN', token }, window.location.origin);
        window.close();
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-blue-950 py-8 px-4 sm:px-6 lg:px-8 font-sans flex items-center justify-center relative">
      {view === 'form' && (
        <>
          <button
            onClick={() => setView('login')}
            className="absolute top-4 right-4 flex items-center px-2 py-1 bg-blue-800/80 text-blue-200 rounded-md text-[10px] font-bold uppercase shadow-[0_2px_0_#1e3a8a] hover:translate-y-[1px] hover:shadow-[0_1px_0_#1e3a8a] active:translate-y-[2px] active:shadow-none transition-all z-10 backdrop-blur-sm"
          >
            <ShieldAlert className="w-3 h-3 mr-1" />
            ADMIN
          </button>
          <AttendanceForm />
        </>
      )}
      {view === 'login' && (
        <AdminLogin 
          onLogin={() => setView('dashboard')} 
          onCancel={() => setView('form')} 
        />
      )}
      {view === 'dashboard' && (
        <AdminDashboard 
          onLogout={() => setView('form')} 
        />
      )}
    </div>
  );
}
