import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SystemStatusComponent } from './system-status.component';
import { SystemStatusService } from '../../common/system-status.service';
import { GITHUB_URL } from '../../app.constants';

@Component({
  selector: 'app-home',
  imports: [RouterLink, SystemStatusComponent],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './home.css',
})
export class Home {
  /** Drives the conditional Oozengine hero + the status box. */
  protected readonly status = inject(SystemStatusService);
  protected readonly githubUrl = GITHUB_URL;
}
