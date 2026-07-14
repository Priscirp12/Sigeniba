import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eyeOutline } from 'ionicons/icons';
import { AlumnoService, MateriaCalificacionesAlumno } from '../../../services/alumno.service';
import { AuthService } from '../../../services/auth.service';

type TipoParcial = 'parcial1' | 'parcial2' | 'parcial3';

const ETIQUETAS_PARCIAL: Record<TipoParcial, string> = {
  parcial1: 'Primer Parcial',
  parcial2: 'Segundo Parcial',
  parcial3: 'Tercer Parcial',
};

@Component({
  selector: 'app-alumno-calificaciones',
  templateUrl: './alumno-calificaciones.page.html',
  styleUrls: ['./alumno-calificaciones.page.scss'],
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonButtons,
    IonIcon,
    IonModal,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
  ],
})
export class AlumnoCalificacionesPage {
  materias: MateriaCalificacionesAlumno[] = [];
  cargando = false;
  materiaSeleccionada: MateriaCalificacionesAlumno | null = null;

  readonly tipos: TipoParcial[] = ['parcial1', 'parcial2', 'parcial3'];
  readonly etiquetasParcial = ETIQUETAS_PARCIAL;

  constructor(
    private readonly alumnoService: AlumnoService,
    private readonly authService: AuthService,
  ) {
    addIcons({ eyeOutline });
    this.cargarDatos();
  }

  async cargarDatos(): Promise<void> {
    const matricula = this.authService.user?.id_usuario;
    if (!matricula) {
      return;
    }
    this.cargando = true;
    try {
      this.materias = await this.alumnoService.getMisCalificaciones(matricula);
    } finally {
      this.cargando = false;
    }
  }

  verDetalle(materia: MateriaCalificacionesAlumno): void {
    this.materiaSeleccionada = materia;
  }

  cerrarDetalle(): void {
    this.materiaSeleccionada = null;
  }
}
