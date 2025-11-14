import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Dashboard } from './dashboard';
import { DashboardStore, DashboardViewModel } from './dashboard.store';
import { ShelfWidgetStore } from './widgets/shelf-widget.store';
import { ElectionWidgetStore } from './widgets/election-widget.store';

class DashboardStoreStub {
  readonly vm = signal<DashboardViewModel>({
    id: 'user-123',
    name: 'Jane Doe',
    email: 'jane@example.com',
    roles: ['reader', 'organizer'],
    initials: 'JD',
    isAuthenticated: true,
    statusLabel: 'Session active',
    helperText: 'Helper text',
  });

  readonly refreshProfile = jasmine.createSpy('refreshProfile');
}

class ShelfWidgetStoreStub {
  readonly vm = signal({
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

  readonly sortOptions: any[] = [];
}

class ElectionWidgetStoreStub {
  readonly vm = signal({
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

  readonly sortOptions: any[] = [];
}

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;
  let store: DashboardStoreStub;

  beforeEach(async () => {
    store = new DashboardStoreStub();

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: DashboardStore, useValue: store },
        { provide: ShelfWidgetStore, useValue: new ShelfWidgetStoreStub() },
        { provide: ElectionWidgetStore, useValue: new ElectionWidgetStoreStub() },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
  });

  it('renders user profile details', () => {
    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('[data-testid="profile-name"]')?.textContent)
      .withContext('name text should be visible')
      .toContain('Jane Doe');
    expect(compiled.querySelector('[data-testid="profile-email"]')?.textContent)
      .withContext('email text should be visible')
      .toContain('jane@example.com');

    const roleChips = compiled.querySelectorAll('[data-testid="profile-role-pill"]');
    expect(roleChips.length)
      .withContext('role chips should exist for each role')
      .toBe(2);
  });

  it('refreshes the profile when requested', () => {
    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;
    const refreshButton = compiled.querySelector('[data-testid="profile-refresh"]') as HTMLButtonElement;

    refreshButton.click();

    expect(store.refreshProfile).toHaveBeenCalled();
  });
});
