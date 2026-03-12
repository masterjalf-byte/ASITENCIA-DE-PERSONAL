import React, { useState, useEffect, useRef } from 'react';
import { LogOut, Users, Calendar, AlertTriangle, FileText, Download, ChevronLeft, Shield, Filter, XCircle, Eye, Database, Trash2, Plus, Settings, Save, Upload, Cloud } from 'lucide-react';
import { motion } from 'motion/react';
import { AttendanceRecord, Employee } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface AdminDashboardProps {
  onLogout: () => void;
}

type ReportType = 'ALL' | 'EMPLOYEE' | 'MONTH' | 'YEAR' | 'INCIDENCES' | 'EMPLOYEES_DB' | 'SETTINGS';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [reportType, setReportType] = useState<ReportType>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [employeeSearch, setEmployeeSearch] = useState<string>('');
  const [startMonth, setStartMonth] = useState<string>('');
  const [endMonth, setEndMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [newEmployee, setNewEmployee] = useState({ name: '', employeeId: '', schedule: '', location: '' });
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Google Drive & File Input
  const [googleToken, setGoogleToken] = useState<string | null>(localStorage.getItem('google_drive_token'));
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedRecords = JSON.parse(localStorage.getItem('attendance_records') || '[]');
    setRecords(savedRecords);
    const savedEmployees = JSON.parse(localStorage.getItem('employee_database') || '[]');
    setEmployees(savedEmployees);
  }, []);

  const getFilteredRecords = () => {
    let filtered = [...records];
    // Sort by timestamp descending
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (reportType === 'ALL' || reportType === 'INCIDENCES') {
      if (startDate) {
        const start = new Date(startDate);
        start.setMinutes(start.getMinutes() + start.getTimezoneOffset());
        start.setHours(0, 0, 0, 0);
        filtered = filtered.filter(r => new Date(r.timestamp) >= start);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setMinutes(end.getMinutes() + end.getTimezoneOffset());
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter(r => new Date(r.timestamp) <= end);
      }
    } else if (reportType === 'EMPLOYEE') {
      if (employeeSearch) {
        const search = employeeSearch.toLowerCase();
        filtered = filtered.filter(r => 
          r.name.toLowerCase().includes(search) || 
          r.employeeId.toLowerCase().includes(search)
        );
      }
    } else if (reportType === 'MONTH') {
      if (startMonth) {
        const start = new Date(startMonth + '-01T00:00:00');
        filtered = filtered.filter(r => new Date(r.timestamp) >= start);
      }
      if (endMonth) {
        const end = new Date(endMonth + '-01T00:00:00');
        end.setMonth(end.getMonth() + 1);
        end.setDate(0); // Last day of month
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter(r => new Date(r.timestamp) <= end);
      }
    } else if (reportType === 'YEAR') {
      if (selectedYear) {
        filtered = filtered.filter(r => new Date(r.timestamp).getFullYear().toString() === selectedYear);
      }
    }

    if (reportType === 'INCIDENCES') {
      // Retardos: ENTRADA después de las 09:15 AM (ejemplo)
      filtered = filtered.filter(r => {
        if (r.type === 'ENTRADA') {
          const date = new Date(r.timestamp);
          const hours = date.getHours();
          const minutes = date.getMinutes();
          // Retardo si es después de las 9:15
          if (hours > 9 || (hours === 9 && minutes > 15)) {
            return true;
          }
        }
        return false;
      });
    }

    return filtered;
  };

  const uploadToDrive = async (blob: Blob, filename: string) => {
    if (!googleToken) return;
    
    if (googleToken === 'mock_token_for_demo') {
      console.log(`[Mock] Subiendo ${filename} a Google Drive...`);
      alert(`[SIMULACIÓN] El archivo ${filename} se habría guardado en Google Drive.`);
      return;
    }

    const metadata = {
      name: filename,
      mimeType: blob.type
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    try {
      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${googleToken}`
        },
        body: form
      });
      if (!res.ok) throw new Error('Error al subir a Drive');
      alert(`¡ARCHIVO ${filename} GUARDADO EN GOOGLE DRIVE EXITOSAMENTE!`);
    } catch (error) {
      console.error(error);
      alert('ERROR AL SUBIR EL ARCHIVO A GOOGLE DRIVE. EL TOKEN PUEDE HABER EXPIRADO.');
    }
  };

  const exportCSV = () => {
    const filtered = getFilteredRecords();
    if (filtered.length === 0) {
      alert('NO HAY REGISTROS PARA EXPORTAR');
      return;
    }
    
    const headers = ['FECHA', 'HORA', 'TIPO', 'NOMBRE', 'ID EMPLEADO', 'CAJA', 'LUGAR', 'DELEGACION', 'ESTADO'];
    const rows = filtered.map(r => {
      const date = new Date(r.timestamp);
      const isRetardo = r.type === 'ENTRADA' && (date.getHours() > 9 || (date.getHours() === 9 && date.getMinutes() > 15));
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        r.type,
        r.name,
        r.employeeId,
        r.registerId,
        r.locationDescription,
        r.delegacion || 'N/A',
        isRetardo ? 'RETARDO' : 'OK'
      ].map(val => `"${val}"`).join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = `asistencia_${new Date().toISOString().split('T')[0]}.csv`;
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (googleToken) {
      uploadToDrive(blob, filename);
    }
  };

  const exportPDF = () => {
    const filtered = getFilteredRecords();
    if (filtered.length === 0) {
      alert('NO HAY REGISTROS PARA EXPORTAR');
      return;
    }
    
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Reporte de Asistencia', 14, 15);
    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, 14, 22);
    
    const tableData = filtered.map(r => {
      const date = new Date(r.timestamp);
      const isRetardo = r.type === 'ENTRADA' && (date.getHours() > 9 || (date.getHours() === 9 && date.getMinutes() > 15));
      return [
        date.toLocaleDateString() + ' ' + date.toLocaleTimeString(),
        r.type,
        r.name,
        r.employeeId,
        r.locationDescription + (r.delegacion ? ` (${r.delegacion})` : ''),
        isRetardo ? 'RETARDO' : 'OK'
      ];
    });
    
    autoTable(doc, {
      startY: 30,
      head: [['FECHA / HORA', 'TIPO', 'EMPLEADO', 'ID', 'LUGAR', 'ESTADO']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 138] }
    });
    
    const filename = `asistencia_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);

    if (googleToken) {
      const pdfBlob = doc.output('blob');
      uploadToDrive(pdfBlob, filename);
    }
  };

  const handleDeleteRecord = (id: string) => {
    if (window.confirm('¿ESTÁ SEGURO DE QUE DESEA ELIMINAR ESTE REGISTRO? ESTA ACCIÓN NO SE PUEDE DESHACER.')) {
      const updated = records.filter(r => r.id !== id);
      setRecords(updated);
      localStorage.setItem('attendance_records', JSON.stringify(updated));
    }
  };

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployee.name || !newEmployee.employeeId || !newEmployee.schedule || !newEmployee.location) {
      alert('POR FAVOR COMPLETE TODOS LOS CAMPOS DEL EMPLEADO.');
      return;
    }
    const emp: Employee = {
      id: Date.now().toString(),
      name: newEmployee.name.toUpperCase(),
      employeeId: newEmployee.employeeId.toUpperCase(),
      schedule: newEmployee.schedule.toUpperCase(),
      location: newEmployee.location.toUpperCase()
    };
    const updated = [...employees, emp];
    setEmployees(updated);
    localStorage.setItem('employee_database', JSON.stringify(updated));
    setNewEmployee({ name: '', employeeId: '', schedule: '', location: '' });
  };

  const handleDeleteEmployee = (id: string) => {
    if (window.confirm('¿ESTÁ SEGURO DE QUE DESEA ELIMINAR ESTE EMPLEADO? ESTA ACCIÓN NO SE PUEDE DESHACER.')) {
      const updated = employees.filter(e => e.id !== id);
      setEmployees(updated);
      localStorage.setItem('employee_database', JSON.stringify(updated));
    }
  };

  const handleImportDB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const newEmployees: Employee[] = data.map((row: any) => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: (row.NOMBRE || row.Name || row.nombre || '').toString().toUpperCase(),
          employeeId: (row.ID || row.NOMINA || row.NÓMINA || row.employeeId || '').toString().toUpperCase(),
          schedule: (row.HORARIO || row.Schedule || row.horario || '').toString().toUpperCase(),
          location: (row.ADSCRIPCION || row.ADSCRIPCIÓN || row.LUGAR || row.location || '').toString().toUpperCase()
        })).filter(emp => emp.name && emp.employeeId);

        if (newEmployees.length > 0) {
          const updated = [...employees, ...newEmployees];
          setEmployees(updated);
          localStorage.setItem('employee_database', JSON.stringify(updated));
          alert(`¡SE IMPORTARON ${newEmployees.length} EMPLEADOS EXITOSAMENTE!`);
        } else {
          alert('NO SE ENCONTRARON DATOS VÁLIDOS EN EL ARCHIVO. ASEGÚRESE DE TENER COLUMNAS COMO "NOMBRE", "NÓMINA", "HORARIO", "ADSCRIPCIÓN".');
        }
      } catch (error) {
        console.error(error);
        alert('ERROR AL LEER EL ARCHIVO.');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportDB = () => {
    if (employees.length === 0) {
      alert('NO HAY EMPLEADOS PARA GUARDAR.');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(employees.map(emp => ({
      NOMBRE: emp.name,
      NÓMINA: emp.employeeId,
      HORARIO: emp.schedule,
      ADSCRIPCIÓN: emp.location
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Empleados");
    XLSX.writeFile(wb, `Base_Datos_Personal_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleConnectGoogleDrive = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      alert('FALTA CONFIGURAR VITE_GOOGLE_CLIENT_ID EN LAS VARIABLES DE ENTORNO. POR AHORA SE SIMULARÁ LA CONEXIÓN.');
      localStorage.setItem('google_drive_token', 'mock_token_for_demo');
      setGoogleToken('mock_token_for_demo');
      return;
    }
    
    const redirectUri = window.location.origin;
    const scope = encodeURIComponent('https://www.googleapis.com/auth/drive.file');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;
    
    window.open(authUrl, 'GoogleAuth', 'width=600,height=600');
    
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type === 'GOOGLE_AUTH_TOKEN') {
        const token = event.data.token;
        localStorage.setItem('google_drive_token', token);
        setGoogleToken(token);
        alert('¡CUENTA DE GOOGLE DRIVE VINCULADA EXITOSAMENTE!');
        window.removeEventListener('message', handleMessage);
      }
    };
    window.addEventListener('message', handleMessage);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    const creds = JSON.parse(localStorage.getItem('admin_credentials') || '{"username":"admin","password":"admin"}');
    
    if (currentPassword !== creds.password) {
      alert('LA CONTRASEÑA ACTUAL ES INCORRECTA.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('LAS CONTRASEÑAS NUEVAS NO COINCIDEN.');
      return;
    }
    if (newPassword.length < 4) {
      alert('LA NUEVA CONTRASEÑA DEBE TENER AL MENOS 4 CARACTERES.');
      return;
    }
    
    localStorage.setItem('admin_credentials', JSON.stringify({ username: creds.username, password: newPassword }));
    alert('¡CONTRASEÑA ACTUALIZADA EXITOSAMENTE!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const renderGroupedRecords = () => {
    if (reportType === 'SETTINGS') {
      return (
        <div className="px-4 md:px-6 pb-8 max-w-md mx-auto mt-6 w-full">
          <div className="bg-blue-900/40 p-6 md:p-8 rounded-2xl border border-blue-400/20 shadow-inner">
            <h3 className="text-xl md:text-2xl font-black text-yellow-300 uppercase tracking-widest mb-6 flex items-center justify-center text-center">
              <Settings className="w-6 h-6 mr-3 shrink-0" /> CAMBIAR CONTRASEÑA
            </h3>
            
            <form onSubmit={handleChangePassword} className="space-y-5">
              <div>
                <label className="text-blue-200 text-xs font-black uppercase tracking-wider mb-2 block text-center sm:text-left">CONTRASEÑA ACTUAL</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-b-2 border-blue-400 bg-white/10 rounded-xl text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all text-center sm:text-left tracking-widest"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="text-blue-200 text-xs font-black uppercase tracking-wider mb-2 block text-center sm:text-left">NUEVA CONTRASEÑA</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-b-2 border-blue-400 bg-white/10 rounded-xl text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all text-center sm:text-left tracking-widest"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="text-blue-200 text-xs font-black uppercase tracking-wider mb-2 block text-center sm:text-left">CONFIRMAR NUEVA CONTRASEÑA</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-b-2 border-blue-400 bg-white/10 rounded-xl text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all text-center sm:text-left tracking-widest"
                  placeholder="••••••••"
                />
              </div>
              
              <button
                type="submit"
                className="w-full mt-8 flex items-center justify-center px-6 py-4 bg-yellow-400 text-blue-900 rounded-xl font-black uppercase tracking-widest shadow-[0_4px_0_#b45309] hover:translate-y-[2px] hover:shadow-[0_2px_0_#b45309] active:translate-y-[4px] active:shadow-none transition-all text-sm"
              >
                <Save className="w-5 h-5 mr-2 shrink-0" />
                GUARDAR CAMBIOS
              </button>
            </form>

            <div className="mt-10 pt-8 border-t border-blue-400/20">
              <h3 className="text-xl md:text-2xl font-black text-yellow-300 uppercase tracking-widest mb-6 flex items-center justify-center text-center">
                <Cloud className="w-6 h-6 mr-3 shrink-0" /> GOOGLE DRIVE
              </h3>
              <p className="text-blue-200 text-xs font-bold text-center mb-6">
                VINCULA TU CUENTA DE GOOGLE PARA GUARDAR AUTOMÁTICAMENTE LOS REPORTES EXPORTADOS Y LOS REGISTROS CAPTURADOS.
              </p>
              <button
                onClick={handleConnectGoogleDrive}
                className={`w-full flex items-center justify-center px-6 py-4 rounded-xl font-black uppercase tracking-widest transition-all text-sm ${googleToken ? 'bg-green-500 text-white shadow-[0_4px_0_#14532d] hover:translate-y-[2px] hover:shadow-[0_2px_0_#14532d] active:translate-y-[4px] active:shadow-none' : 'bg-white text-blue-900 shadow-[0_4px_0_#cbd5e1] hover:translate-y-[2px] hover:shadow-[0_2px_0_#cbd5e1] active:translate-y-[4px] active:shadow-none'}`}
              >
                <Cloud className="w-5 h-5 mr-2 shrink-0" />
                {googleToken ? 'CUENTA VINCULADA' : 'VINCULAR CUENTA'}
              </button>
              {googleToken && (
                <button
                  onClick={() => {
                    localStorage.removeItem('google_drive_token');
                    setGoogleToken(null);
                  }}
                  className="w-full mt-4 flex items-center justify-center px-6 py-3 bg-red-500/20 text-red-400 rounded-xl font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all text-xs"
                >
                  DESVINCULAR CUENTA
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (reportType === 'EMPLOYEES_DB') {
      return (
        <div className="space-y-6 md:space-y-8 px-4 md:px-6 pb-8">
          <form onSubmit={handleAddEmployee} className="bg-blue-900/40 p-4 md:p-6 rounded-2xl border border-blue-400/20 shadow-inner">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
              <h3 className="text-lg md:text-xl font-black text-yellow-300 uppercase tracking-widest flex items-center">
                <Plus className="w-5 h-5 mr-2" /> AGREGAR EMPLEADO
              </h3>
              <div>
                <input 
                  type="file" 
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleImportDB}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-xl font-black uppercase tracking-widest shadow-[0_4px_0_#1e3a8a] hover:translate-y-[2px] hover:shadow-[0_2px_0_#1e3a8a] active:translate-y-[4px] active:shadow-none transition-all text-xs"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    IMPORTAR
                  </button>
                  <button
                    type="button"
                    onClick={handleExportDB}
                    className="flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-xl font-black uppercase tracking-widest shadow-[0_4px_0_#14532d] hover:translate-y-[2px] hover:shadow-[0_2px_0_#14532d] active:translate-y-[4px] active:shadow-none transition-all text-xs"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    GUARDAR BD
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-blue-200 text-xs font-black uppercase tracking-wider mb-1 block">NOMBRE</label>
                <input
                  type="text"
                  value={newEmployee.name}
                  onChange={e => setNewEmployee({...newEmployee, name: e.target.value})}
                  className="w-full px-3 py-2 border-b-2 border-blue-400 bg-white/10 rounded-lg text-sm text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all"
                  placeholder="EJ. JUAN PÉREZ"
                />
              </div>
              <div>
                <label className="text-blue-200 text-xs font-black uppercase tracking-wider mb-1 block">ID EMPLEADO</label>
                <input
                  type="text"
                  value={newEmployee.employeeId}
                  onChange={e => setNewEmployee({...newEmployee, employeeId: e.target.value})}
                  className="w-full px-3 py-2 border-b-2 border-blue-400 bg-white/10 rounded-lg text-sm text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all"
                  placeholder="EJ. EMP-123"
                />
              </div>
              <div>
                <label className="text-blue-200 text-xs font-black uppercase tracking-wider mb-1 block">HORARIO</label>
                <input
                  type="text"
                  value={newEmployee.schedule}
                  onChange={e => setNewEmployee({...newEmployee, schedule: e.target.value})}
                  className="w-full px-3 py-2 border-b-2 border-blue-400 bg-white/10 rounded-lg text-sm text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all"
                  placeholder="EJ. 09:00 - 15:00"
                />
              </div>
              <div>
                <label className="text-blue-200 text-xs font-black uppercase tracking-wider mb-1 block">ADSCRIPCIÓN</label>
                <input
                  type="text"
                  value={newEmployee.location}
                  onChange={e => setNewEmployee({...newEmployee, location: e.target.value})}
                  className="w-full px-3 py-2 border-b-2 border-blue-400 bg-white/10 rounded-lg text-sm text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all"
                  placeholder="EJ. TESORERÍA"
                />
              </div>
            </div>
            <button
              type="submit"
              className="mt-6 w-full sm:w-auto flex items-center justify-center px-6 py-3 bg-green-500 text-white rounded-xl font-black uppercase tracking-widest shadow-[0_4px_0_#14532d] hover:translate-y-[2px] hover:shadow-[0_2px_0_#14532d] active:translate-y-[4px] active:shadow-none transition-all"
            >
              <Users className="w-5 h-5 mr-2" />
              GUARDAR EMPLEADO
            </button>
          </form>

          <div className="overflow-x-auto rounded-2xl border border-blue-400/20 shadow-inner bg-blue-900/40">
            <table className="w-full text-left text-sm text-blue-100">
              <thead className="bg-blue-800/80 text-blue-200 text-xs uppercase font-black border-b-2 border-blue-400/30">
                <tr>
                  <th className="px-4 py-3 md:px-6 md:py-4">EMPLEADO</th>
                  <th className="px-4 py-3 md:px-6 md:py-4 hidden sm:table-cell">ID EMPLEADO</th>
                  <th className="px-4 py-3 md:px-6 md:py-4 hidden sm:table-cell">HORARIO</th>
                  <th className="px-4 py-3 md:px-6 md:py-4 hidden sm:table-cell">ADSCRIPCIÓN</th>
                  <th className="px-4 py-3 md:px-6 md:py-4 text-center">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-400/10 bg-transparent">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 md:px-6 text-center text-blue-300 font-bold uppercase tracking-widest">
                      NO HAY EMPLEADOS REGISTRADOS
                    </td>
                  </tr>
                ) : (
                  employees.map((emp, index) => (
                    <tr key={emp.id} className={`hover:bg-blue-800/50 transition-colors ${index % 2 === 0 ? 'bg-blue-900/20' : ''}`}>
                      <td className="px-4 py-3 md:px-6 md:py-4">
                        <div className="font-bold text-white">{emp.name}</div>
                        <div className="text-blue-300 text-[10px] sm:hidden mt-1 font-bold">{emp.employeeId}</div>
                        <div className="text-blue-200 text-[10px] sm:hidden mt-1">{emp.schedule}</div>
                        <div className="text-blue-200 text-[10px] sm:hidden">{emp.location}</div>
                      </td>
                      <td className="px-4 py-3 md:px-6 md:py-4 font-bold text-blue-300 hidden sm:table-cell">{emp.employeeId}</td>
                      <td className="px-4 py-3 md:px-6 md:py-4 font-bold text-blue-200 hidden sm:table-cell">{emp.schedule}</td>
                      <td className="px-4 py-3 md:px-6 md:py-4 font-bold text-blue-200 hidden sm:table-cell">{emp.location}</td>
                      <td className="px-4 py-3 md:px-6 md:py-4 text-center">
                        <button
                          onClick={() => handleDeleteEmployee(emp.id)}
                          className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                          title="ELIMINAR EMPLEADO"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    const filtered = getFilteredRecords();

    if (filtered.length === 0) {
      return (
        <div className="text-center py-12 text-blue-200 font-bold uppercase tracking-widest bg-blue-900/30 rounded-2xl border-2 border-dashed border-blue-400/50 m-6">
          NO HAY REGISTROS PARA MOSTRAR EN ESTE PERIODO
        </div>
      );
    }

    let grouped: Record<string, AttendanceRecord[]> = {};

    if (reportType === 'EMPLOYEE') {
      grouped = filtered.reduce((acc, curr) => {
        const key = `${curr.name} (${curr.employeeId})`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(curr);
        return acc;
      }, {} as Record<string, AttendanceRecord[]>);
    } else if (reportType === 'MONTH') {
      grouped = filtered.reduce((acc, curr) => {
        const date = new Date(curr.timestamp);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(curr);
        return acc;
      }, {} as Record<string, AttendanceRecord[]>);
    } else if (reportType === 'YEAR') {
      grouped = filtered.reduce((acc, curr) => {
        const key = new Date(curr.timestamp).getFullYear().toString();
        if (!acc[key]) acc[key] = [];
        acc[key].push(curr);
        return acc;
      }, {} as Record<string, AttendanceRecord[]>);
    } else {
      // ALL or INCIDENCES
      grouped = { 'REGISTROS': filtered };
    }

    return Object.entries(grouped).map(([groupName, groupRecords]) => (
      <div key={groupName} className="mb-8 px-4 md:px-6">
        <h3 className="text-base md:text-lg font-black text-yellow-300 uppercase tracking-widest mb-4 pb-2 border-b border-blue-400/20 flex items-center justify-between">
          <span className="truncate pr-2">{groupName}</span>
          <span className="bg-blue-900/50 text-blue-200 text-[10px] md:text-xs py-1 px-3 rounded-full font-bold border border-blue-400/30 whitespace-nowrap">
            {groupRecords.length} REGISTROS
          </span>
        </h3>
        <div className="overflow-x-auto rounded-2xl border border-blue-400/20 shadow-inner bg-blue-900/40">
          <table className="w-full text-left text-sm text-blue-100">
            <thead className="bg-blue-800/80 text-blue-200 text-xs uppercase font-black border-b-2 border-blue-400/30">
              <tr>
                <th className="px-4 py-3 md:px-6 md:py-4">FECHA / HORA</th>
                <th className="px-4 py-3 md:px-6 md:py-4">TIPO</th>
                <th className="px-4 py-3 md:px-6 md:py-4">EMPLEADO</th>
                <th className="px-4 py-3 md:px-6 md:py-4 hidden sm:table-cell">LUGAR</th>
                <th className="px-4 py-3 md:px-6 md:py-4 hidden sm:table-cell">ESTADO</th>
                <th className="px-4 py-3 md:px-6 md:py-4 text-center">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-400/10 bg-transparent">
              {groupRecords.map((record, index) => {
                const date = new Date(record.timestamp);
                const isRetardo = record.type === 'ENTRADA' && (date.getHours() > 9 || (date.getHours() === 9 && date.getMinutes() > 15));
                
                return (
                  <tr key={record.id} className={`hover:bg-blue-800/50 transition-colors ${index % 2 === 0 ? 'bg-blue-900/20' : ''}`}>
                    <td className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap">
                      <div className="font-bold text-white">{date.toLocaleDateString()}</div>
                      <div className="text-blue-300 text-[10px] md:text-xs">{date.toLocaleTimeString()}</div>
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-black border ${record.type === 'ENTRADA' ? 'bg-green-500/20 text-green-300 border-green-500/50' : 'bg-orange-500/20 text-orange-300 border-orange-500/50'}`}>
                        {record.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4">
                      <div className="font-bold text-white">{record.name}</div>
                      <div className="text-blue-300 text-[10px] md:text-xs">{record.employeeId} &bull; CAJA: {record.registerId}</div>
                      <div className="text-blue-200 font-bold text-[10px] sm:hidden mt-1">
                        {record.locationDescription} {record.delegacion ? `(${record.delegacion})` : ''}
                      </div>
                      <div className="sm:hidden mt-1">
                        {isRetardo ? (
                          <span className="flex items-center text-red-400 font-black text-[10px]">
                            <AlertTriangle className="w-3 h-3 mr-1" /> RETARDO
                          </span>
                        ) : (
                          <span className="text-green-400 font-black text-[10px]">A TIEMPO</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap text-blue-200 font-bold text-xs md:text-sm hidden sm:table-cell">
                      {record.locationDescription} {record.delegacion ? `(${record.delegacion})` : ''}
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap hidden sm:table-cell">
                      {isRetardo ? (
                        <span className="flex items-center text-red-400 font-black text-[10px] md:text-xs">
                          <AlertTriangle className="w-3.5 h-3.5 mr-1" /> RETARDO
                        </span>
                      ) : (
                        <span className="text-green-400 font-black text-[10px] md:text-xs">A TIEMPO</span>
                      )}
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 text-center">
                      <button
                        onClick={() => handleDeleteRecord(record.id)}
                        className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                        title="ELIMINAR REGISTRO"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    ));
  };

  const buttonClasses = (active: boolean) => `
    flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200 whitespace-nowrap shrink-0
    ${active 
      ? 'bg-yellow-400 text-blue-900 shadow-[0_4px_0_#b45309] translate-y-0' 
      : 'bg-blue-800/60 text-blue-100 hover:bg-blue-700 hover:text-white shadow-[0_4px_0_#1e3a8a] hover:translate-y-[2px] hover:shadow-[0_2px_0_#1e3a8a] active:shadow-none active:translate-y-[4px]'}
  `;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-7xl mx-auto bg-gradient-to-br from-blue-600 via-blue-800 to-blue-900 rounded-2xl md:rounded-3xl shadow-2xl border border-blue-400/30 min-h-[90vh] flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 md:p-6 border-b border-blue-400/20 bg-blue-950/40 backdrop-blur-sm">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-xl md:text-2xl font-black text-white flex items-center tracking-widest drop-shadow-md uppercase">
            <Shield className="w-5 h-5 md:w-6 md:h-6 mr-2 text-yellow-400" />
            PANEL DE CONTROL
          </h1>
          <p className="text-blue-200 text-[10px] md:text-xs font-bold mt-1 uppercase tracking-wide">ADMINISTRACIÓN DE REGISTROS DE ASISTENCIA</p>
        </div>
        <button 
          onClick={onLogout}
          className="flex items-center px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-[0_4px_0_#7f1d1d] hover:translate-y-[2px] hover:shadow-[0_2px_0_#7f1d1d] active:translate-y-[4px] active:shadow-none transition-all w-full sm:w-auto justify-center"
        >
          <LogOut className="w-4 h-4 mr-2" />
          SALIR
        </button>
      </div>

      {/* Toolbar */}
      <div className="p-4 md:p-6 bg-blue-900/30 border-b border-blue-400/20 flex flex-col xl:flex-row gap-4 xl:gap-6 justify-between items-start xl:items-center">
        {/* Navigation Tabs - Scrollable on mobile */}
        <div className="flex overflow-x-auto pb-2 w-full xl:w-auto gap-3 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <button onClick={() => setReportType('ALL')} className={`${buttonClasses(reportType === 'ALL')} whitespace-nowrap snap-start`}>
            <FileText className="w-4 h-4 mr-2" />
            TODOS
          </button>
          <button onClick={() => setReportType('EMPLOYEE')} className={`${buttonClasses(reportType === 'EMPLOYEE')} whitespace-nowrap snap-start`}>
            <Users className="w-4 h-4 mr-2" />
            POR EMPLEADO
          </button>
          <button onClick={() => setReportType('MONTH')} className={`${buttonClasses(reportType === 'MONTH')} whitespace-nowrap snap-start`}>
            <Calendar className="w-4 h-4 mr-2" />
            POR MES
          </button>
          <button onClick={() => setReportType('YEAR')} className={`${buttonClasses(reportType === 'YEAR')} whitespace-nowrap snap-start`}>
            <Calendar className="w-4 h-4 mr-2" />
            POR AÑO
          </button>
          <button onClick={() => setReportType('INCIDENCES')} className={`${buttonClasses(reportType === 'INCIDENCES')} whitespace-nowrap snap-start`}>
            <AlertTriangle className="w-4 h-4 mr-2" />
            INCIDENCIAS
          </button>
          <button onClick={() => setReportType('EMPLOYEES_DB')} className={`${buttonClasses(reportType === 'EMPLOYEES_DB')} whitespace-nowrap snap-start`}>
            <Database className="w-4 h-4 mr-2" />
            PERSONAL
          </button>
          <button onClick={() => setReportType('SETTINGS')} className={`${buttonClasses(reportType === 'SETTINGS')} whitespace-nowrap snap-start`}>
            <Settings className="w-4 h-4 mr-2" />
            CONFIGURACIÓN
          </button>
        </div>

        {/* Dynamic Filters */}
        {reportType !== 'EMPLOYEES_DB' && reportType !== 'SETTINGS' && (
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-blue-950/40 p-3 md:p-4 rounded-2xl border border-blue-400/20 w-full xl:w-auto">
            <div className="flex items-center text-yellow-400 pl-2 hidden md:flex">
              <Filter className="w-4 h-4" />
            </div>
            
            {(reportType === 'ALL' || reportType === 'INCIDENCES') && (
              <>
                <div className="flex items-center space-x-2 w-full md:w-auto flex-1 xl:flex-none">
                  <label className="text-blue-200 text-xs font-black uppercase tracking-wider w-16 md:w-auto">DESDE:</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="flex-1 md:flex-none px-3 py-2 border-b-2 border-blue-400 bg-white/10 rounded-lg text-sm text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all" />
                </div>
                <div className="flex items-center space-x-2 w-full md:w-auto flex-1 xl:flex-none">
                  <label className="text-blue-200 text-xs font-black uppercase tracking-wider w-16 md:w-auto">HASTA:</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="flex-1 md:flex-none px-3 py-2 border-b-2 border-blue-400 bg-white/10 rounded-lg text-sm text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all" />
                </div>
              </>
            )}

            {reportType === 'EMPLOYEE' && (
              <div className="flex items-center space-x-2 w-full md:w-auto flex-1 xl:flex-none">
                <label className="text-blue-200 text-xs font-black uppercase tracking-wider w-20 md:w-auto">BUSCAR:</label>
                <input type="text" placeholder="NOMBRE O NÓMINA" value={employeeSearch} onChange={(e) => setEmployeeSearch(e.target.value)} className="flex-1 md:flex-none px-3 py-2 border-b-2 border-blue-400 bg-white/10 rounded-lg text-sm text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all w-full md:w-48" />
              </div>
            )}

            {reportType === 'MONTH' && (
              <>
                <div className="flex items-center space-x-2 w-full md:w-auto flex-1 xl:flex-none">
                  <label className="text-blue-200 text-xs font-black uppercase tracking-wider w-16 md:w-auto">DESDE:</label>
                  <input type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} className="flex-1 md:flex-none px-3 py-2 border-b-2 border-blue-400 bg-white/10 rounded-lg text-sm text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all" />
                </div>
                <div className="flex items-center space-x-2 w-full md:w-auto flex-1 xl:flex-none">
                  <label className="text-blue-200 text-xs font-black uppercase tracking-wider w-16 md:w-auto">HASTA:</label>
                  <input type="month" value={endMonth} onChange={(e) => setEndMonth(e.target.value)} className="flex-1 md:flex-none px-3 py-2 border-b-2 border-blue-400 bg-white/10 rounded-lg text-sm text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all" />
                </div>
              </>
            )}

            {reportType === 'YEAR' && (
              <div className="flex items-center space-x-2 w-full md:w-auto flex-1 xl:flex-none">
                <label className="text-blue-200 text-xs font-black uppercase tracking-wider w-16 md:w-auto">AÑO:</label>
                <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="flex-1 md:flex-none px-3 py-2 border-b-2 border-blue-400 bg-white/10 rounded-lg text-sm text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all">
                  {Array.from({length: 10}, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}

            {(startDate || endDate || employeeSearch || startMonth || endMonth || selectedYear !== new Date().getFullYear().toString()) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); setEmployeeSearch(''); setStartMonth(''); setEndMonth(''); setSelectedYear(new Date().getFullYear().toString()); }}
                className="flex items-center justify-center px-3 py-2 text-red-300 hover:text-white hover:bg-red-500 rounded-lg transition-colors text-xs font-black uppercase tracking-wider w-full md:w-auto mt-2 md:mt-0"
                title="LIMPIAR FILTROS"
              >
                <XCircle className="w-4 h-4 md:mr-0 mr-2" />
                <span className="md:hidden">LIMPIAR FILTROS</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-grow bg-blue-950/30 overflow-y-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 md:p-6 gap-4">
          <h2 className="text-base md:text-lg font-black text-white uppercase tracking-widest drop-shadow-md flex items-center">
            {reportType === 'ALL' && 'TODOS LOS REGISTROS'}
            {reportType === 'EMPLOYEE' && 'REPORTE POR EMPLEADO'}
            {reportType === 'MONTH' && 'REPORTE MENSUAL'}
            {reportType === 'YEAR' && 'REPORTE ANUAL'}
            {reportType === 'INCIDENCES' && 'REPORTE DE INCIDENCIAS (RETARDOS)'}
            {reportType === 'EMPLOYEES_DB' && 'BASE DE DATOS DEL PERSONAL'}
            {reportType === 'SETTINGS' && 'CONFIGURACIÓN DEL SISTEMA'}
          </h2>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {reportType !== 'EMPLOYEES_DB' && reportType !== 'SETTINGS' && (
              <>
                <button 
                  onClick={() => {
                    setReportType('ALL');
                    setStartDate('');
                    setEndDate('');
                    setEmployeeSearch('');
                    setStartMonth('');
                    setEndMonth('');
                    setSelectedYear(new Date().getFullYear().toString());
                  }} 
                  className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-[0_4px_0_#1e3a8a] hover:translate-y-[2px] hover:shadow-[0_2px_0_#1e3a8a] active:translate-y-[4px] active:shadow-none transition-all"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  VER
                </button>
                <button 
                  onClick={exportCSV}
                  className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-[0_4px_0_#14532d] hover:translate-y-[2px] hover:shadow-[0_2px_0_#14532d] active:translate-y-[4px] active:shadow-none transition-all"
                >
                  <Download className="w-4 h-4 mr-2" />
                  CSV
                </button>
                <button 
                  onClick={exportPDF}
                  className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-[0_4px_0_#7f1d1d] hover:translate-y-[2px] hover:shadow-[0_2px_0_#7f1d1d] active:translate-y-[4px] active:shadow-none transition-all"
                >
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </button>
              </>
            )}
          </div>
        </div>

        {renderGroupedRecords()}
      </div>
    </motion.div>
  );
};
