import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-shelves-page',
  standalone: true,
  templateUrl: './shelves-page.html',
  styleUrl: './shelves-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShelvesPage {
}
