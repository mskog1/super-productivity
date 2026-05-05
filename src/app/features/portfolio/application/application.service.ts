import { Injectable, inject } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { nanoid } from 'nanoid';
import {
  selectActiveApplications,
  selectAllApplications,
  selectApplicationById,
  selectApplicationsForTagId,
  selectArchivedApplications,
  selectLiveApplications,
} from './store/application.selectors';
import {
  addApplication,
  deleteApplication,
  deleteApplications,
  updateApplication,
  updateApplicationOrder,
} from './store/application.actions';
import { Application, ApplicationState } from './application.model';
import { sortByTitle } from '../../../util/sort-by-title';

/**
 * High-level CRUD facade for the Application entity.
 *
 * Mirrors the shape of TagService — anyone who's worked on Tag will recognise
 * the pattern. Components inject this rather than touching the store directly.
 */
@Injectable({
  providedIn: 'root',
})
export class ApplicationService {
  private _store$ = inject<Store<ApplicationState>>(Store);

  applications$: Observable<Application[]> = this._store$.pipe(
    select(selectAllApplications),
  );
  applications = toSignal(this.applications$, { initialValue: [] });

  activeApplications$: Observable<Application[]> = this._store$.pipe(
    select(selectActiveApplications),
  );
  activeApplications = toSignal(this.activeApplications$, { initialValue: [] });

  archivedApplications$: Observable<Application[]> = this._store$.pipe(
    select(selectArchivedApplications),
  );

  liveApplications$: Observable<Application[]> = this._store$.pipe(
    select(selectLiveApplications),
  );

  applicationsSortedForUI$: Observable<Application[]> = this.activeApplications$.pipe(
    map((apps) => sortByTitle(apps)),
  );
  applicationsSortedForUI = toSignal(this.applicationsSortedForUI$, {
    initialValue: [],
  });

  getApplicationById$(id: string): Observable<Application | undefined> {
    return this._store$.pipe(select(selectApplicationById(id)));
  }

  getApplicationsForTagId$(tagId: string): Observable<Application[]> {
    return this._store$.pipe(select(selectApplicationsForTagId(tagId)));
  }

  addApplication(partial: Partial<Application>): string {
    const application = this._buildApplication(partial);
    this._store$.dispatch(addApplication({ application }));
    return application.id;
  }

  updateApplication(
    id: string,
    changes: Partial<Application>,
    isSkipSnack = false,
  ): void {
    const withTimestamp = { ...changes, updatedAt: Date.now() };
    this._store$.dispatch(
      updateApplication({
        application: { id, changes: withTimestamp },
        isSkipSnack,
      }),
    );
  }

  archiveApplication(id: string): void {
    this.updateApplication(id, { isArchived: true });
  }

  restoreApplication(id: string): void {
    this.updateApplication(id, { isArchived: false });
  }

  deleteApplication(id: string): void {
    this._store$.dispatch(deleteApplication({ id }));
  }

  deleteApplications(ids: string[]): void {
    this._store$.dispatch(deleteApplications({ ids }));
  }

  updateOrder(ids: string[]): void {
    this._store$.dispatch(updateApplicationOrder({ ids }));
  }

  private _buildApplication(partial: Partial<Application>): Application {
    const now = Date.now();
    return {
      id: partial.id ?? nanoid(),
      title: partial.title ?? 'New Application',
      icon: null,
      color: null,
      relatedTagIds: [],
      contractIds: [],
      purchaseOrderIds: [],
      decisionIds: [],
      meetingNoteIds: [],
      links: [],
      createdAt: now,
      updatedAt: now,
      isArchived: false,
      ...partial,
    };
  }
}
