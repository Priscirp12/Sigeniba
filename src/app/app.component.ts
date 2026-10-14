import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { AtajosTecladoService } from './services/atajos-teclado.service';
import { InactividadService } from './services/inactividad.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor(inactividadService: InactividadService, atajosTecladoService: AtajosTecladoService) {
    inactividadService.iniciar();
    atajosTecladoService.iniciar();
  }
}
