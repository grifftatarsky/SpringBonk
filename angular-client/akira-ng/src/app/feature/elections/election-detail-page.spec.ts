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
  maxNominationsPerUser: null,
  maxNominationsTotal: null,
};

const closedElection: ElectionResponse = {
  id: 'e1',
  title: 'Test Election',
  status: 'CLOSED',
  endDateTime: '2025-06-01T12:00:00Z',
  createDate: '2025-01-01T00:00:00Z',
  maxNominationsPerUser: null,
  maxNominationsTotal: null,
};

const mockBook: OpenLibraryBookResponse = {
  key: '/works/OL1W',
  title: 'Dune',
  author_name: ['Frank Herbert'],
  cover_i: undefined,
};

// ---------------------------------------------------------------------------
// View-model shapes, derived from the store so they cannot drift out of sync.
// (The store's VM interfaces are module-local, so read them off the signals.)
// ---------------------------------------------------------------------------

type ElectionVm = ReturnType<ElectionDetailStore['electionVm']>;
type CandidatesVm = ReturnType<ElectionDetailStore['candidatesVm']>;
type ResultsVm = ReturnType<ElectionDetailStore['resultsVm']>;
type MyNominationsVm = ReturnType<ElectionDetailStore['myNominationsVm']>;
type ShelfOptionsVm = ReturnType<ElectionDetailStore['shelfOptionsVm']>;

