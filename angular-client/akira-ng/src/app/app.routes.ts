import { Routes } from '@angular/router';
import { Home } from './feature/home/home';

export const routes: Routes = [
  { path: '', component: Home, data: { title: 'Home' } },
  { path: '**', redirectTo: '/' },
];
