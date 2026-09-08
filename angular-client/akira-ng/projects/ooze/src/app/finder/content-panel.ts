import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { CatalogItem, ContentTypeDef, FieldDef, titleCase } from './ooze-content.models';
import { ContentService } from './content.service';

/**
 * Generic detail + editor for any catalog item, rendered from its
 * {@link ContentTypeDef}. Read-only for everyone; edit/create/revert/hide/delete
 * show only for a signed-in DM. Editing a base row copy-on-writes server-side,
 * hence the up-front notice. Emits {@link changed} with the id to re-select
 * (or null) after a successful write.
 */
@Component({
  selector: 'ooze-content-panel',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './content-panel.html',
})
export class ContentPanel {
  private readonly content = inject(ContentService);

  readonly def = input.required<ContentTypeDef>();
  readonly item = input<CatalogItem | null>(null);
  readonly creating = input(false);
  readonly canEdit = input(false);

  readonly changed = output<string | null>();
  readonly closeCreate = output<void>();

  protected readonly form = signal<FormGroup>(new FormGroup({}));
  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    // Rebuild the form when the content type changes.
    effect(() => {
      const def = this.def();
      this.form.set(this.buildForm(def));
      untracked(() => this.sync());
    });
    // Repopulate when the selected item / create-mode changes.
    effect(() => {
      this.item();
      this.creating();
      this.sync();
    });
  }

  /** Meta fields for the read-only detail grid — includes list fields. */
  protected metaFields(): readonly FieldDef[] {
    return this.def().fields.filter(f => f.group === 'meta' && f.kind !== 'boolean');
  }

  /**
   * Meta fields the generic form can edit. List fields are excluded: a set of
   * abilities or skills needs a multi-select, and rendering one as a text input
   * would let a save silently flatten it.
   */
  protected metaInputs(): readonly FieldDef[] {
    return this.def().fields.filter(
      f => f.group === 'meta' && f.kind !== 'boolean' && f.kind !== 'list',
    );
  }

  protected metaBooleans(): readonly FieldDef[] {
    return this.def().fields.filter(f => f.group === 'meta' && f.kind === 'boolean');
  }

  protected proseFields(): readonly FieldDef[] {
    return this.def().fields.filter(f => f.group === 'prose');
  }

  protected startEdit(): void {
    this.populate(this.item());
    this.error.set(null);
    this.editing.set(true);
  }

  protected cancel(): void {
    this.error.set(null);
    if (this.creating()) this.closeCreate.emit();
    else this.editing.set(false);
  }

  protected save(): void {
    const form = this.form();
    if (form.invalid || this.saving()) {
      form.markAllAsTouched();
      return;
    }
    const body = form.getRawValue() as Record<string, unknown>;
    const path = this.def().apiPath;
    const current = this.item();
    const call =
      this.creating() || !current
        ? this.content.create(path, body)
        : this.content.update(path, current.id, body);
    this.saving.set(true);
    this.error.set(null);
    call.subscribe({
      next: saved => {
        this.saving.set(false);
        this.editing.set(false);
        this.changed.emit(saved.id);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Could not save. Check the fields and try again.');
      },
    });
  }

  protected revert(): void {
    const it = this.item();
    if (!it?.overridesId) return;
    this.saving.set(true);
    this.content.revert(this.def().apiPath, it.overridesId).subscribe({
      next: base => {
        this.saving.set(false);
        this.changed.emit(base.id);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Could not revert.');
      },
    });
  }

  protected hide(): void {
    const it = this.item();
    if (!it) return;
    this.saving.set(true);
    this.content.hide(this.def().apiPath, it.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.changed.emit(null);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Could not hide.');
      },
    });
  }

  protected remove(): void {
    const it = this.item();
    if (!it) return;
    this.saving.set(true);
    this.content.remove(this.def().apiPath, it.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.changed.emit(null);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Could not delete.');
      },
    });
  }

  protected subtitle(item: CatalogItem): string {
    const d = this.def();
    return d.subtitle ? d.subtitle(item) : '';
  }

  protected hasValue(item: CatalogItem, f: FieldDef): boolean {
    const v = item[f.key];
    if (Array.isArray(v)) return v.length > 0;
    return v !== null && v !== undefined && String(v).trim() !== '';
  }

  protected display(item: CatalogItem, f: FieldDef): string {
    const v = item[f.key];
    if (Array.isArray(v)) return v.map(x => titleCase(String(x))).join(', ');
    if (f.kind === 'select' && f.options) {
      const opt = f.options.find(o => String(o.value) === String(v));
      if (opt) return opt.label;
    }
    return v == null ? '' : String(v);
  }

  protected booleanChips(item: CatalogItem): string[] {
    return this.def()
      .fields.filter(f => f.kind === 'boolean' && item[f.key] === true)
      .map(f => f.label);
  }

  private buildForm(def: ContentTypeDef): FormGroup {
    const controls: Record<string, FormControl> = {
      name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    };
    for (const f of def.fields) {
      const validators: ValidatorFn[] = [];
      if (f.required) validators.push(Validators.required);
      if (f.kind === 'number') {
        if (f.min != null) validators.push(Validators.min(f.min));
        if (f.max != null) validators.push(Validators.max(f.max));
      }
      controls[f.key] = new FormControl(this.initial(f), {
        nonNullable: f.kind === 'boolean',
        validators,
      });
    }
    return new FormGroup(controls);
  }

  private initial(f: FieldDef): unknown {
    if (f.kind === 'boolean') return false;
    if (f.kind === 'number') return null;
    if (f.kind === 'select') return f.required && f.options?.length ? f.options[0].value : '';
    return '';
  }

  private sync(): void {
    this.error.set(null);
    if (this.creating()) {
      this.populate(null);
      this.editing.set(true);
    } else {
      this.populate(this.item());
      this.editing.set(false);
    }
  }

  private populate(item: CatalogItem | null): void {
    const form = this.form();
    form.get('name')?.setValue(item?.name ?? '');
    for (const f of this.def().fields) {
      const ctrl = form.get(f.key);
      if (!ctrl) continue;
      const v = item ? item[f.key] : undefined;
      ctrl.setValue(v ?? this.initial(f));
    }
  }
}
