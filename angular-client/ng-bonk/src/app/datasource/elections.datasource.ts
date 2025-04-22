import { DataSource } from '@angular/cdk/collections';
import { ElectionResponse } from '../model/response/election-response.model';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { ElectionHttpService } from '../service/http/election-http.service';
import { PagedResponse } from '../model/response/paged-response.model';

export class ElectionsDataSource extends DataSource<ElectionResponse> {
  private _electionsSubject: BehaviorSubject<ElectionResponse[]> =
    new BehaviorSubject<ElectionResponse[]>([]);

  private _loadingSubject: BehaviorSubject<boolean> =
    new BehaviorSubject<boolean>(false);

  private _totalSubject: BehaviorSubject<number> = new BehaviorSubject<number>(
    0
  );

  public loading$: Observable<boolean> = this._loadingSubject.asObservable();
  public total$: Observable<number> = this._totalSubject.asObservable();

  constructor(private http: ElectionHttpService) {
    super();
  }

  connect(): Observable<ElectionResponse[]> {
    return this._electionsSubject.asObservable();
  }

  disconnect(): void {
    this._electionsSubject.complete();
    this._loadingSubject.complete();
    this._totalSubject.complete();
  }

  loadElections(pageIndex = 0, pageSize = 10): void {
    this._loadingSubject.next(true);

    this.http
      .getPagedElections(pageIndex, pageSize)
      .pipe(
        map((res: PagedResponse<ElectionResponse>): ElectionResponse[] => {
          const embeddedKey: string = Object.keys(res._embedded)[0];
          this._totalSubject.next(res.page.totalElements);
          return res._embedded[embeddedKey];
        }),
        catchError((): Observable<never[]> => of([])),
        finalize((): void => this._loadingSubject.next(false))
      )
      .subscribe((elections: ElectionResponse[] | never[]): void =>
        this._electionsSubject.next(elections)
      );
  }
}
