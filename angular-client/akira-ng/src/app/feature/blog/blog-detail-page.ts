import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PostHttpService } from '../../common/http/post-http.service';
import { PostResponse } from '../../model/response/post-response.model';
import { UserService } from '../../auth/user.service';
import { MarkdownViewComponent } from '../../common/ui/markdown-view.component';

@Component({
  selector: 'app-blog-detail-page',
  standalone: true,
  imports: [RouterLink, MarkdownViewComponent],
  templateUrl: './blog-detail-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogDetailPage implements OnInit {
  private readonly posts = inject(PostHttpService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly userService = inject(UserService);

  protected readonly post = signal<PostResponse | null>(null);
  protected readonly loading = signal(false);
  protected readonly notFound = signal(false);
  protected readonly deleting = signal(false);

  protected readonly canEdit = computed(() =>
    this.userService.current.hasAuthority('POST_ADMIN'),
  );

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = params.get('id');
        if (id) void this.load(id);
      });
  }

  private async load(id: string): Promise<void> {
    this.loading.set(true);
    this.notFound.set(false);
    try {
      const post = await firstValueFrom(this.posts.getPost(id));
      this.post.set(post);
    } catch (err) {
      console.error('[BlogDetailPage] Failed to load post', err);
      this.notFound.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  protected async confirmDelete(): Promise<void> {
    const post = this.post();
    if (!post) return;
    if (!confirm(`Delete "${post.title}"? This can't be undone.`)) return;
    this.deleting.set(true);
    try {
      await firstValueFrom(this.posts.deletePost(post.id));
      void this.router.navigate(['/blog']);
    } catch (err) {
      console.error('[BlogDetailPage] Failed to delete', err);
      this.deleting.set(false);
    }
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
