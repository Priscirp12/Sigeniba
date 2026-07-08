import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { TipoVentanaCaptura } from './admin.service';

export type TipoEvaluacion = TipoVentanaCaptura;

export interface AsignacionDocente {
  id_asignacion: string;
  id_grupo: string;
  id_materia: string;
  id_docente: string;
  id_periodo: string;
  materia_nombre: string;
  materia_clave: string | null;
  horas_semana: number | null;
  grupo_nombre: string;
  semestre: number;
  turno: 'Matutino' | 'Vespertino' | null;
  ciclo_escolar: string;
}

export interface CriterioEvaluacion {
  id_criterio: string;
  id_asignacion: string;
  nombre: string;
  valor_puntos: number;
  tipo: TipoEvaluacion;
  es_examen: number;
}

export interface VentanaEstado {
  abierta: boolean;
  fecha_inicio: string | null;
  fecha_fin: string | null;
}

export interface FilaCalificacionAlumno {
  alumno: {
    matricula: string;
    nombre: string;
    apellido_paterno: string;
    apellido_materno: string | null;
  };
  valores: Record<string, number>;
  suma: number;
}

export interface CalificacionesResponse {
  criterios: CriterioEvaluacion[];
  alumnos: FilaCalificacionAlumno[];
  ventana: VentanaEstado;
  editable: boolean;
  suma_criterios: number;
}

@Injectable({
  providedIn: 'root',
})
export class DocenteService {
  constructor(private readonly api: ApiService) {}

  async getMisAsignaciones(idDocente: string): Promise<AsignacionDocente[]> {
    return this.api.get<AsignacionDocente[]>(`asignaciones.php?id_docente=${idDocente}`);
  }

  async getCriterios(idAsignacion: string, tipo: TipoEvaluacion): Promise<CriterioEvaluacion[]> {
    return this.api.get<CriterioEvaluacion[]>(`criterios.php?id_asignacion=${idAsignacion}&tipo=${tipo}`);
  }

  async crearCriterio(payload: Record<string, unknown>): Promise<{ success: boolean; id_criterio: string }> {
    return this.api.post('criterios.php', payload);
  }

  async actualizarCriterio(payload: Record<string, unknown>): Promise<{ success: boolean }> {
    return this.api.put('criterios.php', payload);
  }

  async eliminarCriterio(idCriterio: string): Promise<{ success: boolean }> {
    return this.api.delete(`criterios.php?id_criterio=${idCriterio}`);
  }

  async getCalificaciones(idAsignacion: string, tipo: TipoEvaluacion): Promise<CalificacionesResponse> {
    return this.api.get<CalificacionesResponse>(`calificaciones.php?id_asignacion=${idAsignacion}&tipo=${tipo}`);
  }

  async guardarCalificacion(matricula: string, idCriterio: string, valor: number): Promise<{ success: boolean }> {
    return this.api.post('calificaciones.php', { matricula, id_criterio: idCriterio, valor });
  }
}
