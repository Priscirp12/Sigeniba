import { NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { bookOutline, chevronBackOutline, logOutOutline, schoolOutline } from 'ionicons/icons';
import { AlumnoProfile, AlumnoService, MateriaAlumno } from '../../services/alumno.service';

@Component({
  selector: 'app-alumno',
  templateUrl: './alumno.page.html',
  styleUrls: ['./alumno.page.scss'],
  imports: [
    NgFor,
    NgIf,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonModal,
  ],
})
export class AlumnoPage {
  perfil: AlumnoProfile | null = null;
  materiaSeleccionada: MateriaAlumno | null = null;
  isModalOpen = false;

  constructor(
    private readonly alumnoService: AlumnoService,
    private readonly router: Router
  ) {
    addIcons({ schoolOutline, bookOutline, chevronBackOutline, logOutOutline });
    this.cargarPerfil();
  }

  async cargarPerfil(): Promise<void> {
    this.perfil = await this.alumnoService.getPerfilAlumno();
  }

  abrirMateria(materia: MateriaAlumno): void {
    this.materiaSeleccionada = materia;
    this.isModalOpen = true;
  }

  cerrarModal(): void {
    this.isModalOpen = false;
    this.materiaSeleccionada = null;
  }

  cerrarSesion(): void {
    this.router.navigateByUrl('/login');
  }
}
