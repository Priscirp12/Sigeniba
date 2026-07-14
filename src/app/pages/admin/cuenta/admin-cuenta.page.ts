import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonInput, IonItem, IonLabel, IonList, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eyeOffOutline, eyeOutline } from 'ionicons/icons';
import { AdminService } from '../../../services/admin.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-admin-cuenta',
  templateUrl: './admin-cuenta.page.html',
  styleUrls: ['./admin-cuenta.page.scss'],
  imports: [CommonModule, FormsModule, IonContent, IonButton, IonIcon, IonList, IonItem, IonLabel, IonInput],
})
export class AdminCuentaPage {
  usuarioActual = this.authService.user?.id_usuario ?? '';
  passwordActual = '';
  nuevoUsuario = '';
  nuevaPassword = '';
  confirmarPassword = '';
  guardando = false;

  mostrarNuevaPassword = false;
  mostrarConfirmarPassword = false;

  constructor(
    private readonly adminService: AdminService,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly toastController: ToastController,
  ) {
    addIcons({ eyeOutline, eyeOffOutline });
  }

  async guardar(): Promise<void> {
    if (!this.passwordActual) {
      await this.mostrarToast('Ingresa tu contraseña actual', 'danger');
      return;
    }
    if (!this.nuevoUsuario && !this.nuevaPassword) {
      await this.mostrarToast('Indica un nuevo usuario o una nueva contraseña', 'danger');
      return;
    }
    if (this.nuevaPassword && this.nuevaPassword !== this.confirmarPassword) {
      await this.mostrarToast('La confirmación de contraseña no coincide', 'danger');
      return;
    }

    this.guardando = true;
    try {
      await this.adminService.cambiarCredenciales({
        id_usuario_actual: this.usuarioActual,
        password_actual: this.passwordActual,
        ...(this.nuevoUsuario ? { nuevo_id_usuario: this.nuevoUsuario } : {}),
        ...(this.nuevaPassword ? { nueva_password: this.nuevaPassword } : {}),
      });
      await this.mostrarToast('Cuenta actualizada. Vuelve a iniciar sesión.', 'success');
      this.authService.logout();
      await this.router.navigateByUrl('/login');
    } catch (error) {
      await this.mostrarToast(error instanceof Error ? error.message : 'Ocurrió un error al actualizar la cuenta', 'danger');
    } finally {
      this.guardando = false;
    }
  }

  private async mostrarToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({ message, color, duration: 2500, position: 'bottom' });
    await toast.present();
  }
}
