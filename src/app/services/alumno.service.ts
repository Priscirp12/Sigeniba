import { Injectable } from '@angular/core';

export interface CriterioAlumno {
  nombre: string;
  calificacion: number;
}

export interface MateriaAlumno {
  id: string;
  nombre: string;
  docente: string;
  horario: string;
  color: string;
  semestre: string;
  calificacion: number;
  criterios: CriterioAlumno[];
}

export interface SemestreKardex {
  nombre: string;
  promedio: number;
  materias: MateriaAlumno[];
}

export interface AlumnoProfile {
  nombre: string;
  matricula: string;
  carrera: string;
  semestreActual: string;
  promedioGeneral: number;
  calificacionesActuales: Array<{ nombre: string; calificacion: number }>;
  materiasActuales: MateriaAlumno[];
  kardex: SemestreKardex[];
}

@Injectable({
  providedIn: 'root',
})
export class AlumnoService {
  async getPerfilAlumno(): Promise<AlumnoProfile> {
    return {
      nombre: 'Ana Sofía Pérez',
      matricula: '20240012',
      carrera: 'Licenciatura en Informática',
      semestreActual: 'Semestre 4',
      promedioGeneral: 9.1,
      calificacionesActuales: [
        { nombre: 'Matemáticas', calificacion: 9.4 },
        { nombre: 'Programación', calificacion: 9.8 },
        { nombre: 'Historia', calificacion: 8.7 },
        { nombre: 'Física', calificacion: 8.9 },
      ],
      materiasActuales: [
        {
          id: 'm1',
          nombre: 'Matemáticas',
          docente: 'Mtra. Daniela Vega',
          horario: '08:00 - 09:00',
          color: '#4f46e5',
          semestre: 'Semestre 4',
          calificacion: 9.4,
          criterios: [
            { nombre: 'Examen parcial', calificacion: 9.2 },
            { nombre: 'Tareas', calificacion: 9.6 },
            { nombre: 'Participación', calificacion: 9.5 },
          ],
        },
        {
          id: 'm2',
          nombre: 'Programación',
          docente: 'Ing. Omar Ruiz',
          horario: '09:15 - 10:15',
          color: '#db2777',
          semestre: 'Semestre 4',
          calificacion: 9.8,
          criterios: [
            { nombre: 'Proyecto', calificacion: 9.9 },
            { nombre: 'Prácticas', calificacion: 9.6 },
            { nombre: 'Examen', calificacion: 9.8 },
          ],
        },
        {
          id: 'm3',
          nombre: 'Historia',
          docente: 'Lic. Elena Cruz',
          horario: '10:30 - 11:30',
          color: '#0f766e',
          semestre: 'Semestre 4',
          calificacion: 8.7,
          criterios: [
            { nombre: 'Ensayo', calificacion: 8.8 },
            { nombre: 'Participación', calificacion: 8.4 },
            { nombre: 'Examen', calificacion: 8.9 },
          ],
        },
        {
          id: 'm4',
          nombre: 'Física',
          docente: 'Dr. Jorge Soto',
          horario: '11:45 - 12:45',
          color: '#d97706',
          semestre: 'Semestre 4',
          calificacion: 8.9,
          criterios: [
            { nombre: 'Laboratorio', calificacion: 9.1 },
            { nombre: 'Tareas', calificacion: 8.7 },
            { nombre: 'Examen', calificacion: 8.8 },
          ],
        },
      ],
      kardex: [
        {
          nombre: 'Semestre 1',
          promedio: 8.6,
          materias: [
            {
              id: 'k1',
              nombre: 'Álgebra',
              docente: 'Mtra. Diana López',
              horario: '08:00 - 09:00',
              color: '#6366f1',
              semestre: 'Semestre 1',
              calificacion: 8.4,
              criterios: [{ nombre: 'Examen', calificacion: 8.4 }],
            },
            {
              id: 'k2',
              nombre: 'Introducción a la Computación',
              docente: 'Ing. Luis Ortega',
              horario: '09:15 - 10:15',
              color: '#ec4899',
              semestre: 'Semestre 1',
              calificacion: 8.8,
              criterios: [{ nombre: 'Examen', calificacion: 8.8 }],
            },
          ],
        },
        {
          nombre: 'Semestre 2',
          promedio: 9.0,
          materias: [
            {
              id: 'k3',
              nombre: 'Lógica',
              docente: 'Mtro. Gabriel Ramírez',
              horario: '08:00 - 09:00',
              color: '#0ea5e9',
              semestre: 'Semestre 2',
              calificacion: 9.1,
              criterios: [{ nombre: 'Examen', calificacion: 9.1 }],
            },
            {
              id: 'k4',
              nombre: 'Bases de Datos',
              docente: 'Ing. Paola Flores',
              horario: '09:15 - 10:15',
              color: '#f59e0b',
              semestre: 'Semestre 2',
              calificacion: 8.9,
              criterios: [{ nombre: 'Examen', calificacion: 8.9 }],
            },
          ],
        },
        {
          nombre: 'Semestre 3',
          promedio: 9.3,
          materias: [
            {
              id: 'k5',
              nombre: 'Diseño Web',
              docente: 'Mtra. Carla Jiménez',
              horario: '08:00 - 09:00',
              color: '#14b8a6',
              semestre: 'Semestre 3',
              calificacion: 9.4,
              criterios: [{ nombre: 'Examen', calificacion: 9.4 }],
            },
            {
              id: 'k6',
              nombre: 'Sistemas Operativos',
              docente: 'Ing. Roberto Mena',
              horario: '09:15 - 10:15',
              color: '#ef4444',
              semestre: 'Semestre 3',
              calificacion: 9.2,
              criterios: [{ nombre: 'Examen', calificacion: 9.2 }],
            },
          ],
        },
      ],
    };
  }
}
