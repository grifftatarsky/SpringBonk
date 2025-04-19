import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthenticationComponent } from './auth/authentication.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    HttpClientModule,
    AuthenticationComponent,
  ],
  templateUrl: './app.component.html',
  styles: [],
})
export class AppComponent {
  title: string = "Bonk!"
}
