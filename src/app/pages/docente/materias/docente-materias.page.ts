import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonIcon, IonSearchbar } from '@ionic/angular/standalone';
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
  imports: [CommonModule, FormsModule, IonContent, IonButton, IonIcon, IonSearchbar],
})
export class DocenteMateriasPage {
  asignaciones: AsignacionDocente[] = [];
  cargando = false;
  filtroTexto = '';
  materiaSeleccionada: MateriaResumen | null = null;

  constructor(
    private readonly docenteService: DocenteService,
    private readonly authService: AuthService,
  ) {
    addIcons({ arrowBackOutline });
    this.cargarDatos();
  }

  get materias(): MateriaResumen[] {
    const mapa = new Map<string, MateriaResumen>();
    for (const asignacion of this.asignaciones) {
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
    return Array.from(mapa.values());
  }

  get materiasFiltradas(): MateriaResumen[] {
    const texto = this.filtroTexto.trim().toLowerCase();
    if (!texto) {
      return this.materias;
    }
    return this.materias.filter(
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
