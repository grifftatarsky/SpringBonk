import { TestBed } from '@angular/core/testing';
import { NominateToElectionDialogComponent } from './nominate-to-election-dialog.component';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

class MockElectionHttpService {
  getAllElections = jasmine.createSpy().and.returnValue(of([]));
}

class MockShelfHttpService {
  getUserShelves = jasmine.createSpy().and.returnValue(
    of([
      {
        id: 's1',
        title: 'Unshelved',
        createdDate: '',
        userID: 'u1',
        defaultShelf: true,
        books: [
          {
            id: 'b1',
            title: 'Book One',
            author: 'Author',
            imageURL: '',
            blurb: '',
            openLibraryId: 'olid1',
          },
        ],
      },
    ])
  );
}

class MockBookHttpService {
  getBooksByShelfId = jasmine.createSpy().and.returnValue(
    of([
      {
        id: 'b1',
        title: 'Book One',
        author: 'Author',
        imageURL: '',
        blurb: '',
        openLibraryId: 'olid1',
        shelves: [],
      },
    ])
  );
}

describe('NominateToElectionDialogComponent', () => {
  it('renders book nodes for shelf', async () => {
    const { ElectionHttpService } = await import('../../service/http/election-http.service');
    const { ShelfHttpService } = await import('../../service/http/shelves-http.service');
    const { BookHttpService } = await import('../../service/http/books-http.service');
    const { NotificationService } = await import('../../service/notification.service');

    await TestBed.configureTestingModule({
      imports: [NominateToElectionDialogComponent],
      providers: [
        provideAnimations(),
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: ElectionHttpService, useClass: MockElectionHttpService },
        { provide: ShelfHttpService, useClass: MockShelfHttpService },
        { provide: BookHttpService, useClass: MockBookHttpService },
        { provide: NotificationService, useValue: { success: () => {}, error: () => {} } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(NominateToElectionDialogComponent);
    const comp = fixture.componentInstance;
    comp.ngOnInit();
    fixture.detectChanges();

    // Expand first shelf to render its children
    const shelves = comp.data$.value;
    expect(shelves.length).toBeGreaterThan(0);
    comp.treeControl.expand(shelves[0] as any);
    fixture.detectChanges();

    const bookNodes = fixture.nativeElement.querySelectorAll('.book-node');
    expect(bookNodes.length).toBeGreaterThan(0);
  });
});

