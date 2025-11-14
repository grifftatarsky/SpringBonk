import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-elections-page',
  standalone: true,
  templateUrl: './elections-page.html',
  styleUrl: './elections-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElectionsPage {}
