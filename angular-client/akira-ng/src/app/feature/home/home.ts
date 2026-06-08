import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SystemStatusComponent } from './system-status.component';

@Component({
  selector: 'app-home',
  imports: [RouterLink, SystemStatusComponent],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './home.css',
})
export class Home {

}
