import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Dashboard } from './dashboard';
import { DashboardStore, DashboardViewModel } from './dashboard.store';
import { ShelfWidgetStore } from './widgets/shelf-widget.store';
import { ElectionWidgetStore } from './widgets/election-widget.store';
import { ActivityHttpService } from '../../common/http/activity-http.service';
import { ReviewHttpService } from '../../common/http/review-http.service';
import { UserService } from '../../auth/user.service';
import { User } from '../../auth/user.model';
import { createSpyObj, type SpyObj } from '../../testing/mock';
import { BehaviorSubject, of } from 'rxjs';

// `implements` keeps the stub honest: if DashboardStore's API changes, this
// fails to compile instead of blowing up at runtime inside the TestBed.
class DashboardStoreStub implements Pick<DashboardStore, 'vm' | 'setAvatar'> {
  readonly vm = signal<DashboardViewModel>({
    id: 'user-123',
    name: 'Jane Doe',
    email: 'jane@example.com',
    roles: ['reader', 'organizer'],
    initials: 'JD',
    isAuthenticated: true,
    statusLabel: 'Session active',
    helperText: 'Helper text',
    avatar: 'BONKLING_PLUM',
  });

  readonly setAvatar = vi.fn();
}

type ShelfWidgetVm = ReturnType<ShelfWidgetStore['vm']>;
type ElectionWidgetVm = ReturnType<ElectionWidgetStore['vm']>;

class ShelfWidgetStoreStub implements Pick<ShelfWidgetStore, 'vm' | 'sortOptions'> {
  readonly vm = signal<ShelfWidgetVm>({
    items: [],
    page: { number: 0, size: 5, totalElements: 0, totalPages: 1 },
    busy: false,
    filter: '',
    error: null,
    sortField: 'title',
    sortDirection: 'asc',
    sortOptions: [],
    emptyMessage: 'No shelves',
  });

  readonly sortOptions = [];
}

class ElectionWidgetStoreStub implements Pick<ElectionWidgetStore, 'vm' | 'sortOptions'> {
  readonly vm = signal<ElectionWidgetVm>({
    items: [],
    page: { number: 0, size: 5, totalElements: 0, totalPages: 1 },
    busy: false,
    filter: '',
    error: null,
    sortField: 'title',
    sortDirection: 'asc',
    sortOptions: [],
    emptyMessage: 'No elections',
  });

  readonly sortOptions = [];
}

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;
  let store: DashboardStoreStub;
  let activityHttp: SpyObj<ActivityHttpService>;
  let reviewHttp: SpyObj<ReviewHttpService>;

  beforeEach(async () => {
    store = new DashboardStoreStub();

    // Dashboard renders ActivityWidgetComponent and MyReviewsWidgetComponent,
    // which inject their HTTP services directly (no store to stub) and fetch
    // on init.
    activityHttp = createSpyObj<ActivityHttpService>(['getFeed']);
    activityHttp.getFeed.mockReturnValue(of([]));

    reviewHttp = createSpyObj<ReviewHttpService>(['getReviewsByAuthor']);
    reviewHttp.getReviewsByAuthor.mockReturnValue(
      of({ content: [], page: { number: 0, size: 5, totalElements: 0, totalPages: 1 } }),
    );

    // The reviews widget resolves its author from UserService; the real one
    // fires an HTTP call from its constructor.
    const currentUser = new User('user-123', 'Jane Doe', 'jane@example.com', [], 'BONKLING_PLUM');
    const userService = {
      valueChanges: new BehaviorSubject<User>(currentUser).asObservable(),
      current: currentUser,
    } as unknown as UserService;

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: DashboardStore, useValue: store },
        { provide: ShelfWidgetStore, useValue: new ShelfWidgetStoreStub() },
        { provide: ElectionWidgetStore, useValue: new ElectionWidgetStoreStub() },
        { provide: ActivityHttpService, useValue: activityHttp },
        { provide: ReviewHttpService, useValue: reviewHttp },
        { provide: UserService, useValue: userService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
  });

  it('renders user profile details', () => {
    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('[data-testid="profile-name"]')?.textContent, 'name text should be visible')
      .toContain('Jane Doe');
    expect(compiled.querySelector('[data-testid="profile-email"]')?.textContent, 'email text should be visible')
      .toContain('jane@example.com');

    const roleChips = compiled.querySelectorAll('[data-testid="profile-role-pill"]');
    expect(roleChips.length, 'role chips should exist for each role')
      .toBe(2);
  });
});
