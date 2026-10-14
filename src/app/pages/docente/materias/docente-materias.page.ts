import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { AuthService } from '../../../services/auth.service';
import { AsignacionDocente, DocenteService } from '../../../services/docente.service';

interface GrupoDeMateria {
  grupo_nombre: string;
  semestre: number;
  ciclo_escolar: string;
}

interface MateriaResumen {
  id_materia: string;
  nombre: string;
  clave: string | null;
  horas_semana: number | null;
  grupos: GrupoDeMateria[];
}

@Component({
  selector: 'app-docente-materias',
  templateUrl: './docente-materias.page.html',
  styleUrls: ['./docente-materias.page.scss'],
  imports: [CommonModule, FormsModule, IonContent, IonButton, IonIcon, IonItem, IonLabel, IonSearchbar, IonSelect, IonSelectOption],
})
export class DocenteMateriasPage implements ViewWillEnter {
  asignaciones: AsignacionDocente[] = [];
  materias: MateriaResumen[] = [];
  materiasFiltradas: MateriaResumen[] = [];
  cargando = false;
  filtroTexto = '';
  materiaSeleccionada: MateriaResumen | null = null;

  // Un docente puede dar clases en varios semestres/generaciones a la vez;
  // este selector evita que se mezclen todas sus materias en una sola lista.
  generaciones: { id_periodo: string; etiqueta: string }[] = [];
  generacionSeleccionada: string | null = null;
  semestresDisponibles: number[] = [];
  semestreSeleccionado: number | null = null;

  constructor(
    private readonly docenteService: DocenteService,
    private readonly authService: AuthService,
  ) {
    addIcons({ arrowBackOutline });
    this.cargarDatos();
  }

  ionViewWillEnter(): void {
    this.cargarDatos();
  }

  private actualizarGeneracionesYSemestre(): void {
    const mapa = new Map<string, string>();
    for (const a of this.asignaciones) {
      mapa.set(a.id_periodo, a.ciclo_escolar);
    }
    this.generaciones = Array.from(mapa.entries()).map(([id_periodo, etiqueta]) => ({ id_periodo, etiqueta }));
    if (!this.generacionSeleccionada || !mapa.has(this.generacionSeleccionada)) {
      this.generacionSeleccionada = this.generaciones[0]?.id_periodo ?? null;
    }
    this.actualizarSemestresDisponibles();
  }

  private actualizarSemestresDisponibles(): void {
    const semestres = new Set(
      this.asignaciones.filter((a) => a.id_periodo === this.generacionSeleccionada).map((a) => a.semestre),
    );
    this.semestresDisponibles = Array.from(semestres).sort((a, b) => a - b);
    if (this.semestreSeleccionado === null || !this.semestresDisponibles.includes(this.semestreSeleccionado)) {
      this.semestreSeleccionado = this.semestresDisponibles[0] ?? null;
    }
  }

  onCambioGeneracion(): void {
    this.semestreSeleccionado = null;
    this.actualizarSemestresDisponibles();
    this.actualizarMaterias();
    this.aplicarFiltro();
  }

  onCambioSemestre(): void {
    this.actualizarMaterias();
    this.aplicarFiltro();
  }

  private get asignacionesDelSemestre(): AsignacionDocente[] {
    return this.asignaciones.filter(
      (a) => a.id_periodo === this.generacionSeleccionada && a.semestre === this.semestreSeleccionado,
    );
  }

  private actualizarMaterias(): void {
    const mapa = new Map<string, MateriaResumen>();
    for (const asignacion of this.asignacionesDelSemestre) {
      const existente = mapa.get(asignacion.id_materia);
      const grupo: GrupoDeMateria = {
        grupo_nombre: asignacion.grupo_nombre,
        semestre: asignacion.semestre,
        ciclo_escolar: asignacion.ciclo_escolar,
      };
      if (existente) {
        existente.grupos.push(grupo);
      } else {
        mapa.set(asignacion.id_materia, {
          id_materia: asignacion.id_materia,
          nombre: asignacion.materia_nombre,
          clave: asignacion.materia_clave,
          horas_semana: asignacion.horas_semana,
          grupos: [grupo],
        });
      }
    }
    this.materias = Array.from(mapa.values());
  }

  aplicarFiltro(): void {
    const texto = this.filtroTexto.trim().toLowerCase();
    if (!texto) {
      this.materiasFiltradas = this.materias;
      return;
    }
    this.materiasFiltradas = this.materias.filter(
      (materia) => materia.nombre.toLowerCase().includes(texto) || (materia.clave ?? '').toLowerCase().includes(texto),
    );
  }

  async cargarDatos(): Promise<void> {
    const idDocente = this.authService.user?.id_usuario;
    if (!idDocente) {
      return;
    }
    this.cargando = true;
    try {
      this.asignaciones = await this.docenteService.getMisAsignaciones(idDocente);
      this.actualizarGeneracionesYSemestre();
      this.actualizarMaterias();
      this.aplicarFiltro();
    } finally {
      this.cargando = false;
    }
  }

  verDetalle(materia: MateriaResumen): void {
    this.materiaSeleccionada = materia;
  }

  cerrarDetalle(): void {
    this.materiaSeleccionada = null;
  }
}
