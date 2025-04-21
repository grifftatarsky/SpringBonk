import { Component, Input, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [MatButton],
  template: `<button mat-stroked-button (click)="navigate()">
    {{ label }}
  </button>`,
  styles: ``,
})
export class NavigationComponent implements OnDestroy {
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
