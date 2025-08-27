import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-menu-navigation',
  standalone: true,
  imports: [MatButtonModule, MatMenuModule],
  template: ` <button mat-menu-item (click)="navigate()">{{ label }}</button>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuNavigationComponent {
  @Input({ required: true })
  label!: string;

  @Input({ required: true })
  destination!: ReadonlyArray<string>;

  constructor(private router: Router) {}

  navigate(): void {
    void this.router.navigate(this.destination as string[]);
  }
}
