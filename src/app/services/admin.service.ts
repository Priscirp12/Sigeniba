import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface AlumnoAdmin {
  matricula: string;
  id_usuario: string;
  id_grupo: string | null;
  id_periodo: string | null;
  id_ciclo: string | null;
  email: string | null;
  telefono: string | null;
  estatus: 'activo' | 'inactivo';
  fecha_baja: string | null;
  motivo_baja: string | null;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  sexo: 'M' | 'F';
  edad: number | null;
  grupo_nombre?: string | null;
  semestre?: number | null;
}

export interface DocenteAdmin {
  id_docente: string;
  id_usuario: string;
  especialidad: string | null;
  email: string | null;
  telefono: string | null;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  sexo: 'M' | 'F';
  edad: number | null;
}

export interface MateriaAdmin {
  id_materia: string;
  nombre: string;
  clave: string | null;
  horas_semana: number | null;
  semestre: number | null;
}

export interface GrupoAdmin {
  id_grupo: string;
  nombre: string;
  semestre: number;
  id_periodo: string | null;
  id_ciclo: string | null;
  clave_tutor: string | null;
  tutor_nombre?: string | null;
  tutor_apellido_paterno?: string | null;
}

export interface CicloEscolar {
  id_ciclo: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
}

export interface AsignacionAcademica {
  id_asignacion: string;
  id_grupo: string;
  id_materia: string;
  id_docente: string;
  id_periodo: string;
  materia_nombre?: string;
  grupo_nombre?: string;
}

export interface PeriodoEscolar {
  id_periodo: string;
  ciclo_escolar: string;
  fecha_inicio: string;
  fecha_fin: string;
}

export type TipoVentanaCaptura = 'parcial1' | 'parcial2' | 'parcial3' | 'extraordinario' | 'intersemestral';

export interface VentanaCaptura {
  id_ventana: string;
  id_periodo: string;
  semestre: number;
  tipo: TipoVentanaCaptura;
  fecha_inicio: string;
  fecha_fin: string;
}

/** Grupo con alumnos activos y el grupo al que pasaría en el siguiente semestre. */
export interface GrupoAvance {
  id_grupo: string;
  nombre: string;
  semestre: number;
  id_periodo: string | null;
  id_ciclo: string | null;
  generacion: string | null;
  ciclo_escolar: string | null;
  alumnos: number;
  destino_nombre: string | null;
  destino_semestre: number | null;
  estado: 'listo' | 'en_curso' | 'ultimo_semestre';
}

export interface ResultadoAvance {
  success: boolean;
  grupos_avanzados: number;
  alumnos_avanzados: number;
  grupos_en_curso: number;
  grupos_ultimo_semestre: number;
}

export interface AlumnoFiltro {
  id_periodo?: string;
  semestre?: number | string;
  id_grupo?: string;
  sin_grupo?: boolean;
  estatus?: 'activo' | 'inactivo';
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  constructor(private readonly api: ApiService) {}

  // Alumnos
  async getAlumnos(filtro: AlumnoFiltro = {}): Promise<AlumnoAdmin[]> {
    const params = new URLSearchParams();
    if (filtro.id_periodo) params.set('id_periodo', filtro.id_periodo);
    if (filtro.semestre) params.set('semestre', String(filtro.semestre));
    if (filtro.id_grupo) params.set('id_grupo', filtro.id_grupo);
    if (filtro.sin_grupo) params.set('sin_grupo', '1');
    if (filtro.estatus) params.set('estatus', filtro.estatus);
    const query = params.toString();
    return this.api.get<AlumnoAdmin[]>(`alumnos.php${query ? '?' + query : ''}`);
  }

  async crearAlumno(payload: Record<string, unknown>): Promise<{ success: boolean; matricula: string }> {
    return this.api.post('alumnos.php', payload);
  }

  async actualizarAlumno(payload: Record<string, unknown>): Promise<{ success: boolean; matricula: string }> {
    return this.api.put('alumnos.php', payload);
  }

  async darBajaTemporal(matricula: string, motivo: string): Promise<{ success: boolean }> {
    return this.api.put('alumnos.php?action=baja', { matricula, motivo });
  }

  async reincorporarAlumno(matricula: string, idGrupo: string): Promise<{ success: boolean }> {
    return this.api.put('alumnos.php?action=reincorporar', { matricula, id_grupo: idGrupo });
  }

  // Docentes
  async getDocentes(): Promise<DocenteAdmin[]> {
    return this.api.get<DocenteAdmin[]>('docentes.php');
  }

