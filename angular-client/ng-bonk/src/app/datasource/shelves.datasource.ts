import { DataSource } from '@angular/cdk/collections';
import { ShelfResponse } from '../model/response/shelf-response.model';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { PagedResponse } from '../model/response/paged-response.model';
import { ShelfHttpService } from '../service/http/shelves-http.service';

export class ShelvesDataSource extends DataSource<ShelfResponse> {
  private _shelvesSubject: BehaviorSubject<ShelfResponse[]> =
    new BehaviorSubject<ShelfResponse[]>([]);

  private _loadingSubject: BehaviorSubject<boolean> =
    new BehaviorSubject<boolean>(false);

  private _totalSubject: BehaviorSubject<number> = new BehaviorSubject<number>(
    0
  );

  public loading$: Observable<boolean> = this._loadingSubject.asObservable();
  public total$: Observable<number> = this._totalSubject.asObservable();

  constructor(private http: ShelfHttpService) {
    super();
  }

  connect(): Observable<ShelfResponse[]> {
    return this._shelvesSubject.asObservable();
  }

  disconnect(): void {
    this._shelvesSubject.complete();
    this._loadingSubject.complete();
    this._totalSubject.complete();
  }

  loadShelves(pageIndex = 0, pageSize = 10): void {
    this._loadingSubject.next(true);

    this.http
      .getPagedShelves(pageIndex, pageSize)
      .pipe(
        map((res: PagedResponse<ShelfResponse>): ShelfResponse[] => {
          const embeddedKey: string = Object.keys(res._embedded)[0];
          this._totalSubject.next(res.page.totalElements);
          return res._embedded[embeddedKey];
        }),
        catchError((): Observable<never[]> => of([])),
        finalize((): void => this._loadingSubject.next(false))
      )
      .subscribe((shelves: ShelfResponse[] | never[]): void =>
        this._shelvesSubject.next(shelves)
      );
  }
}
