import { Component, Input, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-menu-navigation',
  standalone: true,
  imports: [MatButtonModule, MatMenuModule],
  template: ` <button mat-menu-item (click)="navigate()">{{ label }}</button>`,
  styles: ``,
})
export class MenuNavigationComponent implements OnDestroy {
  @Input()
  label!: string;

  @Input()
  destination!: string[];

  private userSubscription?: Subscription;

  constructor(private router: Router) {}

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  navigate(): void {
    void this.router.navigate(this.destination);
  }
}
