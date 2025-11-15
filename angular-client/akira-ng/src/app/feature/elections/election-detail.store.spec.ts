import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ElectionDetailStore } from './election-detail.store';
import { ElectionHttpService } from '../../common/http/election-http.service';
import { BookHttpService } from '../../common/http/book-http.service';
import { NotificationService } from '../../common/notification/notification.service';
import { ShelfHttpService } from '../../common/http/shelf-http.service';
import { of } from 'rxjs';
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
});

function wait(ms: number = 10): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
