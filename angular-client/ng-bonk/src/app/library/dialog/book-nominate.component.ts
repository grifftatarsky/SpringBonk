import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { BookCoverComponent } from '../../common/book-cover.component';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { map } from 'rxjs/operators';
import { BookResponse } from '../../model/response/book-response.model';
import { ElectionResponse } from '../../model/response/election-response.model';
import { NotificationService } from '../../service/notification.service';
import { ElectionHttpService } from '../../service/http/election-http.service';

@Component({
  selector: 'app-book-nominate-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatIconModule,
    BookCoverComponent,
  ],
  templateUrl: './book-nominate.component.html',
  styleUrls: ['./book-nominate.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookNominateDialog implements OnInit {
  electionControl = new FormControl<string | null>(null, [Validators.required]);
  elections: ElectionResponse[] = [];
  loading = true;
  nominating = false;
  selectedElection: ElectionResponse | null = null;

  constructor(
    public dialogRef: MatDialogRef<BookNominateDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { book: BookResponse },
    private electionHttp: ElectionHttpService,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadElections();

    // Update selectedElection when election changes
    this.electionControl.valueChanges.subscribe(electionId => {
      if (electionId) {
        this.selectedElection =
          this.elections.find(e => e.id === electionId) || null;
      } else {
        this.selectedElection = null;
      }
    });
  }

  loadElections(): void {
    this.loading = true;
    this.electionHttp
      .getAllElections()
      .pipe(
        map(elections => {
          // Filter to only include ongoing or endless elections
          const now = new Date();
          return elections.filter(election => {
            if (!election.endDateTime) return true; // Endless election
            const endDate = new Date(election.endDateTime);
            return endDate > now; // Ongoing election
          });
        }),
        map(elections => {
          // Sort by most recent creation date
          return elections.sort((a, b) => {
            return (
              new Date(b.createDate).getTime() -
              new Date(a.createDate).getTime()
            );
          });
        })
      )
      .subscribe({
        next: elections => {
          this.elections = elections;
          this.loading = false;
        },
        error: err => {
          this.loading = false;
          this.notification.error(
            'Failed to load elections. Please try again.'
          );
          console.error('Error loading elections:', err);
        },
      });
  }

  getStatus(endDateTime?: string): {
    text: string;
    icon: string;
    class: string;
  } {
    const now = new Date();

    if (!endDateTime || isNaN(new Date(endDateTime).getTime())) {
      return {
        text: 'Endless',
        icon: 'all_inclusive',
        class: 'status-chip-endless',
      };
    }

    const end = new Date(endDateTime);

    if (end > now) {
      return {
        text: 'Ongoing',
        icon: 'timer',
        class: 'status-chip-ongoing',
      };
    }

    return {
      text: 'Ended',
      icon: 'stop',
      class: 'status-chip-ended',
    };
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onNominate(): void {
    if (this.electionControl.valid && this.electionControl.value) {
      this.nominating = true;

      this.electionHttp
        .nominateCandidate(this.electionControl.value, this.data.book.id)
        .subscribe({
          next: (): void => {
            this.nominating = false;
            this.notification.success(
              `Successfully nominated "${this.data.book.title}" for the election!`
            );
            this.dialogRef.close(true);
          },
          error: err => {
            this.nominating = false;

            // Handle specific error for duplicate nomination
            if (
              err.status === 400 &&
              err.error?.message?.includes('already nominated')
            ) {
              this.notification.error(
                `This book has already been nominated for this election.`
              );
            } else {
              this.notification.error(
                'Failed to nominate book. Please try again.'
              );
            }

            console.error('Error nominating book:', err);
          },
        });
    }
  }
}
