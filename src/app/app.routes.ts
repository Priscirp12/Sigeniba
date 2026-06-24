import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'calificaciones',
    loadComponent: () => import('./pages/calificaciones/calificaciones.page').then((m) => m.CalificacionesPage),
  },
  {
    path: 'alumnos',
    loadComponent: () => import('./pages/alumnos/alumnos.page').then((m) => m.AlumnosPage),
  },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin.page').then((m) => m.AdminPage),
  },
  {
    path: 'materias',
    loadComponent: () => import('./pages/materias/materias.page').then((m) => m.MateriasPage),
  },
  {
    path: 'alumno',
    loadComponent: () => import('./pages/alumno/alumno.page').then((m) => m.AlumnoPage),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
