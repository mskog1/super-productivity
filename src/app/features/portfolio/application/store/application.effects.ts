import { inject, Injectable } from '@angular/core';
import { createEffect, ofType } from '@ngrx/effects';
import { tap } from 'rxjs/operators';
import { LOCAL_ACTIONS } from '../../../../util/local-actions.token';
import { SnackService } from '../../../../core/snack/snack.service';
import { Log } from '../../../../core/log';
import {
  addApplication,
  deleteApplication,
  updateApplication,
} from './application.actions';

/**
 * Application effects — minimal scaffold. Snack notifications on user-driven
 * mutations only. Sync replay is handled centrally by the op-log system, so
 * effects here MUST inject `LOCAL_ACTIONS` (not `Actions`) — otherwise side
 * effects (snacks, dialogs) would fire on remote sync replay too.
 *
 * As we add features (renewal engine, AI summary refresh, etc.) the
 * Application-related triggers land here.
 */
@Injectable()
export class ApplicationEffects {
  private _actions$ = inject(LOCAL_ACTIONS);
  private _snackService = inject(SnackService);

  snackOnAdd$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(addApplication),
        tap((action) => {
          this._snackService.open({
            type: 'SUCCESS',
            msg: `Application "${action.application.title}" added`,
          });
          Log.log({ id: action.application.id, evt: 'application:added' });
        }),
      ),
    { dispatch: false },
  );

  snackOnUpdate$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateApplication),
        tap((action) => {
          if (action.isSkipSnack) {
            return;
          }
          this._snackService.open({
            type: 'SUCCESS',
            msg: 'Application updated',
          });
          Log.log({ id: action.application.id as string, evt: 'application:updated' });
        }),
      ),
    { dispatch: false },
  );

  snackOnDelete$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(deleteApplication),
        tap((action) => {
          this._snackService.open({
            type: 'SUCCESS',
            msg: 'Application deleted',
          });
          Log.log({ id: action.id, evt: 'application:deleted' });
        }),
      ),
    { dispatch: false },
  );
}
