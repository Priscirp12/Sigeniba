import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonButton, IonCard, IonCardContent, IonContent, IonIcon, IonInput, IonItem, IonList, IonText, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, mailOutline } from 'ionicons/icons';
import { PasswordRecoveryService } from '../../services/password-recovery.service';

@Component({
  selector: 'app-recuperar-password',
  templateUrl: './recuperar-password.page.html',
  styleUrls: ['./recuperar-password.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonCard,
    IonCardContent,
    IonList,
    IonItem,
    IonInput,
    IonButton,
    IonIcon,
    IonText,
  ],
})
export class RecuperarPasswordPage {
  identificador = '';
  enviando = false;
  enviado = false;
  mensaje = '';

  constructor(
    private readonly recoveryService: PasswordRecoveryService,
    private readonly toastController: ToastController,
  ) {
    addIcons({ mailOutline, arrowBackOutline });
  }

  async solicitar(): Promise<void> {
    if (!this.identificador.trim()) {
      await this.mostrarToast('Ingresa tu usuario o correo', 'danger');
      return;
    }
    this.enviando = true;
    try {
      const respuesta = await this.recoveryService.solicitarRecuperacion(this.identificador.trim());
      this.enviado = true;
      this.mensaje = respuesta.message;
    } catch (error) {
      await this.mostrarToast(error instanceof Error ? error.message : 'Ocurrió un error inesperado', 'danger');
    } finally {
      this.enviando = false;
    }
  }

  private async mostrarToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({ message, color, duration: 3500, position: 'bottom' });
    await toast.present();
  }
}
