import { Routes } from '@angular/router';
import { AboutView } from './about.view';
import { HomeComponent } from './home/home.component';
import { LoginErrorView } from './login-error.view';
import {ElectionsComponent} from './elections/elections.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'about', component: AboutView },
  { path: 'elections', component: ElectionsComponent },
  { path: 'login-error', component: LoginErrorView },
  { path: '**', redirectTo: '/' },
];
