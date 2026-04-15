import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ActivityHttpService } from '../../../common/http/activity-http.service';
import {
  ActivityItemResponse,
  ActivityItemType,
} from '../../../model/response/activity-item-response.model';

const WIDGET_LIMIT = 5;

@Component({
  selector: 'app-activity-widget',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './activity-widget.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityWidgetComponent implements OnInit {
  private readonly http = inject(ActivityHttpService);

  private readonly items = signal<ActivityItemResponse[]>([]);
  private readonly loading = signal(false);
  private readonly error = signal<string | null>(null);

  protected readonly vm = computed(() => ({
    items: this.items(),
    loading: this.loading(),
    error: this.error(),
    isEmpty: !this.loading() && this.items().length === 0,
  }));

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const items = await firstValueFrom(this.http.getFeed(WIDGET_LIMIT));
      this.items.set(items ?? []);
    } catch (err) {
      console.error('[ActivityWidget] Failed to load feed', err);
      this.error.set('Unable to load activity right now.');
    } finally {
      this.loading.set(false);
    }
  }

  protected refresh(): void {
    void this.load();
  }

  protected verb(type: ActivityItemType): string {
    switch (type) {
      case 'REVIEW_POSTED':
        return 'reviewed';
      case 'STARTED_READING':
        return 'started';
      case 'FINISHED_READING':
        return 'finished';
      case 'ABANDONED':
        return 'gave up on';
      default:
        return 'touched';
    }
  }

  protected relativeTime(iso: string): string {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';
    const diffMs = Date.now() - then;
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
  }
}
