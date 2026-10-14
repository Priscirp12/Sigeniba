import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AlertaService } from './alerta.service';
import { AuthService } from './auth.service';

const MINUTOS_INACTIVIDAD = 10;
const LIMITE_INACTIVIDAD_MS = MINUTOS_INACTIVIDAD * 60 * 1000;
const INTERVALO_REVISION_MS = 15 * 1000;
// Evita escribir en localStorage en cada movimiento del mouse.
const INTERVALO_REGISTRO_MS = 5 * 1000;
const EVENTOS_ACTIVIDAD = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'];

/**
 * Cierra la sesión automáticamente tras 10 minutos sin actividad del usuario.
 * La última actividad se guarda en localStorage para que se comparta entre
 * pestañas y para detectar una sesión vencida al volver a abrir el sistema.
 */
@Injectable({
  providedIn: 'root',
})
export class InactividadService {
  private ultimoRegistro = 0;
  private iniciado = false;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly zone: NgZone,
    private readonly alertas: AlertaService,
  ) {}

  iniciar(): void {
    if (this.iniciado) {
      return;
    }
    this.iniciado = true;

    if (this.authService.isAuthenticated && this.sesionVencida()) {
      void this.cerrarPorInactividad();
    }

    // Fuera de la zona de Angular para no disparar detección de cambios en cada evento.
    this.zone.runOutsideAngular(() => {
      const registrar = () => this.registrarActividad();
      EVENTOS_ACTIVIDAD.forEach((evento) => window.addEventListener(evento, registrar, { passive: true, capture: true }));
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.revisar();
        }
      });
      setInterval(() => this.revisar(), INTERVALO_REVISION_MS);
    });
  }

  private registrarActividad(): void {
    if (!this.authService.isAuthenticated) {
      return;
    }
    const ahora = Date.now();
    if (ahora - this.ultimoRegistro < INTERVALO_REGISTRO_MS) {
      return;
    }
    // Si la sesión ya venció (ej. la computadora estuvo suspendida), no se renueva.
    if (this.sesionVencida()) {
      this.revisar();
      return;
    }
    this.ultimoRegistro = ahora;
    this.authService.registrarActividad(ahora);
  }

  private revisar(): void {
    if (!this.authService.isAuthenticated) {
      return;
    }
    // La sesión se cerró en otra pestaña.
    if (!this.authService.sesionGuardada()) {
      this.zone.run(() => {
        this.authService.logout();
        void this.router.navigateByUrl('/login');
      });
      return;
    }
    if (this.sesionVencida()) {
      this.zone.run(() => void this.cerrarPorInactividad());
    }
  }

  private sesionVencida(): boolean {
    const ultimaActividad = this.authService.ultimaActividad();
    if (ultimaActividad === null) {
      // Sesiones iniciadas antes de esta función: se empieza a contar desde ahora.
      this.authService.registrarActividad(Date.now());
      return false;
    }
    return Date.now() - ultimaActividad > LIMITE_INACTIVIDAD_MS;
  }

  private async cerrarPorInactividad(): Promise<void> {
    this.authService.logout();
    await this.router.navigateByUrl('/login');
    await this.alertas.mostrar(
      `Tu sesión se cerró automáticamente después de ${MINUTOS_INACTIVIDAD} minutos de inactividad.`,
      'warning',
      5000,
    );
  }
}
