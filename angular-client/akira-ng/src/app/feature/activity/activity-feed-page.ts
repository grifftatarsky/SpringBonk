import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivityFeedStore } from './activity-feed.store';
import { ActivityItemType } from '../../model/response/activity-item-response.model';

@Component({
  selector: 'app-activity-feed-page',
  standalone: true,
  imports: [RouterLink],
  providers: [ActivityFeedStore],
  templateUrl: './activity-feed-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityFeedPage implements OnInit {
  protected readonly store = inject(ActivityFeedStore);
  protected readonly vm = this.store.vm;

  ngOnInit(): void {
    void this.store.load();
  }

  protected refresh(): void {
    void this.store.refresh();
  }

  protected loadMore(): void {
    void this.store.loadMore();
  }

  protected verb(type: ActivityItemType): string {
    switch (type) {
      case 'REVIEW_POSTED':
        return 'reviewed';
      case 'STARTED_READING':
        return 'started reading';
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
