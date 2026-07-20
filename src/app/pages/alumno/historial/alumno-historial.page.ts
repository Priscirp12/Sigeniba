import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { IonButton, IonContent, IonIcon } from '@ionic/angular/standalone';
import jsPDF from 'jspdf';
import { addIcons } from 'ionicons';
import { downloadOutline } from 'ionicons/icons';
import { AlumnoService, HistorialAcademico } from '../../../services/alumno.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-alumno-historial',
  templateUrl: './alumno-historial.page.html',
  styleUrls: ['./alumno-historial.page.scss'],
  imports: [CommonModule, IonContent, IonButton, IonIcon],
})
export class AlumnoHistorialPage {
  historial: HistorialAcademico | null = null;
  cargando = false;

  constructor(
    private readonly alumnoService: AlumnoService,
    private readonly authService: AuthService,
  ) {
    addIcons({ downloadOutline });
    this.cargarDatos();
  }

  async cargarDatos(): Promise<void> {
    const matricula = this.authService.user?.id_usuario;
    if (!matricula) {
      return;
    }
    this.cargando = true;
    try {
      this.historial = await this.alumnoService.getHistorial(matricula);
    } finally {
      this.cargando = false;
    }
  }

  descargarPdf(): void {
    if (!this.historial) {
      return;
    }

    const doc = new jsPDF();
    const anchoPagina = doc.internal.pageSize.getWidth();
    const altoPagina = doc.internal.pageSize.getHeight();
    const margenIzquierdo = 20;
    const margenDerecho = 20;
    const anchoUtil = anchoPagina - margenIzquierdo - margenDerecho;
    let y = 20;

    const saltoDePaginaSiNecesario = (espacioNecesario: number) => {
      if (y + espacioNecesario > altoPagina - 20) {
        doc.addPage();
        y = 20;
      }
    };

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Historial Académico', anchoPagina / 2, y, { align: 'center' });
    y += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const parrafos = this.historial.legenda.split('\n');
    for (const parrafo of parrafos) {
      if (!parrafo.trim()) {
        y += 3;
        continue;
      }
      const lineas = doc.splitTextToSize(parrafo, anchoUtil);
      doc.text(lineas, anchoPagina / 2, y, { align: 'center' });
      y += lineas.length * 4.5;
    }
    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Lista de Materias Por Semestre', anchoPagina / 2, y, { align: 'center' });
    y += 10;

    for (const semestre of this.historial.semestres) {
      saltoDePaginaSiNecesario(20 + semestre.materias.length * 6);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`Semestre ${semestre.etiqueta}`, margenIzquierdo, y);
      y += 6;

      doc.setFontSize(9);
      doc.text('Materia', margenIzquierdo, y);
      doc.text('Calificación', anchoPagina - margenDerecho, y, { align: 'right' });
      y += 1.5;
      doc.setLineWidth(0.3);
      doc.line(margenIzquierdo, y, anchoPagina - margenDerecho, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      for (const materia of semestre.materias) {
        saltoDePaginaSiNecesario(8);
        doc.text(materia.nombre, margenIzquierdo, y);
        doc.text(String(materia.calificacion), anchoPagina - margenDerecho, y, { align: 'right' });
        y += 6;
      }

      doc.setLineWidth(0.5);
      doc.line(margenIzquierdo, y, anchoPagina - margenDerecho, y);
      y += 5;

      doc.setFont('helvetica', 'bold');
      doc.text('Promedio del Semestre', margenIzquierdo, y);
      doc.text(String(semestre.promedio_semestre), anchoPagina - margenDerecho, y, { align: 'right' });
      y += 12;
    }

    saltoDePaginaSiNecesario(15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    const promedioGeneral = this.historial.promedio_general !== null ? this.historial.promedio_general.toFixed(1) : '-';
    doc.text(`Promedio General: ${promedioGeneral}`, anchoPagina / 2, y, { align: 'center' });

    doc.save(`historial_academico_${this.historial.alumno.matricula}.pdf`);
  }
}
