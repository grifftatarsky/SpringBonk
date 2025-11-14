import { TestBed } from '@angular/core/testing';
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
};

describe('ElectionWidgetStore', () => {
  let store: ElectionWidgetStore;
  let http: jasmine.SpyObj<ElectionHttpService>;

  beforeEach(() => {
    http = jasmine.createSpyObj<ElectionHttpService>('ElectionHttpService', ['getElectionsPage', 'getAllElections']);
    http.getElectionsPage.and.returnValue(
      of({
        _embedded: { electionResponseList: [baseElection] },
        page: { number: 0, size: 5, totalElements: 1, totalPages: 1 },
      }),
    );
    http.getAllElections.and.returnValue(of([baseElection]));

    TestBed.configureTestingModule({
      providers: [
        ElectionWidgetStore,
        { provide: ElectionHttpService, useValue: http },
        provideZonelessChangeDetection(),
      ],
    });

    store = TestBed.inject(ElectionWidgetStore);
    spyOn(console, 'error');
  });

  it('exposes election data with status labels', async () => {
    await wait(150);
    const viewModel = store.vm();
    expect(viewModel.items[0].statusLabel).toBe('Open');
    expect(http.getElectionsPage).toHaveBeenCalled();
  });

  it('filters elections by title', async () => {
    http.getAllElections.and.returnValue(
      of([
        baseElection,
        { ...baseElection, id: '2', title: 'Sci-Fi Finals', status: 'INDEFINITE' },
      ]),
    );

    store.setFilter('sci');
    await wait(150);

    const viewModel = store.vm();
    expect(viewModel.items.length).toBe(1);
    expect(viewModel.items[0].title).toContain('Sci-Fi');
  });

  it('handles load errors gracefully', async () => {
    http.getElectionsPage.and.returnValue(throwError(() => new Error('boom')));
    store.setPageSize(10); // trigger reload
    await wait(150);
    expect(store.vm().error).toContain('Unable');
  });
});

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
