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
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PostHttpService } from '../../common/http/post-http.service';
import { PostResponse } from '../../model/response/post-response.model';
import { MarkdownEditorComponent } from '../../common/ui/markdown-editor.component';

@Component({
  selector: 'app-blog-editor-page',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, MarkdownEditorComponent],
  templateUrl: './blog-editor-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogEditorPage implements OnInit {
  private readonly posts = inject(PostHttpService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly editingId = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly mode = computed(() =>
    this.editingId() ? 'edit' : 'create',
  );

  protected readonly form = new FormGroup({
    title: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(255)],
    }),
    body: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50000)],
    }),
    tagsInput: new FormControl<string>('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = params.get('id');
        this.editingId.set(id);
        if (id) void this.loadExisting(id);
      });
  }

  private async loadExisting(id: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const post = await firstValueFrom(this.posts.getPost(id));
      this.form.setValue({
        title: post.title,
        body: post.body,
        tagsInput: post.tags.map((t) => t.label).join(', '),
      });
    } catch (err) {
      console.error('[BlogEditorPage] Failed to load post', err);
      this.error.set('Could not load that post.');
    } finally {
      this.loading.set(false);
    }
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const { title, body, tagsInput } = this.form.getRawValue();
    const tagLabels = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      let saved: PostResponse;
      const id = this.editingId();
      if (id) {
        saved = await firstValueFrom(
          this.posts.updatePost(id, { title, body, tagLabels }),
        );
      } else {
        saved = await firstValueFrom(
          this.posts.createPost({ title, body, tagLabels }),
        );
      }
      void this.router.navigate(['/blog', saved.id]);
    } catch (err) {
      console.error('[BlogEditorPage] Failed to save', err);
      this.error.set('Save failed. Check the console for details.');
      this.saving.set(false);
    }
  }
}