function electionVm(overrides: Partial<ElectionVm> = {}): ElectionVm {
  return {
    election: openElection,
    loading: false,
    error: null,
    notFound: false,
    badgeTone: 'emerald',
    statusLabel: 'Open',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Store stubs
// ---------------------------------------------------------------------------

// `implements` keeps the stub honest: when the store's API changes, this fails
// to compile instead of the page throwing inside the TestBed at runtime.
class ElectionDetailStoreStub
  implements
    Pick<
      ElectionDetailStore,
      | 'electionVm'
      | 'candidatesVm'
      | 'resultsVm'
      | 'myNominationsVm'
      | 'shelfOptionsVm'
      | 'init'
      | 'nominateFromOpenLibrary'
      | 'nominateCustomBook'
      | 'nominateExistingBook'
      | 'removeCandidate'
      | 'updateCandidatePitch'
      | 'reorderBallot'
      | 'clearBallot'
      | 'deleteElection'
      | 'reopenElection'
      | 'closeElection'
      | 'refreshCandidates'
      | 'refreshVotes'
      | 'refreshResults'
      | 'selectShelfForExisting'
    >
{
  readonly electionVm = signal<ElectionVm>(electionVm());

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

  readonly myNominationsVm = signal({
    items: [] as any[],
    count: 0,
    hasAny: false,
  });

  readonly shelfOptionsVm = signal({
    shelves: [] as any[],
    loading: false,
    error: null as string | null,
    selectedShelfId: null as string | null,
    books: [] as any[],
    booksLoading: false,
    booksError: null as string | null,
  });

  readonly nominateFromOpenLibrary = vi.fn()
    .mockResolvedValue(undefined);

  readonly nominateCustomBook = vi.fn().mockResolvedValue(undefined);
  readonly nominateExistingBook = vi.fn().mockResolvedValue(undefined);
  readonly removeCandidate = vi.fn().mockResolvedValue(undefined);
  readonly reorderBallot = vi.fn().mockResolvedValue(undefined);
  readonly clearBallot = vi.fn().mockResolvedValue(undefined);
  readonly deleteElection = vi.fn().mockResolvedValue(true);
  readonly reopenElection = vi.fn().mockResolvedValue(undefined);
  readonly closeElection = vi.fn().mockResolvedValue(undefined);
  readonly refreshCandidates = vi.fn();
  readonly refreshVotes = vi.fn();
  readonly refreshResults = vi.fn();
  readonly selectShelfForExisting = vi.fn().mockResolvedValue(undefined);
  readonly updateCandidatePitch = vi.fn().mockResolvedValue(undefined);
  readonly init = vi.fn();
}

// Mirrors BookSearchStore.vm. `pending` (typing || loading) and `statusLabel`
// drive the modal's in-flight states, so stubs must carry them.
interface SearchVm {
  query: string;
  typing: boolean;
  loading: boolean;
  pending: boolean;
  statusLabel: string | null;
  error: string | null;
  results: OpenLibraryBookResponse[];
  total: number;
  canLoadMore: boolean;
  queryTooShort: boolean;
  validationMessage: string | null;
}

function searchVm(overrides: Partial<SearchVm> = {}): SearchVm {
  return {
    query: '',
    typing: false,
    loading: false,
    pending: false,
    statusLabel: null,
    error: null,
    results: [],
    total: 0,
    canLoadMore: false,
    queryTooShort: false,
    validationMessage: null,
    ...overrides,
  };
}

class BookSearchStoreStub implements Pick<BookSearchStore, 'vm' | 'setQuery' | 'search' | 'loadMore'> {
  readonly vm = signal<SearchVm>(searchVm());

  readonly setQuery = vi.fn();
  readonly search = vi.fn().mockResolvedValue(undefined);
  readonly loadMore = vi.fn().mockResolvedValue(undefined);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function click(el: Element | null | undefined): void {
  if (!el) throw new Error('click(): element not found');
  (el as HTMLElement).click();
}

/** Click the button in `scope` whose trimmed text matches, or fail loudly. */
function clickButton(
  fixture: ComponentFixture<unknown>,
  scope: string,
  match: (text: string) => boolean,
  label: string,
): void {
  const btn = qAll<HTMLButtonElement>(fixture, scope).find((b) =>
    match((b.textContent ?? '').trim()),
  );
  if (!btn) throw new Error(`clickButton(): no ${scope} button matching ${label}`);
  btn.click();
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

  /**
   * Opens the Open Library search modal the way the UI does: the nominate
   * menu ("+ Add book") on the Nominate candidates section, then its
   * "From Open Library" item. (The Manage menu holds reopen/delete only.)
   */
  function openModal(): void {
    clickButton(fixture, 'section button', (t) => t === '+ Add book', '"+ Add book"');
    fixture.detectChanges();

    clickButton(fixture, '.absolute button', (t) => t.includes('Open Library'), '"Open Library"');
    fixture.detectChanges();
  }

  // -------------------------------------------------------------------------
  // Rendering basics
  // -------------------------------------------------------------------------

  it('renders the election title', () => {
    const h1 = q(fixture, 'h1');
    expect(h1?.textContent).toContain('Test Election');
  });

  it('shows the ballot section once the election has candidates to rank', () => {
    const item = {
      id: 'c1',
      title: 'Dune',
      author: 'Frank Herbert',
      cover: '',
      blurb: '',
      votes: 0,
      bookId: 'b1',
      userRank: null,
      nominatorId: 'u1',
      mine: false,
    };
    detailStore.candidatesVm.set({
      items: [item],
      loading: false,
      error: null,
      votesLoading: false,
      votesError: null,
      reorderBusy: false,
      rankedItems: [],
      unrankedItems: [item],
    });
    fixture.detectChanges();

    const h2s = qAll<HTMLHeadingElement>(fixture, 'h2');
    const ballotHeading = h2s.find((h) => h.textContent?.includes('Rank your ballot'));
    expect(ballotHeading).toBeTruthy();
  });

  it('shows the results section when the election is closed', () => {
    detailStore.electionVm.set(
      electionVm({ election: closedElection, badgeTone: 'amber', statusLabel: 'Closed' }),
    );
    fixture.detectChanges();

    const h2s = qAll<HTMLHeadingElement>(fixture, 'h2');
    expect(h2s.find((h) => h.textContent?.includes('Results'))).toBeTruthy();
  });

  it('shows the closed-on date in the results header for a closed election', () => {
    detailStore.electionVm.set(
      electionVm({ election: closedElection, badgeTone: 'amber', statusLabel: 'Closed' }),
    );
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Closed on');
  });

  // -------------------------------------------------------------------------
  // Search modal — open / close
  // -------------------------------------------------------------------------

  describe('search modal', () => {
    it('is not rendered before being opened', () => {
      expect(q(fixture, '[role="dialog"]')).toBeNull();
    });

    it('shows a search input when first opened', () => {
      openModal();
      expect(q<HTMLInputElement>(fixture, '[role="dialog"] input[type="search"]')).toBeTruthy();
    });

    it('resets search state by calling search("") when opened', () => {
      searchStore.search.mockClear();
      openModal();
      expect(searchStore.search).toHaveBeenCalledWith('');
    });

    it('closes when the Close button is clicked', () => {
      openModal();
      click(q(fixture, '[role="dialog"] button[aria-label="Close"]'));
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
    function setResults(results: OpenLibraryBookResponse[]): void {
      searchStore.vm.set(searchVm({ query: 'dune', results, total: results.length }));
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

      clickButton(fixture, '[role="dialog"] button', (t) => t.includes('Back'), '"Back"');
      fixture.detectChanges();

      expect(q(fixture, '[role="dialog"] input[type="search"]')).toBeTruthy();
      expect(q(fixture, '[role="dialog"] textarea')).toBeNull();
    });

    it('calls nominateFromOpenLibrary with the selected book on confirm', async () => {
      openModal();
      setResults([mockBook]);
      click(q(fixture, '[role="dialog"] ul button'));
      fixture.detectChanges();

      clickButton(fixture, '[role="dialog"] button', (t) => t === 'Nominate', '"Nominate"');

      await wait();

      expect(detailStore.nominateFromOpenLibrary).toHaveBeenCalledWith(
        mockBook,
        expect.any(String),
      );
    });

    it('closes the modal after successful nomination', async () => {
      openModal();
      setResults([mockBook]);
      click(q(fixture, '[role="dialog"] ul button'));
      fixture.detectChanges();

      clickButton(fixture, '[role="dialog"] button', (t) => t === 'Nominate', '"Nominate"');

      await wait();
      fixture.detectChanges();

      expect(q(fixture, '[role="dialog"]')).toBeNull();
    });

    it('does not call nominateFromOpenLibrary without a selected book', () => {
      openModal();
      // No book selected
      expect(detailStore.nominateFromOpenLibrary).not.toHaveBeenCalled();
    });

    it('shows the searching status while a query is in flight', () => {
      openModal();
      searchStore.vm.set(
        searchVm({ query: 'dune', loading: true, pending: true, statusLabel: 'Searching…' }),
      );
      fixture.detectChanges();

      const status = q(fixture, '[role="dialog"] [role="status"]');
      expect(status?.textContent).toContain('Searching');
    });

    it('shows a no-results message when search returns empty', () => {
      openModal();
      searchStore.vm.set(searchVm({ query: 'xyzxyz' }));
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).textContent).toContain('No results');
    });

    it('shows the validation message when query is too short', () => {
      openModal();
      searchStore.vm.set(
        searchVm({
          query: 'ab',
          queryTooShort: true,
          validationMessage: 'Search requires at least 3 characters',
        }),
      );
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

      clickButton(fixture, '[role="dialog"] button', (t) => t.includes('Load more'), '"Load more"');

      expect(searchStore.loadMore).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Closed election results display
  // -------------------------------------------------------------------------

  describe('closed election results', () => {
    beforeEach(() => {
      detailStore.electionVm.set(
        electionVm({ election: closedElection, badgeTone: 'amber', statusLabel: 'Closed' }),
      );
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
                totalVotes: 5,
                eliminationMessage: null,
                maxVotes: 3,
                rows: [
                  { candidateId: 'c1', candidateName: 'Dune', votes: 3, eliminated: false, isWinner: true, widthPct: 100 },
                  { candidateId: 'c2', candidateName: 'Neuromancer', votes: 2, eliminated: true, isWinner: false, widthPct: 67 },
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

    it('shows the decided-on closure timestamp', () => {
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('decided');
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
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Round by round');
    });

    it('renders one round card per round', () => {
      const label = qAll(fixture, 'p').find((el) => el.textContent?.trim() === 'Round by round');
      expect(label, 'round-by-round section should be present').toBeTruthy();
      expect(label!.nextElementSibling?.children.length).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Command menu (open / close)
  // -------------------------------------------------------------------------

  describe('command menu', () => {
    function openMenu(): void {
      clickButton(fixture, 'section button', (t) => t === 'Manage', '"Manage"');
      fixture.detectChanges();
    }

    it('opens when the Manage button is clicked', () => {
      openMenu();
      // Dropdown is the first absolute-positioned div that appears
      expect(q(fixture, '.absolute.right-0.top-full')).toBeTruthy();
    });

    it('closes when clicking the page backdrop', () => {
      openMenu();

      click(q(fixture, '.fixed.inset-0.z-20'));
      fixture.detectChanges();

      expect(q(fixture, '.absolute.right-0.top-full')).toBeNull();
    });

    it('closes on Escape', () => {
      openMenu();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();

      expect(q(fixture, '.absolute.right-0.top-full')).toBeNull();
    });
  });
});
