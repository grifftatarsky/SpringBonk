import { Routes } from '@angular/router';
import { AboutView } from './about.view';
import { HomeComponent } from './home/home.component';
import { LoginErrorView } from './login-error.view';
import { ElectionsComponent } from './elections/elections.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, data: { title: 'Home' } },
  { path: 'about', component: AboutView, data: { title: 'About' } },
  {
    path: 'elections',
    component: ElectionsComponent,
    data: { title: 'My elections' },
  },
  {
    path: 'login-error',
    component: LoginErrorView,
    data: { title: 'Error_1_oops' },
  },
  { path: '**', redirectTo: '/' },
];
