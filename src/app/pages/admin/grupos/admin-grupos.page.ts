import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AlertController,
  IonButton,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import {
  AdminService,
  AlumnoAdmin,
  AsignacionAcademica,
  CicloEscolar,
  DocenteAdmin,
  GrupoAdmin,
  GrupoAvance,
  MateriaAdmin,
  PeriodoEscolar,
} from '../../../services/admin.service';
import { AlertaService, TipoAlerta } from '../../../services/alerta.service';

type Segmento = 'crear' | 'alumnos' | 'tutor' | 'materias' | 'avanzar';

@Component({
  selector: 'app-admin-grupos',
  templateUrl: './admin-grupos.page.html',
  styleUrls: ['./admin-grupos.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonList,
    IonItem,
    IonInput,
    IonNote,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    IonCheckbox,
  ],
})
export class AdminGruposPage implements ViewWillEnter {
  segmento: Segmento = 'crear';

  grupos: GrupoAdmin[] = [];
  docentes: DocenteAdmin[] = [];
  materias: MateriaAdmin[] = [];
  periodos: PeriodoEscolar[] = [];
  ciclos: CicloEscolar[] = [];
  filtroGrupoTexto = '';

  // Crear grupo
  nombreGrupo = '';
  semestreGrupo: number | null = null;
  periodoGrupo: string | null = null;
  cicloGrupo: string | null = null;
  claveTutorGrupo: string | null = null;
  guardandoGrupo = false;

  // Avanzar de semestre
  gruposAvance: GrupoAvance[] = [];
  cargandoAvance = false;
  avanzandoSemestre = false;

  // Asignar / cambiar alumnos de grupo
  alumnos: AlumnoAdmin[] = [];
  filtroPeriodo: string | null = null;
  filtroSemestre: number | null = null;
  seleccionados = new Set<string>();
  grupoDestino: string | null = null;
  asignandoAlumnos = false;

  // Asignar tutor
  tutorPorGrupo: Record<string, string> = {};
  asignandoTutor: Record<string, boolean> = {};

  // Asignar materias a docente
  docenteSeleccionado: string | null = null;
  materiaSeleccionada: string | null = null;
  filtroMateriaTexto = '';
  filtroSemestreAsignacion: number | null = null;
  grupoParaAsignacion: string | null = null;
  periodoParaAsignacion: string | null = null;
  asignacionesDocente: AsignacionAcademica[] = [];
  asignandoMateria = false;

  constructor(
    private readonly adminService: AdminService,
    private readonly alertas: AlertaService,
    private readonly alertController: AlertController,
  ) {
    this.cargarCatalogos();
  }

  ionViewWillEnter(): void {
    this.cargarCatalogos();
    if (this.segmento === 'avanzar') {
      this.cargarAvance();
    }
  }

  get gruposFiltrados(): GrupoAdmin[] {
    const texto = this.filtroGrupoTexto.trim().toLowerCase();
    if (!texto) {
      return this.grupos;
    }
    return this.grupos.filter((grupo) => grupo.nombre.toLowerCase().includes(texto));
  }

  async cargarCatalogos(): Promise<void> {
    const [grupos, docentes, materias, periodos, ciclos] = await Promise.all([
      this.adminService.getGrupos(),
      this.adminService.getDocentes(),
      this.adminService.getMaterias(),
      this.adminService.getPeriodos(),
      this.adminService.getCiclosEscolares(),
    ]);
    this.grupos = grupos;
    this.docentes = docentes;
    this.materias = materias;
    this.periodos = periodos;
    this.ciclos = ciclos;
  }

  get gruposFiltradosPorSemestre(): GrupoAdmin[] {
    if (!this.filtroSemestreAsignacion) {
      return this.grupos;
    }
    return this.grupos.filter((grupo) => grupo.semestre === this.filtroSemestreAsignacion);
  }

  get materiasFiltradasParaAsignar(): MateriaAdmin[] {
    const texto = this.filtroMateriaTexto.trim().toLowerCase();
    return this.materias.filter((materia) => {
      const coincideTexto = !texto || materia.nombre.toLowerCase().includes(texto);
      const coincideSemestre = !this.filtroSemestreAsignacion || materia.semestre === this.filtroSemestreAsignacion;
      return coincideTexto && coincideSemestre;
    });
  }

  get materiaSeleccionadaNombre(): string | null {
    return this.materias.find((materia) => materia.id_materia === this.materiaSeleccionada)?.nombre ?? null;
  }

