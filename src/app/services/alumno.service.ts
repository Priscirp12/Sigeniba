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

@Injectable({
  providedIn: 'root',
})
export class AlumnoService {
  constructor(private readonly api: ApiService) {}

  async getMisCalificaciones(matricula: string): Promise<MateriaCalificacionesAlumno[]> {
    return this.api.get<MateriaCalificacionesAlumno[]>(`mis_calificaciones.php?matricula=${matricula}`);
  }
}
