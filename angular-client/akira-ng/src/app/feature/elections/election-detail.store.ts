import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { ElectionHttpService } from '../../common/http/election-http.service';
import { ElectionResponse, ElectionStatus } from '../../model/response/election-response.model';
import { CandidateResponse } from '../../model/response/candidate-response.model';
import { BookHttpService } from '../../common/http/book-http.service';
import { BookRequest } from '../../model/request/book-request.model';
import { OpenLibraryBookResponse } from '../../model/response/open-library-book-response.model';
import { NotificationService } from '../../common/notification/notification.service';
import { firstValueFrom } from 'rxjs';
import { ShelfHttpService } from '../../common/http/shelf-http.service';
import { ShelfResponse } from '../../model/response/shelf-response.model';
import { BookResponse } from '../../model/response/book-response.model';
import { mapSpringPagedResponse } from '../../common/util/pagination.util';
import { VotingHttpService } from '../../common/http/voting-http.service';
import { VoteResponse } from '../../model/response/vote-response.model';
import { ElectionResultResponse } from '../../model/response/election-result-response.model';
import { ElectionReopenRequest } from '../../model/request/election-reopen-request.model';

export interface CandidateListItem {
  id: string;
  title: string;
  author: string;
  cover: string;
  blurb: string;
  votes: number;
  bookId: string;
  userRank: number | null;
  voteBusy: boolean;
}

interface RoundResultView {
  roundNumber: number;
  rows: Array<{ candidateId: string; candidateName: string; votes: number; eliminated: boolean }>;
  eliminationMessage: string | null;
}

interface ElectionResultView {
  id: string;
  winnerId: string | null;
  winnerName: string;
  totalVotes: number;
  closureTime: string;
  rounds: RoundResultView[];
  flags: string[];
}

@Injectable()
export class ElectionDetailStore {
  private readonly electionHttp = inject(ElectionHttpService);
  private readonly bookHttp = inject(BookHttpService);
  private readonly shelfHttp = inject(ShelfHttpService);
  private readonly votingHttp = inject(VotingHttpService);
  private readonly notifications = inject(NotificationService);

  private readonly electionId = signal('');
  private readonly election = signal<ElectionResponse | null>(null);
  private readonly electionLoading = signal(false);
  private readonly electionError = signal<string | null>(null);

  private readonly candidates = signal<CandidateResponse[]>([]);
  private readonly candidateLoading = signal(false);
  private readonly candidateError = signal<string | null>(null);

