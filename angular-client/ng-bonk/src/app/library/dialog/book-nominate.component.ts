import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import {
  DynamicDialogConfig,
  DynamicDialogRef,
  DynamicDialogModule,
} from 'primeng/dynamicdialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { BookResponse } from '../../model/response/book-response.model';
import { ElectionResponse } from '../../model/response/election-response.model';
import { NotificationService } from '../../service/notification.service';
import { ElectionHttpService } from '../../service/http/election-http.service';
import { BookCoverComponent } from '../../common/book-cover.component';
import { TagModule } from 'primeng/tag';

interface ElectionOption extends ElectionResponse {
  display: string;
}

@Component({
  selector: 'app-book-nominate-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    DropdownModule,
    ProgressSpinnerModule,
    DynamicDialogModule,
    TagModule,
    BookCoverComponent,
  ],
  templateUrl: './book-nominate.component.html',
  styleUrls: ['./book-nominate.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookNominateDialog implements OnInit {
  private readonly electionHttp = inject(ElectionHttpService);
  private readonly notification = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly ref = inject<DynamicDialogRef<boolean | undefined>>(DynamicDialogRef);
  readonly data = inject(DynamicDialogConfig<{ book: BookResponse }>).data;

  readonly electionControl = new FormControl<string | null>(null, {
    validators: [Validators.required],
  });

  elections: ElectionOption[] = [];
  loading = true;
  nominating = false;
  selectedElection: ElectionOption | null = null;

  get book(): BookResponse {
    return this.data?.book as BookResponse;
  }

  ngOnInit(): void {
    this.loadElections();
    this.electionControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(id => {
        this.selectedElection = this.elections.find(e => e.id === id) ?? null;
      });
  }

  loadElections(): void {
    this.loading = true;
    const now = new Date();
    this.electionHttp
      .getAllElections()
      .pipe(
        map(list =>
          list
            .filter(election => {
              if (!election.endDateTime) return true;
              const end = new Date(election.endDateTime);
              return end > now;
            })
            .sort(
              (a, b) =>
                new Date(b.createDate).getTime() - new Date(a.createDate).getTime()
            )
            .map(election => ({
              ...election,
              display: election.title,
            }))
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: elections => {
          this.elections = elections;
          this.loading = false;
        },
        error: err => {
          this.loading = false;
          this.notification.error('Failed to load elections. Please try again.');
          console.error('Error loading elections', err);
        },
      });
  }

  statusLabel(election: ElectionResponse): string {
    if (!election.endDateTime) return 'Endless';
    const end = new Date(election.endDateTime);
    return end > new Date() ? 'Ongoing' : 'Closed';
  }

  statusSeverity(election: ElectionResponse): 'success' | 'info' | 'danger' {
    if (!election.endDateTime) return 'info';
    const end = new Date(election.endDateTime);
    return end > new Date() ? 'success' : 'danger';
  }

  cancel(): void {
    this.ref.close();
  }

  nominate(): void {
    if (!this.electionControl.value || this.nominating) return;
    this.nominating = true;
    this.electionHttp
      .nominateCandidate(this.electionControl.value, this.book.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.nominating = false;
          this.notification.success(
            `"${this.book.title}" nominated successfully.`
          );
          this.ref.close(true);
        },
        error: err => {
          this.nominating = false;
          if (err.status === 400 && err.error?.message?.includes('already')) {
            this.notification.error('This book is already nominated.');
          } else {
            this.notification.error('Unable to nominate the book.');
          }
          console.error('Error nominating book', err);
        },
      });
  }
}
