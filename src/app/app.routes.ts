import { Routes } from '@angular/router';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
    canActivate: [authGuard],
  },
  {
    path: 'calificaciones',
    loadComponent: () => import('./pages/calificaciones/calificaciones.page').then((m) => m.CalificacionesPage),
    canActivate: [authGuard],
  },
  {
    path: 'alumnos',
    loadComponent: () => import('./pages/alumnos/alumnos.page').then((m) => m.AlumnosPage),
    canActivate: [authGuard],
  },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin.page').then((m) => m.AdminPage),
    canActivate: [authGuard],
    data: { roles: ['administrador'] },
  },
  {
    path: 'materias',
    loadComponent: () => import('./pages/materias/materias.page').then((m) => m.MateriasPage),
    canActivate: [authGuard],
  },
  {
    path: 'alumno',
    loadComponent: () => import('./pages/alumno/alumno.page').then((m) => m.AlumnoPage),
    canActivate: [authGuard],
    data: { roles: ['alumno'] },
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
