import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReviewHttpService } from '../../../common/http/review-http.service';
import { ReviewResponse } from '../../../model/response/review-response.model';
import { UserService } from '../../../auth/user.service';
import { mapSpringPagedResponse } from '../../../common/util/pagination.util';

const WIDGET_LIMIT = 5;

/**
 * The signed-in user's own reviews. Reads the by-author endpoint directly
 * rather than through a store — same shape as the activity widget, since
 * there's no shared state for anyone else to consume.
 */
@Component({
  selector: 'app-my-reviews-widget',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './my-reviews-widget.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyReviewsWidgetComponent implements OnInit {
  private readonly http = inject(ReviewHttpService);
  private readonly userService = inject(UserService);

  private readonly authorId = toSignal(
    this.userService.valueChanges.pipe(map((user) => user.id)),
    { initialValue: this.userService.current.id },
  );

  private readonly items = signal<ReviewResponse[]>([]);
  private readonly total = signal(0);
  private readonly loading = signal(false);
  private readonly error = signal<string | null>(null);

  protected readonly vm = computed(() => {
    const items = this.items();
    const total = this.total();
    return {
      items,
      total,
      loading: this.loading(),
      error: this.error(),
      signedIn: !!this.authorId(),
      isEmpty: !this.loading() && items.length === 0,
      /** How many reviews exist beyond the ones shown. */
      moreCount: Math.max(0, total - items.length),
    };
  });

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    const authorId = this.authorId();
    if (!authorId) {
      this.items.set([]);
      this.total.set(0);
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await firstValueFrom(
        this.http.getReviewsByAuthor(authorId, 0, WIDGET_LIMIT),
      );
      const result = mapSpringPagedResponse<ReviewResponse>(response);
      this.items.set([...result.items]);
      this.total.set(result.page.totalElements);
    } catch (err) {
      console.error('[MyReviewsWidget] Failed to load reviews', err);
      this.error.set('Unable to load your reviews right now.');
      this.items.set([]);
      this.total.set(0);
    } finally {
      this.loading.set(false);
    }
  }

  protected refresh(): void {
    void this.load();
  }

  /** First line of the review body, trimmed for the card. */
  protected excerpt(body: string): string {
    const firstLine = body.trim().split('\n')[0] ?? '';
    return firstLine.length > 140 ? `${firstLine.slice(0, 139).trimEnd()}…` : firstLine;
  }
}
