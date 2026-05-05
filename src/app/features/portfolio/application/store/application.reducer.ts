/**
 * Application reducer — Aker BP fork's portfolio entity.
 *
 * Mirrors the Tag reducer's pattern: NgRx EntityAdapter with ordered ids
 * for explicit user-controlled ordering (so the side-menu / list order
 * is stable). Uses a custom `sortComparer: undefined` — we want the
 * insertion order under user control via `updateApplicationOrder`.
 */
import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import { createFeatureSelector, createReducer, on } from '@ngrx/store';
import { Application, ApplicationState } from '../application.model';
import {
  addApplication,
  deleteApplication,
  deleteApplications,
  updateApplication,
  updateApplicationOrder,
} from './application.actions';

export const APPLICATION_FEATURE_NAME = 'application';

export const applicationAdapter: EntityAdapter<Application> =
  createEntityAdapter<Application>();

export const selectApplicationFeatureState = createFeatureSelector<ApplicationState>(
  APPLICATION_FEATURE_NAME,
);

export const initialApplicationState: ApplicationState =
  applicationAdapter.getInitialState();

export const applicationReducer = createReducer(
  initialApplicationState,

  on(addApplication, (state, { application }) =>
    applicationAdapter.addOne(application, state),
  ),

  on(updateApplication, (state, { application }) =>
    applicationAdapter.updateOne(application, state),
  ),

  on(deleteApplication, (state, { id }) => applicationAdapter.removeOne(id, state)),

  on(deleteApplications, (state, { ids }) => applicationAdapter.removeMany(ids, state)),

  on(updateApplicationOrder, (state, { ids }) => ({
    ...state,
    ids,
  })),
);
