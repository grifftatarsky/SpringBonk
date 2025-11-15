import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DashboardStore } from './dashboard.store';
import { ShelfWidgetComponent } from './widgets/shelf-widget.component';
import { ElectionWidgetComponent } from './widgets/election-widget.component';
import { AVATAR_OPTIONS, AvatarOption, findAvatarOption } from './avatar-options';
import { ProfileAvatarId } from '../../model/type/profile-avatar-id';
import { NotificationService } from '../../common/notification/notification.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  imports: [ShelfWidgetComponent, ElectionWidgetComponent, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly store: DashboardStore = inject(DashboardStore);
  private readonly notifications = inject(NotificationService);

  protected readonly vm = this.store.vm;
  protected readonly avatarOptions: readonly AvatarOption[] = AVATAR_OPTIONS;
  protected readonly selectedAvatar = computed(() => findAvatarOption(this.vm().avatar));
  protected readonly avatarPickerOpen = signal(false);
  protected readonly avatarSaving = signal(false);

  protected refreshProfile(): void {
    this.store.refreshProfile();
  }

  protected openAvatarPicker(): void {
    this.avatarPickerOpen.set(true);
  }

  protected closeAvatarPicker(): void {
    if (!this.avatarSaving()) {
      this.avatarPickerOpen.set(false);
    }
  }

  protected async selectAvatar(avatar: ProfileAvatarId): Promise<void> {
    if (this.avatarSaving()) return;
    this.avatarSaving.set(true);
    try {
      await this.store.setAvatar(avatar);
      this.notifications.success('Avatar updated');
      this.avatarPickerOpen.set(false);
    } catch {
      this.notifications.error('Unable to update avatar right now.');
    } finally {
      this.avatarSaving.set(false);
    }
  }
}
