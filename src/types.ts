export interface AttendanceRecord {
  id: string;
  timestamp: string;
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

export interface Employee {
  id: string;
  name: string;
  employeeId: string;
  schedule: string;
  location: string;
}
