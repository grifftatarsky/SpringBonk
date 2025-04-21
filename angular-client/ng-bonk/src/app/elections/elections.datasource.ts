import { DataSource } from '@angular/cdk/collections';
import { ElectionResponse } from '../model/response/election-response.model';
import { Observable, ReplaySubject } from 'rxjs';
import { ElectionHttpService } from './service/election-http.service';

export class ElectionsDataSource extends DataSource<ElectionResponse> {
  private _dataStream: ReplaySubject<ElectionResponse[]> = new ReplaySubject<ElectionResponse[]>(1);

  constructor(
    private http: ElectionHttpService
  ) {
    super();
  }

  connect(): Observable<ElectionResponse[]> {
    this.refresh();
    return this._dataStream.asObservable();
  }

  disconnect(): void {}

  refresh(): void {
    this.http.getPagedElections().subscribe({
      next: (data: ElectionResponse[]): void => {
        console.log(data)
        return this._dataStream.next(data)
      },
      error: (err): void => console.error('Failed to fetch elections:', err)
    });
  }
}
