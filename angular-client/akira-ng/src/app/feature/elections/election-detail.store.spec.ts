import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ElectionDetailStore } from './election-detail.store';
import { ElectionHttpService } from '../../common/http/election-http.service';
import { BookHttpService } from '../../common/http/book-http.service';
import { NotificationService } from '../../common/notification/notification.service';
import { ShelfHttpService } from '../../common/http/shelf-http.service';
import { Observable, of, throwError } from 'rxjs';
import { ElectionResponse } from '../../model/response/election-response.model';
import { CandidateResponse } from '../../model/response/candidate-response.model';
import { VotingHttpService } from '../../common/http/voting-http.service';

const election: ElectionResponse = {
  id: 'e1',
  title: 'Demo Election',
  status: 'OPEN',
  endDateTime: null,
  createDate: '2025-01-01T00:00:00Z',
};

const candidate: CandidateResponse = {
  id: 'c1',
  base: { id: 'b1', title: 'Book', author: 'Author', imageURL: '', blurb: '', openLibraryId: '' },
  pitch: '',
  createdDate: '2025-01-01T00:00:00Z',
  electionId: 'e1',
  nominatorId: 'u1',
  votes: [],
};

const candidateTwo: CandidateResponse = {
  id: 'c2',
  base: { id: 'b2', title: 'Second Book', author: 'Another', imageURL: '', blurb: '', openLibraryId: '' },
  pitch: '',
  createdDate: '2025-01-02T00:00:00Z',
  electionId: 'e1',
  nominatorId: 'u2',
  votes: [],
};

