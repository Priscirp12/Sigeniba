import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface CriterioAlumno {
  nombre: string;
  valor_puntos: number;
  obtenido: number | null;
}

export interface ParcialAlumno {
  criterios: CriterioAlumno[];
  suma: number;
}

export interface MateriaCalificacionesAlumno {
  id_asignacion: string;
  materia_nombre: string;
  docente_nombre: string;
  parciales: {
    parcial1: ParcialAlumno | null;
    parcial2: ParcialAlumno | null;
    parcial3: ParcialAlumno | null;
  };
  promedio: number | null;
}

export interface MateriaHistorial {
  nombre: string;
  calificacion: number;
}

export interface SemestreHistorial {
  id_periodo: string;
  etiqueta: string;
  materias: MateriaHistorial[];
  promedio_semestre: number;
}

export interface HistorialAcademico {
  alumno: { matricula: string; nombre: string };
  semestres: SemestreHistorial[];
  promedio_general: number | null;
  legenda: string;
}

@Injectable({
  providedIn: 'root',
})
export class AlumnoService {
  constructor(private readonly api: ApiService) {}

  async getMisCalificaciones(matricula: string): Promise<MateriaCalificacionesAlumno[]> {
    return this.api.get<MateriaCalificacionesAlumno[]>(`mis_calificaciones.php?matricula=${matricula}`);
  }

  async getHistorial(matricula: string): Promise<HistorialAcademico> {
    return this.api.get<HistorialAcademico>(`historial_academico.php?matricula=${matricula}`);
  }
}
