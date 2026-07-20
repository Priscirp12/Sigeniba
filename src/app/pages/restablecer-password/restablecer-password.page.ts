import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonButton, IonCard, IonCardContent, IonContent, IonIcon, IonInput, IonItem, IonList, IonText, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eyeOffOutline, eyeOutline, lockClosedOutline } from 'ionicons/icons';
import { PasswordRecoveryService } from '../../services/password-recovery.service';

@Component({
  selector: 'app-restablecer-password',
  templateUrl: './restablecer-password.page.html',
  styleUrls: ['./restablecer-password.page.scss'],
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
export class RestablecerPasswordPage {
  token = '';
  nuevaPassword = '';
  confirmarPassword = '';
  guardando = false;

  mostrarNuevaPassword = false;
  mostrarConfirmarPassword = false;

  constructor(
    private readonly recoveryService: PasswordRecoveryService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastController: ToastController,
  ) {
    addIcons({ eyeOutline, eyeOffOutline, lockClosedOutline });
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
  }

  async guardar(): Promise<void> {
    if (!this.nuevaPassword || !this.confirmarPassword) {
      await this.mostrarToast('Completa ambos campos de contraseña', 'danger');
      return;
    }
    if (this.nuevaPassword !== this.confirmarPassword) {
      await this.mostrarToast('La confirmación de contraseña no coincide', 'danger');
      return;
    }

    this.guardando = true;
    try {
      const respuesta = await this.recoveryService.restablecerPassword(this.token, this.nuevaPassword);
      await this.mostrarToast(respuesta.message, 'success');
      await this.router.navigateByUrl('/login');
    } catch (error) {
      await this.mostrarToast(error instanceof Error ? error.message : 'Ocurrió un error inesperado', 'danger');
    } finally {
      this.guardando = false;
    }
  }

  private async mostrarToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({ message, color, duration: 3500, position: 'bottom' });
    await toast.present();
  }
}
