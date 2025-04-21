import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthenticationComponent } from './auth/authentication.component';
import { MatCard } from '@angular/material/card';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AuthenticationComponent, MatCard],
  templateUrl: './app.component.html',
  styles: [],
})
export class AppComponent {
  title: string = 'Bonk!';
}
