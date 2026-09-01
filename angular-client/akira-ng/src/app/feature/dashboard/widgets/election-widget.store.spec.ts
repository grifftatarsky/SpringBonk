import { TestBed } from '@angular/core/testing';
import { createSpyObj, type SpyObj } from '../../../testing/mock';
import { provideZonelessChangeDetection } from '@angular/core';
import { ElectionWidgetStore } from './election-widget.store';
import { ElectionHttpService } from '../../../common/http/election-http.service';
import { ElectionResponse } from '../../../model/response/election-response.model';
import { of, throwError } from 'rxjs';

const baseElection: ElectionResponse = {
  id: '1',
  title: 'Monthly Pick',
  endDateTime: '2025-11-20T00:00:00Z',
  createDate: '2025-11-01T00:00:00Z',
  status: 'OPEN',
  maxNominationsPerUser: null,
  maxNominationsTotal: null,
};

describe('ElectionWidgetStore', () => {
  let store: ElectionWidgetStore;
  let http: SpyObj<ElectionHttpService>;

  beforeEach(() => {
    // The store debounces its param stream by 75ms. Fake timers make that
    // deterministic instead of racing a real sleep against it.
    vi.useFakeTimers();

    http = createSpyObj<ElectionHttpService>(['getElectionsPage', 'getAllElections']);
    http.getElectionsPage.mockReturnValue(
      of({
        _embedded: { electionResponseList: [baseElection] },
        page: { number: 0, size: 5, totalElements: 1, totalPages: 1 },
      }),
    );
    http.getAllElections.mockReturnValue(of([baseElection]));

    TestBed.configureTestingModule({
      providers: [
        ElectionWidgetStore,
        { provide: ElectionHttpService, useValue: http },
        provideZonelessChangeDetection(),
      ],
    });

    store = TestBed.inject(ElectionWidgetStore);
    vi.spyOn(console, 'error');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exposes election data with status labels', async () => {
    await flush();
    const viewModel = store.vm();
    expect(viewModel.items[0].statusLabel).toBe('Open');
    expect(http.getElectionsPage).toHaveBeenCalled();
  });

  it('filters elections by title', async () => {
    http.getAllElections.mockReturnValue(
      of([
        baseElection,
        { ...baseElection, id: '2', title: 'Sci-Fi Finals', status: 'INDEFINITE' },
      ]),
    );

    store.setFilter('sci');
    await flush();

    const viewModel = store.vm();
    expect(viewModel.items.length).toBe(1);
    expect(viewModel.items[0].title).toContain('Sci-Fi');
  });

  it('handles load errors gracefully', async () => {
    http.getElectionsPage.mockReturnValue(throwError(() => new Error('boom')));
    store.setPageSize(10); // trigger reload
    await flush();
    expect(store.vm().error).toContain('Unable');
  });
});

/** Drive past the store's 75ms debounce and settle the resulting promises. */
async function flush(): Promise<void> {
  await vi.advanceTimersByTimeAsync(200);
}
