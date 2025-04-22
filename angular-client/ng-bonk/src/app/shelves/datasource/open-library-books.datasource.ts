import { DataSource } from '@angular/cdk/collections';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import {
  OpenLibraryBookResponse,
  PagedOpenLibraryResponse,
} from '../../model/response/open-library-book-response.model';
import { BookHttpService } from '../service/books-http.service';

export class OpenLibraryBooksDatasource extends DataSource<OpenLibraryBookResponse> {
  private _openLibrarySubject: BehaviorSubject<OpenLibraryBookResponse[]> =
    new BehaviorSubject<OpenLibraryBookResponse[]>([]);

  private _loadingSubject: BehaviorSubject<boolean> =
    new BehaviorSubject<boolean>(false);

  private _totalSubject: BehaviorSubject<number> = new BehaviorSubject<number>(
    0
  );

  public loading$: Observable<boolean> = this._loadingSubject.asObservable();
  public total$: Observable<number> = this._totalSubject.asObservable();

  constructor(private http: BookHttpService) {
    super();
  }

  connect(): Observable<OpenLibraryBookResponse[]> {
    return this._openLibrarySubject.asObservable();
  }

  disconnect(): void {
    this._openLibrarySubject.complete();
    this._loadingSubject.complete();
    this._totalSubject.complete();
  }

  loadBooks(searchTerm?: string, pageIndex = 0, pageSize = 10): void {
    this._loadingSubject.next(true);

    this.http
      .getOpenLibraryBooks(pageIndex, pageSize, searchTerm)
      .pipe(
        map((res: PagedOpenLibraryResponse): OpenLibraryBookResponse[] => {
          this._totalSubject.next(res.num_found);
          return res.docs;
        }),
        catchError((): Observable<never[]> => of([])),
        finalize((): void => this._loadingSubject.next(false))
      )
      .subscribe((books: OpenLibraryBookResponse[] | never[]): void =>
        this._openLibrarySubject.next(books)
      );
  }
}
