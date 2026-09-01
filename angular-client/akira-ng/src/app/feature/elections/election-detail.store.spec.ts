import { TestBed } from '@angular/core/testing';
import { createSpyObj, type SpyObj } from '../../testing/mock';
import { provideZonelessChangeDetection } from '@angular/core';
import { ElectionDetailStore } from './election-detail.store';
import { ElectionHttpService } from '../../common/http/election-http.service';
import { BookHttpService } from '../../common/http/book-http.service';
import { NotificationService } from '../../common/notification/notification.service';
import { ShelfHttpService } from '../../common/http/shelf-http.service';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { ElectionResponse } from '../../model/response/election-response.model';
import { CandidateResponse } from '../../model/response/candidate-response.model';
import { VotingHttpService } from '../../common/http/voting-http.service';
import { UserService } from '../../auth/user.service';
import { User } from '../../auth/user.model';

const election: ElectionResponse = {
  id: 'e1',
  title: 'Demo Election',
  status: 'OPEN',
  endDateTime: null,
  createDate: '2025-01-01T00:00:00Z',
  maxNominationsPerUser: null,
  maxNominationsTotal: null,
};

const currentUser = new User('u-current', 'Current User', 'current@example.com', [], 'BONKLING_PLUM');

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
  let electionHttp: SpyObj<ElectionHttpService>;
  let bookHttp: SpyObj<BookHttpService>;
  let shelfHttp: SpyObj<ShelfHttpService>;
  let notifications: SpyObj<NotificationService>;
  let votingHttp: SpyObj<VotingHttpService>;

  beforeEach(() => {
    electionHttp = createSpyObj<ElectionHttpService>([
      'getElection',
      'getCandidates',
      'nominateCandidate',
      'deleteCandidate',
      'getElectionResults',
      'reopenElection',
      'deleteElection',
      'closeElection',
    ]);
    bookHttp = createSpyObj<BookHttpService>(['createBook', 'getOpenLibraryCoverImageUrl']);
    notifications = createSpyObj<NotificationService>(['success', 'error']);
    shelfHttp = createSpyObj<ShelfHttpService>(['getShelvesPage']);
    votingHttp = createSpyObj<VotingHttpService>([
      'getMyVotes',
      'voteForCandidate',
      'deleteVote',
    ]);

    electionHttp.getElection.mockReturnValue(of(election));
    electionHttp.getCandidates.mockReturnValue(of([candidate]));
    electionHttp.nominateCandidate.mockReturnValue(of(candidate));
    bookHttp.createBook.mockReturnValue(of({
      id: 'b1',
      title: 'Book',
      author: 'Author',
      imageURL: '',
      blurb: '',
      openLibraryId: '',
      shelves: [],
    }));
    bookHttp.getOpenLibraryCoverImageUrl.mockReturnValue('');
    electionHttp.deleteCandidate.mockReturnValue(of(void 0));
    electionHttp.getElectionResults.mockReturnValue(of([]));
    electionHttp.reopenElection.mockReturnValue(of(election));
    electionHttp.deleteElection.mockReturnValue(of(void 0));
    electionHttp.closeElection.mockReturnValue(of(void 0));
    shelfHttp.getShelvesPage.mockReturnValue(
      of({ _embedded: { shelfResponseList: [] }, page: { number: 0, size: 8, totalElements: 0, totalPages: 1 } }),
    );
    votingHttp.getMyVotes.mockReturnValue(of([]));
    votingHttp.voteForCandidate.mockReturnValue(
      of({ id: 'v1', candidateId: 'c1', userId: 'u-current', rank: 1 }),
    );
    votingHttp.deleteVote.mockReturnValue(of(void 0));

    const user$ = new BehaviorSubject<User>(currentUser);
    const userService = {
      valueChanges: user$.asObservable(),
      current: currentUser,
    } as unknown as UserService;

    TestBed.configureTestingModule({
      providers: [
        ElectionDetailStore,
        { provide: UserService, useValue: userService },
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
    await store.nominateCustomBook({ title: 'New', author: 'Me', imageURL: '', blurb: '', pitch: '' });
    expect(bookHttp.createBook).toHaveBeenCalled();
  });

  // Ranking goes through reorderBallot; unranking is covered by the
  // "drops rankings" and "clears the ballot" cases below.
  it('records a vote and reflects the new rank in the ballot', async () => {
    store.init('e1');
    await wait();

    await store.reorderBallot(['c1']);

    expect(votingHttp.voteForCandidate).toHaveBeenCalledWith('c1', 1);
    expect(store.candidatesVm().rankedItems[0]?.userRank).toBe(1);
  });

  it('reorders the ballot according to the provided order', async () => {
    electionHttp.getCandidates.mockReturnValue(of([candidate, candidateTwo]));
    votingHttp.getMyVotes.mockReturnValue(
      of([
        { id: 'v1', candidateId: 'c1', userId: 'u-current', rank: 1 },
        { id: 'v2', candidateId: 'c2', userId: 'u-current', rank: 2 },
      ]),
    );
    store.init('e1');
    await wait();

    votingHttp.voteForCandidate.mockClear();

    await store.reorderBallot(['c2', 'c1']);

    expect(votingHttp.voteForCandidate).toHaveBeenCalledWith('c2', 1);
    expect(votingHttp.voteForCandidate).toHaveBeenCalledWith('c1', 2);
  });

  it('drops rankings when a candidate leaves the ballot', async () => {
    electionHttp.getCandidates.mockReturnValue(of([candidate]));
    votingHttp.getMyVotes.mockReturnValue(
      of([{ id: 'v1', candidateId: 'c1', userId: 'u-current', rank: 1 }]),
    );
    store.init('e1');
    await wait();

    votingHttp.deleteVote.mockClear();

    await store.reorderBallot([]);

    expect(votingHttp.deleteVote).toHaveBeenCalledWith('c1');
  });

  it('clears the ballot via helper', async () => {
    votingHttp.getMyVotes.mockReturnValue(
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

    expect(deleted).toBe(true);
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

    it('sends the pitch to the candidate, not the book blurb', async () => {
      store.init('e1');
      await wait();

      await store.nominateFromOpenLibrary(doc, 'My pitch text');

      expect(bookHttp.createBook).toHaveBeenCalledWith(
        expect.objectContaining({ blurb: '' }),
      );
      expect(electionHttp.nominateCandidate).toHaveBeenCalledWith('e1', 'b1', 'My pitch text');
    });

    it('trims whitespace from the pitch before sending', async () => {
      store.init('e1');
      await wait();

      await store.nominateFromOpenLibrary(doc, '  padded pitch  ');

      expect(electionHttp.nominateCandidate).toHaveBeenCalledWith('e1', 'b1', 'padded pitch');
    });

    it('sends an empty pitch when none is provided', async () => {
      store.init('e1');
      await wait();

      await store.nominateFromOpenLibrary(doc, '');

      expect(bookHttp.createBook).toHaveBeenCalledWith(
        expect.objectContaining({ blurb: '' }),
      );
      expect(electionHttp.nominateCandidate).toHaveBeenCalledWith('e1', 'b1', '');
    });

    it('adds a placeholder candidate optimistically before the request resolves', async () => {
      let resolve!: () => void;
      bookHttp.createBook.mockReturnValue(
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
      expect(store.candidatesVm().items.length, 'placeholder should appear before HTTP resolves')
        .toBe(before + 1);

      resolve();
      await nomination;
    });

    it('removes the placeholder on failure and shows an error notification', async () => {
      bookHttp.createBook.mockReturnValue(throwError(() => new Error('network error')));

      store.init('e1');
      await wait();
      const before = store.candidatesVm().items.length;

      try {
        await store.nominateFromOpenLibrary(doc, 'pitch');
      } catch {
        // expected
      }

      expect(store.candidatesVm().items.length, 'placeholder should be rolled back after failure')
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
      bookHttp.createBook.mockReturnValue(of({ id: 'b-real', title: 'The Test Book', author: 'Test Author', imageURL: '', blurb: 'My pitch text', openLibraryId: 'OL123W', shelves: [] }));
      electionHttp.nominateCandidate.mockReturnValue(of(realCandidate));

      store.init('e1');
      await wait();

      await store.nominateFromOpenLibrary(doc, 'My pitch text');

      const ids = store.candidatesVm().items.map((c) => c.id);
      expect(ids).toContain('c-real');
      expect(ids.some((id) => id.startsWith('tmp-')), 'no placeholder IDs should remain')
        .toBe(false);
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
        expect.objectContaining({ openLibraryId: 'OL999W' }),
      );
    });

    it('uses the key as-is when it has no /works/ prefix', async () => {
      store.init('e1');
      await wait();

      await store.nominateFromOpenLibrary({ ...doc, key: 'RAWKEY' }, '');

      expect(bookHttp.createBook).toHaveBeenCalledWith(
        expect.objectContaining({ openLibraryId: 'RAWKEY' }),
      );
    });
  });
});

function wait(ms: number = 10): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
