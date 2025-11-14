import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DashboardStore } from './dashboard.store';
import { ShelfWidgetComponent } from './widgets/shelf-widget.component';
import { ElectionWidgetComponent } from './widgets/election-widget.component';

@Component({
  selector: 'app-dashboard',
  imports: [ShelfWidgetComponent, ElectionWidgetComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly store: DashboardStore = inject(DashboardStore);

  protected readonly vm = this.store.vm;

  protected refreshProfile(): void {
    this.store.refreshProfile();
  }
}
