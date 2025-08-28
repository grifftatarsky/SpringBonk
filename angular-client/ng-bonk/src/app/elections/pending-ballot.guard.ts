import { CanDeactivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../common/confirm-dialog.component';
import { Actions, ofType } from '@ngrx/effects';
import * as ElectionsActions from './store/elections.actions';
import { filter, map, mergeMap, Observable, of, take, timeout } from 'rxjs';
import { ElectionDetailComponent } from './election-detail.component';

export const pendingBallotGuard: CanDeactivateFn<ElectionDetailComponent> = (
  comp: ElectionDetailComponent
): true | Observable<boolean> => {
  if (!comp || !comp.hasPendingChanges()) return true;
  const dlg: MatDialog = inject(MatDialog);
  const actions$: Actions<any> = inject(Actions);

  const ref = dlg.open(ConfirmDialogComponent, {
    data: {
      title: 'Unsaved changes',
      message: 'You have unsaved changes to your ballot.',
      confirmText: 'Save',
      cancelText: 'Leave without saving',
    },
    width: '520px',
  });

  return ref.afterClosed().pipe(
    take(1),
    mergeMap(choice => {
      if (!choice) {
        // Leave without saving
        return of(true);
      }
      // Save and wait for success
      comp.submitBallot();
      const id = comp.getElectionId();
      return actions$.pipe(
        ofType(
          ElectionsActions.submitBallotSuccess,
          ElectionsActions.submitBallotFailure
        ),
        filter(a => 'electionId' in a && (a as any).electionId === id),
        take(1),
        map(a => a.type === ElectionsActions.submitBallotSuccess.type),
        timeout({ each: 10000, with: () => of(true) })
      );
    })
  );
};
