import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private lastKey = '';
  private lastAt = 0;
  constructor(private snackBar: MatSnackBar) {}

  success(message: string): void {
    this.openDedupe(`success:${message}`, message, ['success-snackbar'], 3000);
  }

  error(message: string): void {
    this.openDedupe(`error:${message}`, message, ['error-snackbar'], 5000);
  }

  info(message: string): void {
    this.openDedupe(`info:${message}`, message, [], 3000);
  }

  private openDedupe(
    key: string,
    message: string,
    panelClass: string[],
    duration: number
  ) {
    const now = Date.now();
    if (key === this.lastKey && now - this.lastAt < 600) return;
    this.lastKey = key;
    this.lastAt = now;
    this.snackBar.open(message, 'Close', {
      duration,
      panelClass,
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
    });
  }
}