  seleccionarMateria(idMateria: string): void {
    this.materiaSeleccionada = idMateria;
  }

  onCambioSemestreAsignacion(): void {
    this.materiaSeleccionada = null;
    if (this.grupoParaAsignacion) {
      const grupoActual = this.grupos.find((g) => g.id_grupo === this.grupoParaAsignacion);
      if (this.filtroSemestreAsignacion && grupoActual?.semestre !== this.filtroSemestreAsignacion) {
        this.grupoParaAsignacion = null;
      }
    }
  }

  onCambioGrupoAsignacion(): void {
    const grupo = this.grupos.find((g) => g.id_grupo === this.grupoParaAsignacion);
    if (grupo) {
      this.filtroSemestreAsignacion = grupo.semestre;
      this.materiaSeleccionada = null;
    }
  }

  periodoNombre(idPeriodo: string | null | undefined): string {
    if (!idPeriodo) {
      return 'Sin periodo';
    }
    return this.periodos.find((p) => p.id_periodo === idPeriodo)?.ciclo_escolar ?? idPeriodo;
  }

  cambiarSegmento(segmento: Segmento): void {
    this.segmento = segmento;
    if (segmento === 'alumnos') {
      this.buscarAlumnos();
    }
    if (segmento === 'avanzar') {
      this.cargarAvance();
    }
  }

  // --- Crear grupo ---
  async crearGrupo(): Promise<void> {
    if (!this.nombreGrupo.trim() || !this.semestreGrupo || !this.periodoGrupo) {
      await this.mostrarToast('Nombre, semestre y periodo escolar del grupo son requeridos', 'danger');
      return;
    }

    this.guardandoGrupo = true;
    try {
      await this.adminService.crearGrupo({
        nombre: this.nombreGrupo,
        semestre: this.semestreGrupo,
        id_periodo: this.periodoGrupo,
        id_ciclo: this.cicloGrupo,
        clave_tutor: this.claveTutorGrupo,
      });
      await this.mostrarToast('Grupo creado correctamente', 'success');
      this.nombreGrupo = '';
      this.semestreGrupo = null;
      this.periodoGrupo = null;
      this.cicloGrupo = null;
      this.claveTutorGrupo = null;
      await this.cargarCatalogos();
    } catch (error) {
      await this.mostrarToast(error instanceof Error ? error.message : 'Ocurrió un error al crear el grupo', 'danger');
    } finally {
      this.guardandoGrupo = false;
    }
  }

  // --- Asignar / cambiar alumnos de grupo ---
  async buscarAlumnos(): Promise<void> {
    this.alumnos = await this.adminService.getAlumnos({
      id_periodo: this.filtroPeriodo || undefined,
      semestre: this.filtroSemestre || undefined,
      estatus: 'activo',
    });
    this.seleccionados.clear();
  }

  toggleSeleccionado(matricula: string, marcado: boolean): void {
    if (marcado) {
      this.seleccionados.add(matricula);
    } else {
      this.seleccionados.delete(matricula);
    }
  }

  async agregarAlGrupo(): Promise<void> {
    if (!this.grupoDestino || !this.seleccionados.size) {
      await this.mostrarToast('Selecciona un grupo destino y al menos un alumno', 'danger');
      return;
    }

    this.asignandoAlumnos = true;
    try {
      const resultado = await this.adminService.asignarAlumnosAGrupo(this.grupoDestino, Array.from(this.seleccionados));
      if (resultado.omitidos > 0 && resultado.actualizados > 0) {
        await this.mostrarToast(
          `${resultado.actualizados} alumno(s) asignado(s). ${resultado.omitidos} no se movieron porque su semestre está en curso.`,
          'warning',
        );
      } else if (resultado.omitidos > 0) {
        await this.mostrarToast(
          'No se movió ningún alumno: su semestre sigue en curso. Solo se puede cambiar de grupo entre semestres.',
          'warning',
        );
      } else {
        await this.mostrarToast('Alumnos asignados al grupo correctamente', 'success');
      }
      await this.buscarAlumnos();
    } catch (error) {
      await this.mostrarToast(error instanceof Error ? error.message : 'Ocurrió un error al asignar', 'danger');
    } finally {
      this.asignandoAlumnos = false;
    }
  }

