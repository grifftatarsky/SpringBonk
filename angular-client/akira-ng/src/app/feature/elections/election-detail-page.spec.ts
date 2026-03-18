import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ElectionDetailPage } from './election-detail-page';
import { ElectionDetailStore } from './election-detail.store';
import { BookSearchStore } from '../shelves/book-search.store';
import { OpenLibraryBookResponse } from '../../model/response/open-library-book-response.model';
import { ElectionResponse } from '../../model/response/election-response.model';

// ---------------------------------------------------------------------------
// Minimal fixture data
// ---------------------------------------------------------------------------

const openElection: ElectionResponse = {
  id: 'e1',
  title: 'Test Election',
  status: 'OPEN',
  endDateTime: null,
  createDate: '2025-01-01T00:00:00Z',
};

const closedElection: ElectionResponse = {
  id: 'e1',
  title: 'Test Election',
  status: 'CLOSED',
  endDateTime: '2025-06-01T12:00:00Z',
  createDate: '2025-01-01T00:00:00Z',
};

const mockBook: OpenLibraryBookResponse = {
  key: '/works/OL1W',
  title: 'Dune',
  author_name: ['Frank Herbert'],
  cover_i: undefined,
};

// ---------------------------------------------------------------------------
// Local shape mirrors (to avoid importing private interfaces from the store)
// ---------------------------------------------------------------------------

interface ElectionVm {
  election: ElectionResponse | null;
  loading: boolean;
  error: string | null;
  badgeTone: 'emerald' | 'amber' | 'sky';
  statusLabel: string;
}

interface ResultsVm {
  items: Array<{
    id: string;
    winnerId: string | null;
    winnerName: string;
    totalVotes: number;
    closureTime: string;
    flags: string[];
    rounds: Array<{
      roundNumber: number;
      eliminationMessage: string | null;
      rows: Array<{ candidateId: string; candidateName: string; votes: number; eliminated: boolean }>;
    }>;
  }>;
  loading: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Store stubs
// ---------------------------------------------------------------------------

class ElectionDetailStoreStub {
  readonly electionVm = signal<ElectionVm>({
    election: openElection,
    loading: false,
    error: null,
    badgeTone: 'emerald',
    statusLabel: 'Open',
  });

  readonly candidatesVm = signal({
    items: [] as any[],
    loading: false,
    error: null as string | null,
    votesLoading: false,
    votesError: null as string | null,
    reorderBusy: false,
    rankedItems: [] as any[],
    unrankedItems: [] as any[],
  });

  readonly resultsVm = signal<ResultsVm>({ items: [], loading: false, error: null });

  readonly shelfOptionsVm = signal({
    shelves: [] as any[],
    loading: false,
    error: null as string | null,
    selectedShelfId: null as string | null,
    books: [] as any[],
    booksLoading: false,
    booksError: null as string | null,
  });

  readonly nominateFromOpenLibrary = jasmine
    .createSpy('nominateFromOpenLibrary')
    .and.resolveTo(undefined);

  readonly nominateCustomBook = jasmine.createSpy('nominateCustomBook').and.resolveTo(undefined);
  readonly nominateExistingBook = jasmine.createSpy('nominateExistingBook').and.resolveTo(undefined);
  readonly removeCandidate = jasmine.createSpy('removeCandidate').and.resolveTo(undefined);
  readonly reorderBallot = jasmine.createSpy('reorderBallot').and.resolveTo(undefined);
  readonly clearBallot = jasmine.createSpy('clearBallot').and.resolveTo(undefined);
  readonly deleteElection = jasmine.createSpy('deleteElection').and.resolveTo(true);
  readonly reopenElection = jasmine.createSpy('reopenElection').and.resolveTo(undefined);
  readonly closeElection = jasmine.createSpy('closeElection').and.resolveTo(undefined);
  readonly refreshCandidates = jasmine.createSpy('refreshCandidates');
  readonly refreshVotes = jasmine.createSpy('refreshVotes');
  readonly refreshResults = jasmine.createSpy('refreshResults');
  readonly selectShelfForExisting = jasmine.createSpy('selectShelfForExisting').and.resolveTo(undefined);
  readonly setCandidateRank = jasmine.createSpy('setCandidateRank').and.resolveTo(undefined);
  readonly init = jasmine.createSpy('init');
}

class BookSearchStoreStub {
  readonly vm = signal({
    query: '',
    loading: false,
    error: null as string | null,
    results: [] as OpenLibraryBookResponse[],
    total: 0,
    canLoadMore: false,
    queryTooShort: false,
    validationMessage: null as string | null,
  });

