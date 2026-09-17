import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/today.page').then((m) => m.TodayPage) },
  {
    path: 'archive',
    loadComponent: () => import('./pages/archive.page').then((m) => m.ArchivePage),
  },
  { path: 'topics', loadComponent: () => import('./pages/topics.page').then((m) => m.TopicsPage) },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings.page').then((m) => m.SettingsPage),
  },
  { path: '**', redirectTo: '' },
];
