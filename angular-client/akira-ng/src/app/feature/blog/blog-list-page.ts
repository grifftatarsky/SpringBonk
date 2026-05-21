import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { PostHttpService } from '../../common/http/post-http.service';
import { TagHttpService } from '../../common/http/tag-http.service';
import {
  PostResponse,
  TagResponse,
} from '../../model/response/post-response.model';
import { UserService } from '../../auth/user.service';
import { mapSpringPagedResponse } from '../../common/util/pagination.util';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-blog-list-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './blog-list-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogListPage implements OnInit {
  private readonly posts = inject(PostHttpService);
  private readonly tags = inject(TagHttpService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly userService = inject(UserService);

  protected readonly items = signal<PostResponse[]>([]);
  protected readonly allTags = signal<TagResponse[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadingMore = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly activeTag = signal<string | null>(null);
  protected readonly page = signal(0);
  protected readonly hasMore = signal(true);

  protected readonly canCreate = computed(() =>
    this.userService.current.hasAuthority('POST_ADMIN'),
  );

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const tag = params.get('tag');
        this.activeTag.set(tag);
        void this.loadFirstPage();
      });
    void this.loadTags();
  }

  private async loadTags(): Promise<void> {
    try {
      const tags = await firstValueFrom(this.tags.listTags());
      this.allTags.set(tags ?? []);
    } catch (err) {
      console.error('[BlogListPage] Failed to load tags', err);
    }
  }

  private async loadFirstPage(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.page.set(0);
    try {
      const response = await firstValueFrom(
        this.posts.listPosts(0, PAGE_SIZE, this.activeTag() ?? undefined),
      );
      const mapped = mapSpringPagedResponse<PostResponse>(response);
      this.items.set([...mapped.items]);
      this.hasMore.set(mapped.items.length < mapped.page.totalElements);
    } catch (err) {
      console.error('[BlogListPage] Failed to load posts', err);
      this.error.set('Unable to load posts right now.');
    } finally {
      this.loading.set(false);
    }
  }

  protected async loadMore(): Promise<void> {
    if (this.loadingMore() || !this.hasMore()) return;
    this.loadingMore.set(true);
    try {
      const next = this.page() + 1;
      const response = await firstValueFrom(
        this.posts.listPosts(next, PAGE_SIZE, this.activeTag() ?? undefined),
      );
      const mapped = mapSpringPagedResponse<PostResponse>(response);
      const combined: PostResponse[] = [...this.items(), ...mapped.items];
      this.items.set(combined);
      this.page.set(next);
      this.hasMore.set(combined.length < mapped.page.totalElements);
    } catch (err) {
      console.error('[BlogListPage] Failed to load more', err);
    } finally {
      this.loadingMore.set(false);
    }
  }

  protected setTag(slug: string | null): void {
    this.router.navigate(['/blog'], {
      queryParams: slug ? { tag: slug } : {},
    });
  }

  protected excerpt(body: string): string {
    const stripped = body
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/[#>*_\-`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return stripped.length > 240 ? stripped.slice(0, 237) + '…' : stripped;
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