  // --- Asignar tutor ---
  async asignarTutor(grupo: GrupoAdmin): Promise<void> {
    const idDocente = this.tutorPorGrupo[grupo.id_grupo];
    if (!idDocente) {
      await this.mostrarToast('Selecciona un docente para este grupo', 'danger');
      return;
    }

    this.asignandoTutor[grupo.id_grupo] = true;
    try {
      await this.adminService.asignarTutor(grupo.id_grupo, idDocente);
      await this.mostrarToast('Tutor asignado correctamente', 'success');
      await this.cargarCatalogos();
    } catch (error) {
      await this.mostrarToast(error instanceof Error ? error.message : 'Ocurrió un error al asignar el tutor', 'danger');
    } finally {
      this.asignandoTutor[grupo.id_grupo] = false;
    }
  }

  // --- Asignar materias a docente ---
  async onDocenteSeleccionado(): Promise<void> {
    if (!this.docenteSeleccionado) {
      this.asignacionesDocente = [];
      return;
    }
    this.asignacionesDocente = await this.adminService.getAsignaciones({ id_docente: this.docenteSeleccionado });
  }

  async agregarMateriaADocente(): Promise<void> {
    if (!this.docenteSeleccionado || !this.materiaSeleccionada || !this.grupoParaAsignacion || !this.periodoParaAsignacion) {
      await this.mostrarToast('Selecciona docente, materia, grupo y periodo', 'danger');
      return;
    }

    this.asignandoMateria = true;
    try {
      await this.adminService.crearAsignacion({
        id_docente: this.docenteSeleccionado,
        id_materia: this.materiaSeleccionada,
        id_grupo: this.grupoParaAsignacion,
        id_periodo: this.periodoParaAsignacion,
      });
      await this.mostrarToast('Materia asignada al docente correctamente', 'success');
      await this.onDocenteSeleccionado();
    } catch (error) {
      await this.mostrarToast(error instanceof Error ? error.message : 'Ocurrió un error al asignar la materia', 'danger');
    } finally {
      this.asignandoMateria = false;
    }
  }

  // --- Avanzar de semestre (todos los grupos) ---
  async cargarAvance(): Promise<void> {
    this.cargandoAvance = true;
    try {
      this.gruposAvance = await this.adminService.getAvanceGrupos();
    } catch (error) {
      await this.mostrarToast(error instanceof Error ? error.message : 'No se pudieron cargar los grupos', 'danger');
    } finally {
      this.cargandoAvance = false;
    }
  }

  get gruposListosParaAvanzar(): GrupoAvance[] {
    return this.gruposAvance.filter((grupo) => grupo.estado === 'listo');
  }

  get alumnosPorAvanzar(): number {
    return this.gruposListosParaAvanzar.reduce((total, grupo) => total + grupo.alumnos, 0);
  }

  async confirmarAvance(): Promise<void> {
    const listos = this.gruposListosParaAvanzar;
    if (!listos.length) {
      await this.mostrarToast('No hay grupos que puedan avanzar en este momento', 'warning');
      return;
    }

    const cambios = listos.map((grupo) => `${grupo.nombre} → ${grupo.destino_nombre}`).join(', ');
    const alerta = await this.alertController.create({
      header: 'Avanzar todos los grupos',
      message:
        `Se moverán ${this.alumnosPorAvanzar} alumno(s) de ${listos.length} grupo(s) al siguiente semestre: ${cambios}.\n\n` +
        'Los grupos con semestre en curso o en 6° semestre no se moverán. ¿Deseas continuar?',
      cssClass: 'alerta-faltantes',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Avanzar', handler: () => void this.avanzarTodos() },
      ],
    });
    await alerta.present();
  }

  private async avanzarTodos(): Promise<void> {
    this.avanzandoSemestre = true;
    try {
      const resultado = await this.adminService.avanzarTodosLosGrupos();
      const omitidos = resultado.grupos_en_curso
        ? ` ${resultado.grupos_en_curso} grupo(s) no se movieron porque su semestre está en curso.`
        : '';
      await this.mostrarToast(
        `${resultado.alumnos_avanzados} alumno(s) de ${resultado.grupos_avanzados} grupo(s) avanzaron al siguiente semestre.${omitidos}`,
        omitidos ? 'warning' : 'success',
      );
      await Promise.all([this.cargarAvance(), this.cargarCatalogos()]);
    } catch (error) {
      await this.mostrarToast(error instanceof Error ? error.message : 'Ocurrió un error al avanzar de semestre', 'danger');
    } finally {
      this.avanzandoSemestre = false;
    }
  }

  private async mostrarToast(message: string, color: TipoAlerta): Promise<void> {
    await this.alertas.mostrar(message, color);
  }
}