  readonly search = jasmine.createSpy('search').and.resolveTo(undefined);
  readonly loadMore = jasmine.createSpy('loadMore').and.resolveTo(undefined);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function click(el: Element | null): void {
  (el as HTMLElement).click();
}

function q<T extends Element>(fixture: ComponentFixture<unknown>, selector: string): T | null {
  return (fixture.nativeElement as HTMLElement).querySelector<T>(selector);
}

function qAll<T extends Element>(fixture: ComponentFixture<unknown>, selector: string): T[] {
  return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<T>(selector));
}

function wait(ms = 10): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('ElectionDetailPage', () => {
  let fixture: ComponentFixture<ElectionDetailPage>;
  let detailStore: ElectionDetailStoreStub;
  let searchStore: BookSearchStoreStub;

  beforeEach(async () => {
    detailStore = new ElectionDetailStoreStub();
    searchStore = new BookSearchStoreStub();

    await TestBed.configureTestingModule({
      imports: [ElectionDetailPage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
      ],
    })
    // Override the component's own providers[] so our stubs are injected
    // instead of the real stores that would try to inject HttpClient etc.
    .overrideComponent(ElectionDetailPage, {
      set: {
        providers: [
          { provide: ElectionDetailStore, useValue: detailStore },
          { provide: BookSearchStore, useValue: searchStore },
        ],
      },
    })
    .compileComponents();

    fixture = TestBed.createComponent(ElectionDetailPage);
    fixture.detectChanges();
  });

  // -------------------------------------------------------------------------
  // Rendering basics
  // -------------------------------------------------------------------------

  it('renders the election title', () => {
    const h1 = q(fixture, 'h1');
    expect(h1?.textContent).toContain('Test Election');
  });

  it('shows the ballot section when the election is open', () => {
    const h2s = qAll<HTMLHeadingElement>(fixture, 'h2');
    const ballotHeading = h2s.find((h) => h.textContent?.includes('Arrange your ballot'));
    expect(ballotHeading).toBeTruthy();
  });

  it('shows the results section when the election is closed', () => {
    detailStore.electionVm.set({
      election: closedElection,
      loading: false,
      error: null,
      badgeTone: 'amber',
      statusLabel: 'Closed',
    });
    fixture.detectChanges();

    const h2s = qAll<HTMLHeadingElement>(fixture, 'h2');
    expect(h2s.find((h) => h.textContent?.includes('Results'))).toBeTruthy();
  });

  it('shows the closed-on date in the results header for a closed election', () => {
    detailStore.electionVm.set({
      election: closedElection,
      loading: false,
      error: null,
      badgeTone: 'amber',
      statusLabel: 'Closed',
    });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Closed on');
  });

  // -------------------------------------------------------------------------
  // Search modal — open / close
  // -------------------------------------------------------------------------

  describe('search modal', () => {
    function openModal(): void {
      const menuToggle = qAll<HTMLButtonElement>(fixture, 'section button').find(
        (b) => b.textContent?.trim() === 'Menu',
      );
      menuToggle?.click();
      fixture.detectChanges();

      const menuItems = qAll<HTMLButtonElement>(fixture, '.absolute button');
      menuItems.find((b) => b.textContent?.includes('Open Library'))?.click();
      fixture.detectChanges();
    }

    it('is not rendered before being opened', () => {
      expect(q(fixture, '[role="dialog"]')).toBeNull();
    });

    it('shows a search input when first opened', () => {
      openModal();
      expect(q<HTMLInputElement>(fixture, '[role="dialog"] input[type="search"]')).toBeTruthy();
    });

    it('resets search state by calling search("") when opened', () => {
      searchStore.search.calls.reset();
      openModal();
      expect(searchStore.search).toHaveBeenCalledWith('');
    });

    it('closes when the Close button is clicked', () => {
      openModal();
      const closeBtn = qAll<HTMLButtonElement>(fixture, '[role="dialog"] button').find(
        (b) => b.textContent?.trim() === 'Close',
      );
      closeBtn?.click();
      fixture.detectChanges();
      expect(q(fixture, '[role="dialog"]')).toBeNull();
    });

    it('closes on Escape keydown', () => {
      openModal();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();
      expect(q(fixture, '[role="dialog"]')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Two-step search flow
  // -------------------------------------------------------------------------

  describe('two-step search flow', () => {
    function openModal(): void {
      qAll<HTMLButtonElement>(fixture, 'section button')
        .find((b) => b.textContent?.trim() === 'Menu')
        ?.click();
      fixture.detectChanges();
      qAll<HTMLButtonElement>(fixture, '.absolute button')
        .find((b) => b.textContent?.includes('Open Library'))
        ?.click();
      fixture.detectChanges();
    }

    function setResults(results: OpenLibraryBookResponse[]): void {
      searchStore.vm.set({
        query: 'dune',
        loading: false,
        error: null,
        results,
        total: results.length,
        canLoadMore: false,
        queryTooShort: false,
        validationMessage: null,
      });
      fixture.detectChanges();
    }

    it('shows placeholder text when no query is entered', () => {
      openModal();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Start typing');
    });

    it('shows search results as clickable buttons', () => {
      openModal();
      setResults([mockBook]);
      const resultBtns = qAll<HTMLButtonElement>(fixture, '[role="dialog"] ul button');
      expect(resultBtns.length).toBe(1);
      expect(resultBtns[0].textContent).toContain('Dune');
    });

    it('advances to step 2 (pitch + confirm) when a result is clicked', () => {
      openModal();
      setResults([mockBook]);
      click(q(fixture, '[role="dialog"] ul button'));
      fixture.detectChanges();

      expect(q(fixture, '[role="dialog"] textarea')).toBeTruthy();
      expect(
        qAll<HTMLButtonElement>(fixture, '[role="dialog"] button').find(
          (b) => b.textContent?.trim() === 'Nominate',
        ),
      ).toBeTruthy();
    });

    it('shows selected book title and author in the confirmation card', () => {
      openModal();
      setResults([mockBook]);
      click(q(fixture, '[role="dialog"] ul button'));
      fixture.detectChanges();

      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('Dune');
      expect(text).toContain('Frank Herbert');
    });

    it('updates the modal heading to "Nominate book" in step 2', () => {
      openModal();
      setResults([mockBook]);
      click(q(fixture, '[role="dialog"] ul button'));
      fixture.detectChanges();

      const h2 = q<HTMLHeadingElement>(fixture, '[role="dialog"] h2');
      expect(h2?.textContent).toContain('Nominate book');
    });

    it('returns to step 1 when Back is clicked', () => {
      openModal();
      setResults([mockBook]);
      click(q(fixture, '[role="dialog"] ul button'));
      fixture.detectChanges();

      qAll<HTMLButtonElement>(fixture, '[role="dialog"] button')
        .find((b) => b.textContent?.includes('Back'))
        ?.click();
      fixture.detectChanges();

      expect(q(fixture, '[role="dialog"] input[type="search"]')).toBeTruthy();
      expect(q(fixture, '[role="dialog"] textarea')).toBeNull();
    });

    it('calls nominateFromOpenLibrary with the selected book on confirm', async () => {
      openModal();
      setResults([mockBook]);
      click(q(fixture, '[role="dialog"] ul button'));
      fixture.detectChanges();

      qAll<HTMLButtonElement>(fixture, '[role="dialog"] button')
        .find((b) => b.textContent?.trim() === 'Nominate')
        ?.click();

      await wait();

      expect(detailStore.nominateFromOpenLibrary).toHaveBeenCalledWith(
        mockBook,
        jasmine.any(String),
      );
    });

    it('closes the modal after successful nomination', async () => {
      openModal();
      setResults([mockBook]);
      click(q(fixture, '[role="dialog"] ul button'));
      fixture.detectChanges();

      qAll<HTMLButtonElement>(fixture, '[role="dialog"] button')
        .find((b) => b.textContent?.trim() === 'Nominate')
        ?.click();

      await wait();
      fixture.detectChanges();

      expect(q(fixture, '[role="dialog"]')).toBeNull();
    });

    it('does not call nominateFromOpenLibrary without a selected book', () => {
      openModal();
      // No book selected
      expect(detailStore.nominateFromOpenLibrary).not.toHaveBeenCalled();
    });

    it('shows a loading spinner while searching', () => {
      openModal();
      searchStore.vm.set({
        query: 'dune',
        loading: true,
        error: null,
        results: [],
        total: 0,
        canLoadMore: false,
        queryTooShort: false,
        validationMessage: null,
      });
      fixture.detectChanges();

      // The pulsing spinner uses animate-ping class
      expect(q(fixture, '[role="dialog"] .animate-ping')).toBeTruthy();
    });

    it('shows a no-results message when search returns empty', () => {
      openModal();
      searchStore.vm.set({
        query: 'xyzxyz',
        loading: false,
        error: null,
        results: [],
        total: 0,
        canLoadMore: false,
        queryTooShort: false,
        validationMessage: null,
      });
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).textContent).toContain('No results');
    });

    it('shows the validation message when query is too short', () => {
      openModal();
      searchStore.vm.set({
        query: 'ab',
        loading: false,
        error: null,
        results: [],
        total: 0,
        canLoadMore: false,
        queryTooShort: true,
        validationMessage: 'Search requires at least 3 characters',
      });
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).textContent).toContain(
        'Search requires at least 3 characters',
      );
    });

    it('shows a Load more button when canLoadMore is true', () => {
      openModal();
      setResults([mockBook]);
      searchStore.vm.update((v) => ({ ...v, canLoadMore: true, total: 99 }));
      fixture.detectChanges();

      const loadMore = qAll<HTMLButtonElement>(fixture, '[role="dialog"] button').find(
        (b) => b.textContent?.includes('Load more'),
      );
      expect(loadMore).toBeTruthy();
    });

    it('calls loadMore when the Load more button is clicked', () => {
      openModal();
      setResults([mockBook]);
      searchStore.vm.update((v) => ({ ...v, canLoadMore: true, total: 99 }));
      fixture.detectChanges();

      qAll<HTMLButtonElement>(fixture, '[role="dialog"] button')
        .find((b) => b.textContent?.includes('Load more'))
        ?.click();

      expect(searchStore.loadMore).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Closed election results display
  // -------------------------------------------------------------------------

  describe('closed election results', () => {
    beforeEach(() => {
      detailStore.electionVm.set({
        election: closedElection,
        loading: false,
        error: null,
        badgeTone: 'amber',
        statusLabel: 'Closed',
      });
      detailStore.resultsVm.set({
        items: [
          {
            id: 'r1',
            winnerId: 'c1',
            winnerName: 'Dune',
            totalVotes: 5,
            closureTime: '2025-06-01T12:00:00Z',
            flags: [],
            rounds: [
              {
                roundNumber: 1,
                eliminationMessage: null,
                rows: [
                  { candidateId: 'c1', candidateName: 'Dune', votes: 3, eliminated: false },
                  { candidateId: 'c2', candidateName: 'Neuromancer', votes: 2, eliminated: true },
                ],
              },
            ],
          },
        ],
        loading: false,
        error: null,
      });
      fixture.detectChanges();
    });

    it('displays the winner name', () => {
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Dune');
    });

    it('displays the total vote count', () => {
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('5');
    });

    it('shows the "Decided" closure timestamp', () => {
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Decided');
    });

    it('shows an "Eliminated" badge for eliminated candidates', () => {
      const badges = qAll(fixture, 'li span.shrink-0');
      const eliminated = badges.find((b) => b.textContent?.includes('Eliminated'));
      expect(eliminated).toBeTruthy();
    });

    it('applies line-through to the eliminated candidate name', () => {
      const struckNames = qAll(fixture, 'li span.truncate.line-through');
      expect(struckNames.length).toBeGreaterThan(0);
      expect(struckNames[0].textContent).toContain('Neuromancer');
    });

    it('shows the round-by-round breakdown label', () => {
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Round-by-round');
    });

    it('renders one round card per round', () => {
      const roundCards = qAll(fixture, '.space-y-3 > div');
      expect(roundCards.length).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Command menu (open / close)
  // -------------------------------------------------------------------------

  describe('command menu', () => {
    function getMenuToggle(): HTMLButtonElement | undefined {
      return qAll<HTMLButtonElement>(fixture, 'section button').find(
        (b) => b.textContent?.trim() === 'Menu',
      );
    }

    it('opens when the Menu button is clicked', () => {
      getMenuToggle()?.click();
      fixture.detectChanges();
      // Dropdown is the first absolute-positioned div that appears
      expect(q(fixture, '.absolute.right-0.top-full')).toBeTruthy();
    });

    it('closes when clicking the page backdrop', () => {
      getMenuToggle()?.click();
      fixture.detectChanges();

      q<HTMLDivElement>(fixture, '.fixed.inset-0.z-20')?.click();
      fixture.detectChanges();

      expect(q(fixture, '.absolute.right-0.top-full')).toBeNull();
    });

    it('closes on Escape', () => {
      getMenuToggle()?.click();
      fixture.detectChanges();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();

      expect(q(fixture, '.absolute.right-0.top-full')).toBeNull();
    });
  });
});