  private readonly shelfOptions = signal<ShelfResponse[]>([]);
  private readonly shelfOptionsLoading = signal(false);
  private readonly shelfOptionsError = signal<string | null>(null);
  private readonly selectedShelfId = signal<string | null>(null);
  private readonly shelfBooks = signal<BookResponse[]>([]);
  private readonly shelfBooksLoading = signal(false);
  private readonly shelfBooksError = signal<string | null>(null);
  private readonly votes = signal<VoteResponse[]>([]);
  private readonly votesLoading = signal(false);
  private readonly votesError = signal<string | null>(null);
  private readonly voteBusyMap = signal<Record<string, boolean>>({});
  private readonly reorderBusy = signal(false);
  private readonly results = signal<ElectionResultResponse[]>([]);
  private readonly resultsLoading = signal(false);
  private readonly resultsError = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.electionId();
      if (!id) {
        return;
      }
      this.fetchElection(id);
      this.fetchCandidates(id);
      this.fetchVotes(id);
    });

    this.loadShelfOptions();

    effect(() => {
      const election = this.election();
      if (!election) {
        this.results.set([]);
        this.resultsError.set(null);
        return;
      }
      if (election.status === 'CLOSED') {
        void this.fetchResults(election.id);
      } else {
        this.results.set([]);
        this.resultsError.set(null);
      }
    });
  }

  readonly electionVm = computed(() => ({
    election: this.election(),
    loading: this.electionLoading(),
    error: this.electionError(),
    badgeTone: this.getBadgeTone(this.election()?.status ?? 'OPEN'),
    statusLabel: this.getStatusLabel(this.election()?.status ?? 'OPEN'),
  }));

  readonly candidatesVm = computed(() => {
    const voteMap = this.votes().reduce<Record<string, number>>((acc, vote) => {
      acc[vote.candidateId] = vote.rank;
      return acc;
    }, {});
    const busyMap = this.voteBusyMap();
    const items: CandidateListItem[] = this.candidates().map((candidate) => ({
      id: candidate.id,
      title: candidate.base.title,
      author: candidate.base.author,
      cover: candidate.base.imageURL,
      blurb: candidate.base.blurb,
      votes: candidate.votes?.length ?? 0,
      bookId: candidate.base.id,
      userRank: voteMap[candidate.id] ?? null,
      voteBusy: busyMap[candidate.id] ?? false,
    }));
    const rankedItems = [...items]
      .filter((item) => item.userRank !== null)
      .sort((a, b) => (a.userRank! - b.userRank!));
    const unrankedItems = items.filter((item) => item.userRank === null);

    return {
      items,
      loading: this.candidateLoading(),
      error: this.candidateError(),
      votesLoading: this.votesLoading(),
      votesError: this.votesError(),
      reorderBusy: this.reorderBusy(),
      rankedItems,
      unrankedItems,
    };
  });

  readonly resultsVm = computed(() => {
    const candidateMap = new Map(this.candidates().map((candidate) => [candidate.id, candidate.base.title]));
    const items: ElectionResultView[] = this.results().map((result) => ({
      id: result.id,
      winnerId: result.winnerId,
      winnerName: result.winnerId ? candidateMap.get(result.winnerId) ?? 'Unknown candidate' : 'Pending',
      totalVotes: result.totalVotes,
      closureTime: result.closureTime,
      flags: result.flags,
      rounds: (result.rounds ?? []).map((round) => (({
        roundNumber: round.roundNumber,
        eliminationMessage: round.eliminationMessage ?? null,
        rows: Object.entries(round.votes ?? {}).map(([candidateId, votes]) => ({
          candidateId,
          candidateName: candidateMap.get(candidateId) ?? 'Candidate',
          votes,
          eliminated: round.eliminatedCandidateIds?.includes(candidateId) ?? false,
        })),
      }) as RoundResultView)),
    }));

    return {
      items,
      loading: this.resultsLoading(),
      error: this.resultsError(),
    };
  });

  readonly shelfOptionsVm = computed(() => ({
    shelves: this.shelfOptions(),
    loading: this.shelfOptionsLoading(),
    error: this.shelfOptionsError(),
    selectedShelfId: this.selectedShelfId(),
    books: this.shelfBooks(),
    booksLoading: this.shelfBooksLoading(),
    booksError: this.shelfBooksError(),
  }));

  init(id: string): void {
    if (id && id !== this.electionId()) {
      this.electionId.set(id);
    }
  }

  async nominateFromOpenLibrary(doc: OpenLibraryBookResponse): Promise<void> {
    const electionId = this.electionId();
    if (!electionId) return;

    const placeholderId = `tmp-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
    const placeholder: CandidateResponse = {
      id: placeholderId,
      base: {
        id: placeholderId,
        title: doc.title || 'Untitled',
        author: doc.author_name?.[0] || 'Unknown author',
        imageURL: doc.cover_i ? this.bookHttp.getOpenLibraryCoverImageUrl(doc.cover_i, 'M') : '',
        blurb: '',
        openLibraryId: doc.key?.replace('/works/', '') || doc.key || '',
      },
      pitch: '',
      createdDate: new Date().toISOString(),
      electionId,
      nominatorId: '',
      votes: [],
    };

    this.candidates.update((candidates) => [placeholder, ...candidates]);

    try {
      const request: BookRequest = {
        title: placeholder.base.title,
        author: placeholder.base.author,
        imageURL: placeholder.base.imageURL,
        blurb: '',
        openLibraryId: placeholder.base.openLibraryId,
      };
      const createdBook = await firstValueFrom(this.bookHttp.createBook(request));
      const candidate = await firstValueFrom(this.electionHttp.nominateCandidate(electionId, createdBook.id));
      this.replaceCandidate(placeholderId, candidate);
      this.notifications.success('Candidate nominated');
    } catch (error) {
      console.error('[ElectionDetailStore] Failed to nominate', error);
      this.candidates.update((candidates) => candidates.filter((c) => c.id !== placeholderId));
      this.notifications.error('Unable to nominate candidate right now.');
      throw error;
    }
  }

  async nominateCustomBook(form: { title: string; author: string; imageURL: string; blurb: string }): Promise<void> {
    const electionId = this.electionId();
    if (!electionId) return;

    const customOpenLibraryId = `custom-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
    const placeholderId = `tmp-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
    const placeholder: CandidateResponse = {
      id: placeholderId,
      base: {
        id: placeholderId,
        title: form.title,
        author: form.author,
        imageURL: form.imageURL,
        blurb: form.blurb,
        openLibraryId: customOpenLibraryId,
      },
      pitch: '',
      createdDate: new Date().toISOString(),
      electionId,
      nominatorId: '',
      votes: [],
    };

    this.candidates.update((candidates) => [placeholder, ...candidates]);

    try {
      const request: BookRequest = { ...form, openLibraryId: customOpenLibraryId };
      const createdBook = await firstValueFrom(this.bookHttp.createBook(request));
      const candidate = await firstValueFrom(this.electionHttp.nominateCandidate(electionId, createdBook.id));
      this.replaceCandidate(placeholderId, candidate);
      this.notifications.success('Candidate nominated');
    } catch (error) {
      console.error('[ElectionDetailStore] Failed to nominate custom book', error);
      this.candidates.update((candidates) => candidates.filter((c) => c.id !== placeholderId));
      this.notifications.error('Unable to nominate candidate right now.');
      throw error;
    }
  }

  async nominateExistingBook(bookId: string): Promise<void> {
    const electionId = this.electionId();
    if (!electionId) return;

    const placeholderId = `tmp-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
    const placeholder: CandidateResponse = {
      id: placeholderId,
      base: { id: bookId, title: 'Loading…', author: '', imageURL: '', blurb: '', openLibraryId: '' },
      pitch: '',
      createdDate: new Date().toISOString(),
      electionId,
      nominatorId: '',
      votes: [],
    };

    this.candidates.update((candidates) => [placeholder, ...candidates]);

    try {
      const candidate = await firstValueFrom(this.electionHttp.nominateCandidate(electionId, bookId));
      this.replaceCandidate(placeholderId, candidate);
      this.notifications.success('Candidate nominated');
    } catch (error) {
      console.error('[ElectionDetailStore] Failed to nominate existing book', error);
      this.candidates.update((candidates) => candidates.filter((c) => c.id !== placeholderId));
      this.notifications.error('Unable to nominate candidate right now.');
      throw error;
    }
  }

  async removeCandidate(candidateId: string): Promise<void> {
    const electionId = this.electionId();
    if (!electionId) return;

    const snapshot = this.candidates();
    this.candidates.update((candidates) => candidates.filter((c) => c.id !== candidateId));

    try {
      await firstValueFrom(this.electionHttp.deleteCandidate(electionId, candidateId));
      this.notifications.success('Candidate removed');
    } catch (error) {
      console.error('[ElectionDetailStore] Failed to remove candidate', error);
      this.candidates.set(snapshot);
      this.notifications.error('Unable to remove candidate right now.');
      throw error;
    }
  }

  refreshCandidates(): void {
    const id = this.electionId();
    if (id) {
      void this.fetchCandidates(id);
    }
  }

  refreshVotes(): void {
    const id = this.electionId();
    if (id) {
      void this.fetchVotes(id);
    }
  }

  refreshResults(): void {
    const election = this.election();
    if (election?.status === 'CLOSED') {
      void this.fetchResults(election.id);
    }
  }

  async reorderBallot(order: readonly string[]): Promise<void> {
    const electionId = this.electionId();
    if (!electionId) {
      return;
    }

    const normalizedOrder = this.normalizeOrder(order);
    const previousVotes = this.votes();
    const previousOrder = previousVotes.map((vote) => vote.candidateId);
    const voteMap = previousVotes.reduce<Record<string, number>>((acc, vote) => {
      acc[vote.candidateId] = vote.rank;
      return acc;
    }, {});

    const operations: { candidateId: string; rank: number | null }[] = [];

    normalizedOrder.forEach((candidateId, index) => {
      const desiredRank = index + 1;
      const currentRank = voteMap[candidateId] ?? null;
      if (currentRank !== desiredRank) {
        operations.push({ candidateId, rank: desiredRank });
      }
    });

    previousVotes.forEach((vote) => {
      if (!normalizedOrder.includes(vote.candidateId)) {
        operations.push({ candidateId: vote.candidateId, rank: null });
      }
    });

    const ordersMatch =
      normalizedOrder.length === previousOrder.length &&
      normalizedOrder.every((id, index) => id === previousOrder[index]);

    if (!operations.length && ordersMatch) {
      return;
    }

    const snapshot = this.votes();
    const voteLookup = new Map<string, VoteResponse>(snapshot.map((vote) => [vote.candidateId, vote]));

    this.reorderBusy.set(true);

    try {
      for (const operation of operations) {
        if (operation.rank === null) {
          await firstValueFrom(this.votingHttp.deleteVote(operation.candidateId));
          voteLookup.delete(operation.candidateId);
          continue;
        }
        const vote = await firstValueFrom(
          this.votingHttp.voteForCandidate(operation.candidateId, operation.rank),
        );
        voteLookup.set(operation.candidateId, vote);
      }

      const fallbackUser = snapshot[0]?.userId ?? '';
      const finalVotes: VoteResponse[] = normalizedOrder.map((candidateId, index) => {
        const existing = voteLookup.get(candidateId);
        const rank = index + 1;
        if (existing) {
          return { ...existing, rank };
        }
        return { id: `temp-${candidateId}`, candidateId, userId: fallbackUser, rank };
      });
      this.votes.set(finalVotes);
      this.votesError.set(null);
    } catch (error) {
      console.error('[ElectionDetailStore] Failed to reorder ballot', error);
      this.votes.set(snapshot);
      this.votesError.set('Unable to reorder ballot right now.');
      this.notifications.error('Unable to reorder ballot right now.');
      throw error;
    } finally {
      this.reorderBusy.set(false);
    }
  }

  async setCandidateRank(candidateId: string, rank: number | null): Promise<void> {
    if (!candidateId) {
      return;
    }

    this.setVoteBusy(candidateId, true);
    try {
      if (rank === null) {
        await firstValueFrom(this.votingHttp.deleteVote(candidateId));
        this.votes.update((current) => current.filter((vote) => vote.candidateId !== candidateId));
        this.notifications.success('Vote removed');
      } else {
        const vote = await firstValueFrom(this.votingHttp.voteForCandidate(candidateId, rank));
        this.upsertVote(vote);
        this.notifications.success('Vote recorded');
      }
      this.votesError.set(null);
    } catch (error) {
      console.error('[ElectionDetailStore] Failed to update vote', error);
      this.votesError.set('Unable to update vote right now.');
      this.notifications.error('Unable to update vote right now.');
      throw error;
    } finally {
      this.setVoteBusy(candidateId, false);
    }
  }

  async clearBallot(): Promise<void> {
    await this.reorderBallot([]);
  }

  async deleteElection(): Promise<boolean> {
    const id = this.electionId();
    if (!id) {
      return false;
    }
    try {
      await firstValueFrom(this.electionHttp.deleteElection(id));
      this.notifications.success('Election deleted');
      this.election.set(null);
      return true;
    } catch (error) {
      console.error('[ElectionDetailStore] Failed to delete election', error);
      this.notifications.error('Unable to delete election right now.');
      return false;
    }
  }

  async reopenElection(payload: ElectionReopenRequest): Promise<void> {
    const id = this.electionId();
    if (!id) {
      return;
    }
    try {
      const updated = await firstValueFrom(this.electionHttp.reopenElection(id, payload));
      this.election.set(updated);
      this.notifications.success('Election reopened');
    } catch (error) {
      console.error('[ElectionDetailStore] Failed to reopen election', error);
      this.notifications.error('Unable to reopen election right now.');
      throw error;
    }
  }

  async closeElection(): Promise<void> {
    const id = this.electionId();
    if (!id) {
      return;
    }
    try {
      await firstValueFrom(this.electionHttp.closeElection(id));
      await this.fetchElection(id);
      await this.fetchResults(id);
      this.notifications.success('Election closed');
    } catch (error) {
      console.error('[ElectionDetailStore] Failed to close election', error);
      this.notifications.error('Unable to close election right now.');
      throw error;
    }
  }

  private async fetchElection(id: string): Promise<void> {
    this.electionLoading.set(true);
    this.electionError.set(null);
    try {
      const election = await firstValueFrom(this.electionHttp.getElection(id));
      this.election.set(election);
    } catch (error) {
      console.error('[ElectionDetailStore] Failed to load election', error);
      this.electionError.set('Unable to load election.');
      this.election.set(null);
    } finally {
      this.electionLoading.set(false);
    }
  }

  private async fetchCandidates(id: string): Promise<void> {
    this.candidateLoading.set(true);
    this.candidateError.set(null);
    try {
      const candidates = await firstValueFrom(this.electionHttp.getCandidates(id));
      this.candidates.set(candidates);
    } catch (error) {
      console.error('[ElectionDetailStore] Failed to load candidates', error);
      this.candidateError.set('Unable to load candidates.');
      this.candidates.set([]);
    } finally {
      this.candidateLoading.set(false);
    }
  }

  private async fetchVotes(id: string): Promise<void> {
    this.votesLoading.set(true);
    this.votesError.set(null);
    try {
      const votes = await firstValueFrom(this.votingHttp.getMyVotes(id));
      this.votes.set(votes);
    } catch (error) {
      console.error('[ElectionDetailStore] Failed to load votes', error);
      this.votesError.set('Unable to load your current rankings.');
      this.votes.set([]);
    } finally {
      this.votesLoading.set(false);
    }
  }

  private async loadShelfOptions(): Promise<void> {
    this.shelfOptionsLoading.set(true);
    this.shelfOptionsError.set(null);
    try {
      const response = await firstValueFrom(
        this.shelfHttp.getShelvesPage({ page: 0, size: 8, sort: 'createdDate,desc' }),
      );
      const items = mapSpringPagedResponse<ShelfResponse>(response).items;
      this.shelfOptions.set([...items]);
    } catch (error) {
      console.error('[ElectionDetailStore] Failed to load shelves', error);
      this.shelfOptionsError.set('Unable to load shelves.');
      this.shelfOptions.set([]);
    } finally {
      this.shelfOptionsLoading.set(false);
    }
  }

  private async fetchResults(id: string): Promise<void> {
    this.resultsLoading.set(true);
    this.resultsError.set(null);
    try {
      const results = await firstValueFrom(this.electionHttp.getElectionResults(id));
      this.results.set(results);
    } catch (error) {
      console.error('[ElectionDetailStore] Failed to load results', error);
      this.resultsError.set('Unable to load election results.');
      this.results.set([]);
    } finally {
      this.resultsLoading.set(false);
    }
  }

  async selectShelfForExisting(shelfId: string): Promise<void> {
    if (!shelfId) {
      this.selectedShelfId.set(null);
      this.shelfBooks.set([]);
      return;
    }
    this.selectedShelfId.set(shelfId);
    this.shelfBooksLoading.set(true);
    this.shelfBooksError.set(null);
    try {
      const books = await firstValueFrom(this.bookHttp.getBooksByShelfId(shelfId));
      this.shelfBooks.set(books);
    } catch (error) {
      console.error('[ElectionDetailStore] Failed to load shelf books', error);
      this.shelfBooksError.set('Unable to load books from this shelf.');
      this.shelfBooks.set([]);
    } finally {
      this.shelfBooksLoading.set(false);
    }
  }

  private replaceCandidate(tempId: string, candidate: CandidateResponse): void {
    this.candidates.update((candidates) =>
      candidates.map((current) => (current.id === tempId ? candidate : current)),
    );
  }

  private upsertVote(vote: VoteResponse): void {
    this.votes.update((current) => {
      const index = current.findIndex((existing) => existing.candidateId === vote.candidateId);
      if (index === -1) {
        return [...current, vote];
      }
      const updated = [...current];
      updated[index] = vote;
      return updated;
    });
  }

  private setVoteBusy(candidateId: string, busy: boolean): void {
    this.voteBusyMap.update((current) => ({
      ...current,
      [candidateId]: busy,
    }));
  }

  private normalizeOrder(order: readonly string[]): string[] {
    const validIds = new Set(this.candidates().map((candidate) => candidate.id));
    const seen = new Set<string>();
    const normalized: string[] = [];
    order.forEach((id) => {
      if (!validIds.has(id) || seen.has(id)) {
        return;
      }
      seen.add(id);
      normalized.push(id);
    });
    return normalized;
  }

  private getStatusLabel(status: ElectionStatus): string {
    switch (status) {
      case 'OPEN':
        return 'Open';
      case 'INDEFINITE':
        return 'Indefinite';
      default:
        return 'Closed';
    }
  }

  private getBadgeTone(status: ElectionStatus): 'emerald' | 'amber' | 'sky' {
    switch (status) {
      case 'OPEN':
        return 'emerald';
      case 'INDEFINITE':
        return 'sky';
      default:
        return 'amber';
    }
  }
}
