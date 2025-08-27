import { ShelvesComponent } from './shelves.component';
import { of } from 'rxjs';

class StoreStub {
  dispatch = jasmine.createSpy('dispatch');
  select() {
    return of([]);
  }
}

describe('ShelvesComponent', () => {
  it('dispatches loadShelves on near-bottom scroll', () => {
    const store = new StoreStub() as any;
    const comp = new ShelvesComponent(
      store,
      {} as any,
      {} as any,
      { events: of() } as any,
      { firstChild: null } as any
    );

    // Set internal state to allow paging
    (comp as any).loadingShelves = false;
    (comp as any).shelvesCount = 10;
    (comp as any).totalCount = 20;

    const target = {
      scrollTop: 800,
      clientHeight: 400,
      scrollHeight: 1200,
    } as any;

    comp['onListScroll']({ target } as any);
    expect(store.dispatch).toHaveBeenCalled();
  });
});