  async crearDocente(payload: Record<string, unknown>): Promise<{ success: boolean; id_docente: string }> {
    return this.api.post('docentes.php', payload);
  }

  async actualizarDocente(payload: Record<string, unknown>): Promise<{ success: boolean; id_docente: string }> {
    return this.api.put('docentes.php', payload);
  }

  // Materias
  async getMaterias(): Promise<MateriaAdmin[]> {
    return this.api.get<MateriaAdmin[]>('materias.php');
  }

  async crearMateria(payload: Record<string, unknown>): Promise<{ success: boolean; id_materia: string }> {
    return this.api.post('materias.php', payload);
  }

  async actualizarMateria(payload: Record<string, unknown>): Promise<{ success: boolean }> {
    return this.api.put('materias.php', payload);
  }

  // Grupos
  async getGrupos(): Promise<GrupoAdmin[]> {
    return this.api.get<GrupoAdmin[]>('grupos.php');
  }

  async crearGrupo(payload: Record<string, unknown>): Promise<{ success: boolean; id_grupo: string }> {
    return this.api.post('grupos.php', payload);
  }

  async asignarAlumnosAGrupo(
    idGrupo: string,
    matriculas: string[],
  ): Promise<{ success: boolean; actualizados: number; omitidos: number }> {
    return this.api.put('grupos.php?action=asignar_alumnos', { id_grupo: idGrupo, matriculas });
  }

  async asignarTutor(idGrupo: string, idDocente: string): Promise<{ success: boolean }> {
    return this.api.put('grupos.php?action=asignar_tutor', { id_grupo: idGrupo, id_docente: idDocente });
  }

  async getAvanceGrupos(): Promise<GrupoAvance[]> {
    return this.api.get<GrupoAvance[]>('grupos.php?action=avance');
  }

  async avanzarTodosLosGrupos(): Promise<ResultadoAvance> {
    return this.api.put('grupos.php?action=avanzar_todos', {});
  }

  // Asignaciones académicas (materia <-> docente <-> grupo <-> periodo)
  async getAsignaciones(filtro: { id_grupo?: string; id_docente?: string } = {}): Promise<AsignacionAcademica[]> {
    const params = new URLSearchParams();
    if (filtro.id_grupo) params.set('id_grupo', filtro.id_grupo);
    if (filtro.id_docente) params.set('id_docente', filtro.id_docente);
    const query = params.toString();
    return this.api.get<AsignacionAcademica[]>(`asignaciones.php${query ? '?' + query : ''}`);
  }

  async crearAsignacion(payload: Record<string, unknown>): Promise<{ success: boolean; id_asignacion: string }> {
    return this.api.post('asignaciones.php', payload);
  }

  // Periodos escolares
  async getPeriodos(): Promise<PeriodoEscolar[]> {
    return this.api.get<PeriodoEscolar[]>('periodos.php');
  }

  async crearPeriodo(payload: Record<string, unknown>): Promise<{ success: boolean; id_periodo: string }> {
    return this.api.post('periodos.php', payload);
  }

  // Ciclos escolares (años, ej. "2024-2025" — distintos de la generación/periodo)
  async getCiclosEscolares(): Promise<CicloEscolar[]> {
    return this.api.get<CicloEscolar[]>('ciclos_escolares.php');
  }

  async crearCicloEscolar(payload: Record<string, unknown>): Promise<{ success: boolean; id_ciclo: string }> {
    return this.api.post('ciclos_escolares.php', payload);
  }

  // Ventanas de captura de calificaciones
  async getVentanasCaptura(idPeriodo: string, semestre: number): Promise<VentanaCaptura[]> {
    return this.api.get<VentanaCaptura[]>(`ventanas_captura.php?id_periodo=${idPeriodo}&semestre=${semestre}`);
  }

  async guardarVentanaCaptura(payload: Record<string, unknown>): Promise<{ success: boolean; id_ventana: string }> {
    return this.api.post('ventanas_captura.php', payload);
  }

  // Cuenta propia del administrador
  async cambiarCredenciales(payload: Record<string, unknown>): Promise<{ success: boolean; id_usuario: string }> {
    return this.api.put('usuarios.php', payload);
  }

  // Configuración del Historial Académico
  async getPlantillaHistorial(): Promise<{ plantilla_legenda: string }> {
    return this.api.get<{ plantilla_legenda: string }>('configuracion_historial.php');
  }

  async guardarPlantillaHistorial(plantillaLegenda: string): Promise<{ success: boolean }> {
    return this.api.put('configuracion_historial.php', { plantilla_legenda: plantillaLegenda });
  }
}