describe('ElectionDetailStore', () => {
  let store: ElectionDetailStore;
  let electionHttp: jasmine.SpyObj<ElectionHttpService>;
  let bookHttp: jasmine.SpyObj<BookHttpService>;
  let shelfHttp: jasmine.SpyObj<ShelfHttpService>;
  let notifications: jasmine.SpyObj<NotificationService>;
  let votingHttp: jasmine.SpyObj<VotingHttpService>;

  beforeEach(() => {
    electionHttp = jasmine.createSpyObj<ElectionHttpService>('ElectionHttpService', [
      'getElection',
      'getCandidates',
      'nominateCandidate',
      'deleteCandidate',
      'getElectionResults',
      'reopenElection',
      'deleteElection',
      'closeElection',
    ]);
    bookHttp = jasmine.createSpyObj<BookHttpService>('BookHttpService', ['createBook', 'getOpenLibraryCoverImageUrl']);
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error']);
    shelfHttp = jasmine.createSpyObj<ShelfHttpService>('ShelfHttpService', ['getShelvesPage']);
    votingHttp = jasmine.createSpyObj<VotingHttpService>('VotingHttpService', [
      'getMyVotes',
      'voteForCandidate',
      'deleteVote',
    ]);

    electionHttp.getElection.and.returnValue(of(election));
    electionHttp.getCandidates.and.returnValue(of([candidate]));
    electionHttp.nominateCandidate.and.returnValue(of(candidate));
    bookHttp.createBook.and.returnValue(of({
      id: 'b1',
      title: 'Book',
      author: 'Author',
      imageURL: '',
      blurb: '',
      openLibraryId: '',
      shelves: [],
    }));
    bookHttp.getOpenLibraryCoverImageUrl.and.returnValue('');
    electionHttp.deleteCandidate.and.returnValue(of(void 0));
    electionHttp.getElectionResults.and.returnValue(of([]));
    electionHttp.reopenElection.and.returnValue(of(election));
    electionHttp.deleteElection.and.returnValue(of(void 0));
    electionHttp.closeElection.and.returnValue(of(void 0));
    shelfHttp.getShelvesPage.and.returnValue(
      of({ _embedded: { shelfResponseList: [] }, page: { number: 0, size: 8, totalElements: 0, totalPages: 1 } }),
    );
    votingHttp.getMyVotes.and.returnValue(of([]));
    votingHttp.voteForCandidate.and.returnValue(
      of({ id: 'v1', candidateId: 'c1', userId: 'u-current', rank: 1 }),
    );
    votingHttp.deleteVote.and.returnValue(of(void 0));

    TestBed.configureTestingModule({
      providers: [
        ElectionDetailStore,
        { provide: ElectionHttpService, useValue: electionHttp },
        { provide: BookHttpService, useValue: bookHttp },
        { provide: ShelfHttpService, useValue: shelfHttp },
        { provide: VotingHttpService, useValue: votingHttp },
        { provide: NotificationService, useValue: notifications },
        provideZonelessChangeDetection(),
      ],
    });

    store = TestBed.inject(ElectionDetailStore);
  });

  it('loads election and candidates', async () => {
    store.init('e1');
    await wait();
    expect(store.electionVm().election?.title).toBe('Demo Election');
    expect(store.candidatesVm().items.length).toBe(1);
    expect(votingHttp.getMyVotes).toHaveBeenCalledWith('e1');
  });

  it('nominates a custom book', async () => {
    store.init('e1');
    await wait();
    await store.nominateCustomBook({ title: 'New', author: 'Me', imageURL: '', blurb: '' });
    expect(bookHttp.createBook).toHaveBeenCalled();
  });

  it('records a vote when ranking a candidate', async () => {
    store.init('e1');
    await wait();

    await store.setCandidateRank('c1', 1);

    expect(votingHttp.voteForCandidate).toHaveBeenCalledWith('c1', 1);
    expect(store.candidatesVm().rankedItems[0]?.userRank).toBe(1);
  });

  it('removes a vote when clearing a rank', async () => {
    store.init('e1');
    await wait();

    await store.setCandidateRank('c1', null);

    expect(votingHttp.deleteVote).toHaveBeenCalledWith('c1');
  });

  it('reorders the ballot according to the provided order', async () => {
    electionHttp.getCandidates.and.returnValue(of([candidate, candidateTwo]));
    votingHttp.getMyVotes.and.returnValue(
      of([
        { id: 'v1', candidateId: 'c1', userId: 'u-current', rank: 1 },
        { id: 'v2', candidateId: 'c2', userId: 'u-current', rank: 2 },
      ]),
    );
    store.init('e1');
    await wait();

    votingHttp.voteForCandidate.calls.reset();

    await store.reorderBallot(['c2', 'c1']);

    expect(votingHttp.voteForCandidate).toHaveBeenCalledWith('c2', 1);
    expect(votingHttp.voteForCandidate).toHaveBeenCalledWith('c1', 2);
  });

  it('drops rankings when a candidate leaves the ballot', async () => {
    electionHttp.getCandidates.and.returnValue(of([candidate]));
    votingHttp.getMyVotes.and.returnValue(
      of([{ id: 'v1', candidateId: 'c1', userId: 'u-current', rank: 1 }]),
    );
    store.init('e1');
    await wait();

    votingHttp.deleteVote.calls.reset();

    await store.reorderBallot([]);

    expect(votingHttp.deleteVote).toHaveBeenCalledWith('c1');
  });

  it('clears the ballot via helper', async () => {
    votingHttp.getMyVotes.and.returnValue(
      of([{ id: 'v1', candidateId: 'c1', userId: 'u-current', rank: 1 }]),
    );
    store.init('e1');
    await wait();

    await store.clearBallot();

    expect(votingHttp.deleteVote).toHaveBeenCalledWith('c1');
  });

  it('reopens the election', async () => {
    store.init('e1');
    await wait();

    await store.reopenElection({ endDateTime: null });

    expect(electionHttp.reopenElection).toHaveBeenCalledWith('e1', { endDateTime: null });
  });

  it('deletes the election', async () => {
    store.init('e1');
    await wait();

    const deleted = await store.deleteElection();

    expect(deleted).toBeTrue();
    expect(electionHttp.deleteElection).toHaveBeenCalledWith('e1');
  });

  it('closes the election', async () => {
    store.init('e1');
    await wait();

    await store.closeElection();

    expect(electionHttp.closeElection).toHaveBeenCalledWith('e1');
  });

  describe('nominateFromOpenLibrary', () => {
    const doc = {
      key: '/works/OL123W',
      title: 'The Test Book',
      author_name: ['Test Author'],
      cover_i: undefined,
    };

    it('creates the book with the provided pitch as blurb', async () => {
      store.init('e1');
      await wait();

      await store.nominateFromOpenLibrary(doc, 'My pitch text');

      expect(bookHttp.createBook).toHaveBeenCalledWith(
        jasmine.objectContaining({ blurb: 'My pitch text' }),
      );
    });

    it('trims whitespace from the pitch before sending', async () => {
      store.init('e1');
      await wait();

      await store.nominateFromOpenLibrary(doc, '  padded pitch  ');

      expect(bookHttp.createBook).toHaveBeenCalledWith(
        jasmine.objectContaining({ blurb: 'padded pitch' }),
      );
    });

    it('sends an empty blurb when no pitch is provided', async () => {
      store.init('e1');
      await wait();

      await store.nominateFromOpenLibrary(doc, '');

      expect(bookHttp.createBook).toHaveBeenCalledWith(
        jasmine.objectContaining({ blurb: '' }),
      );
    });

    it('adds a placeholder candidate optimistically before the request resolves', async () => {
      let resolve!: () => void;
      bookHttp.createBook.and.returnValue(
        new Observable((subscriber) => {
          resolve = () => {
            subscriber.next({ id: 'b1', title: 'The Test Book', author: 'Test Author', imageURL: '', blurb: 'My pitch text', openLibraryId: '', shelves: [] });
            subscriber.complete();
          };
        }),
      );

      store.init('e1');
      await wait();
      const before = store.candidatesVm().items.length;

      const nomination = store.nominateFromOpenLibrary(doc, 'My pitch text');

      // Placeholder should be present immediately (sync signal update)
      await wait(0);
      expect(store.candidatesVm().items.length)
        .withContext('placeholder should appear before HTTP resolves')
        .toBe(before + 1);

      resolve();
      await nomination;
    });

    it('removes the placeholder on failure and shows an error notification', async () => {
      bookHttp.createBook.and.returnValue(throwError(() => new Error('network error')));

      store.init('e1');
      await wait();
      const before = store.candidatesVm().items.length;

      try {
        await store.nominateFromOpenLibrary(doc, 'pitch');
      } catch {
        // expected
      }

      expect(store.candidatesVm().items.length)
        .withContext('placeholder should be rolled back after failure')
        .toBe(before);
      expect(notifications.error).toHaveBeenCalled();
    });

    it('replaces the placeholder with the real candidate on success', async () => {
      const realCandidate: CandidateResponse = {
        id: 'c-real',
        base: { id: 'b-real', title: 'The Test Book', author: 'Test Author', imageURL: '', blurb: 'My pitch text', openLibraryId: 'OL123W' },
        pitch: 'My pitch text',
        createdDate: new Date().toISOString(),
        electionId: 'e1',
        nominatorId: 'u1',
        votes: [],
      };
      bookHttp.createBook.and.returnValue(of({ id: 'b-real', title: 'The Test Book', author: 'Test Author', imageURL: '', blurb: 'My pitch text', openLibraryId: 'OL123W', shelves: [] }));
      electionHttp.nominateCandidate.and.returnValue(of(realCandidate));

      store.init('e1');
      await wait();

      await store.nominateFromOpenLibrary(doc, 'My pitch text');

      const ids = store.candidatesVm().items.map((c) => c.id);
      expect(ids).toContain('c-real');
      expect(ids.some((id) => id.startsWith('tmp-')))
        .withContext('no placeholder IDs should remain')
        .toBeFalse();
    });

    it('shows a success notification after nominating', async () => {
      store.init('e1');
      await wait();

      await store.nominateFromOpenLibrary(doc, 'pitch');

      expect(notifications.success).toHaveBeenCalledWith('Candidate nominated');
    });

    it('uses the open library key as the openLibraryId, stripping /works/ prefix', async () => {
      store.init('e1');
      await wait();

      await store.nominateFromOpenLibrary({ ...doc, key: '/works/OL999W' }, '');

      expect(bookHttp.createBook).toHaveBeenCalledWith(
        jasmine.objectContaining({ openLibraryId: 'OL999W' }),
      );
    });

    it('uses the key as-is when it has no /works/ prefix', async () => {
      store.init('e1');
      await wait();

      await store.nominateFromOpenLibrary({ ...doc, key: 'RAWKEY' }, '');

      expect(bookHttp.createBook).toHaveBeenCalledWith(
        jasmine.objectContaining({ openLibraryId: 'RAWKEY' }),
      );
    });
  });
});

function wait(ms: number = 10): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
