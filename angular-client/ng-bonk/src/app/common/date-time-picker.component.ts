import {
  ChangeDetectionStrategy,
  Component,
  Input,
  forwardRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';

@Component({
  selector: 'app-date-time-picker',
  standalone: true,
  templateUrl: './date-time-picker.component.html',
  styleUrls: ['./date-time-picker.component.scss'],
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatTooltipModule,
  ],
  providers: [
    provideNativeDateAdapter(),
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateTimePickerComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => DateTimePickerComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateTimePickerComponent
  implements ControlValueAccessor, Validator
{
  @Input() label: string = 'Closure date';
  @Input() hint: string | null = null;
  @Input() required: boolean = false;
  @Input() enforceFuture: boolean = true;
  @Input() showClear: boolean = true;
  @Input() minDate?: Date;

  dateValue: Date | null = null;
  timeValue: string | null = null;
  disabled: boolean = false;
  lastValidation: ValidationErrors | null = null;

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    if (!value) {
      this.dateValue = null;
      this.timeValue = null;
      return;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      this.dateValue = null;
      this.timeValue = null;
      return;
    }

    this.dateValue = parsed;
    this.timeValue = this.formatTime(parsed);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  validate(): ValidationErrors | null {
    return this.validateInternal();
  }

  onDateChanged(event: MatDatepickerInputEvent<Date>): void {
    this.dateValue = event.value ? new Date(event.value) : null;
    this.emit();
  }

  onTimeChanged(value: string): void {
    this.timeValue = value || null;
    this.emit();
  }

  clear(): void {
    if (this.disabled) return;
    this.dateValue = null;
    this.timeValue = null;
    this.emit();
    this.lastValidation = null;
  }

  touch(): void {
    this.onTouched();
  }

  private emit(): void {
    const iso = this.buildIsoString();
    this.onChange(iso);
    this.validateInternal();
  }

  private buildIsoString(): string | null {
    if (!this.dateValue || !this.timeValue) return null;

    const [hours, minutes] = this.timeValue.split(':').map(part => Number(part));
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

    const candidate = new Date(this.dateValue.getTime());
    candidate.setHours(hours, minutes, 0, 0);
    return candidate.toISOString();
  }

  private validateInternal(): ValidationErrors | null {
    if (this.required && (!this.dateValue || !this.timeValue)) {
      this.lastValidation = { required: true };
      return this.lastValidation;
    }

    if (this.dateValue && !this.timeValue) {
      this.lastValidation = { time: true };
      return this.lastValidation;
    }

    if (this.dateValue && this.timeValue) {
      const iso = this.buildIsoString();
      if (!iso) {
        this.lastValidation = { invalid: true };
        return this.lastValidation;
      }
      if (this.enforceFuture) {
        const candidate = new Date(iso);
        const threshold = this.minDate ?? new Date();
        if (candidate.getTime() <= threshold.getTime()) {
          this.lastValidation = { past: true };
          return this.lastValidation;
        }
      }
    }

    this.lastValidation = null;
    return this.lastValidation;
  }

  private formatTime(value: Date): string {
    const hours = value.getHours().toString().padStart(2, '0');
    const minutes = value.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  errorMessage(errors: ValidationErrors): string {
    if (errors['required']) {
      return 'Select a date and time.';
    }
    if (errors['time']) {
      return 'Add a time to finish scheduling.';
    }
    if (errors['past']) {
      return "Choose a time after now.";
    }
    if (errors['invalid']) {
      return 'Invalid date or time selection.';
    }
    return 'Invalid value.';
  }
}
