import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  forwardRef,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';
import { CalendarModule } from 'primeng/calendar';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-date-time-picker',
  standalone: true,
  templateUrl: './date-time-picker.component.html',
  styleUrls: ['./date-time-picker.component.scss'],
  imports: [CommonModule, FormsModule, CalendarModule, ButtonModule],
  providers: [
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
  @Input() label: string = '';
  @Input() hint: string | null = null;
  @Input() required: boolean = false;
  @Input() enforceFuture: boolean = true;
  @Input() showClear: boolean = true;
  @Input() minDate?: Date;

  value: Date | null = null;
  disabled = false;
  lastValidation: ValidationErrors | null = null;

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(iso: string | null): void {
    if (!iso) {
      this.value = null;
      return;
    }
    const parsed = new Date(iso);
    this.value = Number.isNaN(parsed.getTime()) ? null : parsed;
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

  onModelChange(next: Date | null): void {
    this.value = next;
    this.emit();
  }

  clear(): void {
    if (this.disabled) return;
    this.onModelChange(null);
  }

  touch(): void {
    this.onTouched();
  }

  validate(): ValidationErrors | null {
    return this.validateInternal();
  }

  errorMessage(errors: ValidationErrors): string {
    if (errors['required']) return 'Select a date and time.';
    if (errors['past']) return 'Choose a time after now.';
    if (errors['invalid']) return 'Invalid date or time selection.';
    return 'Invalid value.';
  }

  private emit(): void {
    this.onChange(this.value ? this.value.toISOString() : null);
    this.validateInternal();
  }

  private validateInternal(): ValidationErrors | null {
    if (this.required && !this.value) {
      this.lastValidation = { required: true };
      return this.lastValidation;
    }

    if (!this.value) {
      this.lastValidation = null;
      return this.lastValidation;
    }

    if (Number.isNaN(this.value.getTime())) {
      this.lastValidation = { invalid: true };
      return this.lastValidation;
    }

    if (this.enforceFuture) {
      const threshold = this.minDate ?? new Date();
      if (this.value.getTime() <= threshold.getTime()) {
        this.lastValidation = { past: true };
        return this.lastValidation;
      }
    }

    this.lastValidation = null;
    return this.lastValidation;
  }
}
