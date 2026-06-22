import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface DashboardSummary {
  totalAlumnos: number;
  totalDocentes: number;
  totalMaterias: number;
  promedioGeneral: number;
  gruposActivos: number;
  pendientes: number;
}

export interface Grupo {
  id_grupo: string;
  nombre: string;
  grado: number;
  semestre: number;
  turno: string;
  ciclo_escolar: string;
}

export interface Materia {
  id_materia: string;
  nombre: string;
  clave: string;
}

export interface Alumno {
  id_alumno: string;
  matricula: string;
  nombre: string;
  apellidos: string;
  id_grupo: string;
}

export interface CriterioEvaluacion {
  id_criterio: string;
  id_gmd: string;
  nombre: string;
  porcentaje: number;
  parcial: number;
}

export interface GrupoMateriaDocente {
  id_gmd: string;
  id_grupo: string;
  id_materia: string;
  id_docente: string;
  ciclo_escolar: string;
  materia_nombre?: string;
}

export interface StudentGradeRow {
  alumno: Alumno;
  calificaciones: Record<string, number | null>;
  promedio: number;
}

@Injectable({
  providedIn: 'root',
})
export class CalificacionesService {
  constructor(private readonly api: ApiService) {}

  async getDashboardSummary(): Promise<DashboardSummary> {
    const [grupos, materias, alumnos] = await Promise.all([
      this.getGrupos(),
      this.getMaterias(),
      this.getAlumnos(),
    ]);

    return {
      totalAlumnos: alumnos.length,
      totalDocentes: 0,
      totalMaterias: materias.length,
      promedioGeneral: 0,
      gruposActivos: grupos.length,
      pendientes: 0,
    };
  }

  async getGrupos(): Promise<Grupo[]> {
    return this.api.get<Grupo[]>('grupos.php');
  }

  async getMaterias(): Promise<Materia[]> {
    return this.api.get<Materia[]>('materias.php');
  }

  async getAlumnos(): Promise<Alumno[]> {
    return this.api.get<Alumno[]>('alumnos.php');
  }

  async getAlumnosPorGrupo(idGrupo: string): Promise<Alumno[]> {
    return this.api.get<Alumno[]>(`alumnos.php?id_grupo=${idGrupo}`);
  }

  async getAsignacionesPorGrupo(idGrupo: string): Promise<GrupoMateriaDocente[]> {
    return this.api.get<GrupoMateriaDocente[]>(`asignaciones.php?id_grupo=${idGrupo}`);
  }

  async getCriteriosPorAsignacion(idGmd: string): Promise<CriterioEvaluacion[]> {
    return this.api.get<CriterioEvaluacion[]>(`criterios.php?id_gmd=${idGmd}`);
  }

  async getRowsPorAsignacion(idGmd: string, parcial: number): Promise<StudentGradeRow[]> {
    const data = await this.api.get<any[]>(`calificaciones.php?id_gmd=${idGmd}&parcial=${parcial}`);

    return data.map((item) => ({
      alumno: item.alumno,
      calificaciones: item.calificaciones,
      promedio: item.promedio,
    }));
  }

  async actualizarCalificacion(
    idAlumno: string,
    idGmd: string,
    idCriterio: string,
    parcial: number,
    valor: number,
    idDocente = 'D1'
  ): Promise<void> {
    await this.api.post('calificaciones.php', {
      id_alumno: idAlumno,
      id_gmd: idGmd,
      id_criterio: idCriterio,
      valor,
      parcial,
      id_docente: idDocente,
    });
  }
}
