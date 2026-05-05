import { createSelector, MemoizedSelector } from '@ngrx/store';
import { applicationAdapter, selectApplicationFeatureState } from './application.reducer';
import { Application, ApplicationStatus } from '../application.model';
import { selectAllTasks } from '../../../tasks/store/task.selectors';
import { Task } from '../../../tasks/task.model';

export const {
  selectIds: selectApplicationIds,
  selectEntities: selectApplicationEntitiesFromAdapter,
  selectAll: selectAllApplicationsFromAdapter,
  selectTotal: selectApplicationTotal,
} = applicationAdapter.getSelectors();

export const selectAllApplications = createSelector(
  selectApplicationFeatureState,
  selectAllApplicationsFromAdapter,
);

export const selectAllApplicationIds = createSelector(
  selectApplicationFeatureState,
  selectApplicationIds,
);

export const selectApplicationEntities = createSelector(
  selectApplicationFeatureState,
  selectApplicationEntitiesFromAdapter,
);

export const selectActiveApplications = createSelector(
  selectAllApplications,
  (apps: Application[]): Application[] => apps.filter((app) => !app.isArchived),
);

export const selectArchivedApplications = createSelector(
  selectAllApplications,
  (apps: Application[]): Application[] => apps.filter((app) => app.isArchived),
);

export const selectLiveApplications = createSelector(
  selectActiveApplications,
  (apps: Application[]): Application[] =>
    apps.filter((app) => app.status === ApplicationStatus.Live || !app.status),
);

export const selectApplicationById = (
  id: string,
): MemoizedSelector<object, Application | undefined> =>
  createSelector(
    selectApplicationEntities,
    (entities): Application | undefined => entities[id],
  );

/**
 * Find the Application(s) associated with a given Tag id.
 * A Tag may be associated with multiple Applications (rare, but possible
 * during migration; we return all matches and let callers choose).
 */
export const selectApplicationsForTagId = (
  tagId: string,
): MemoizedSelector<object, Application[]> =>
  createSelector(selectAllApplications, (apps): Application[] =>
    apps.filter((app) => (app.relatedTagIds ?? []).includes(tagId)),
  );

/**
 * All tasks (active store, not archive) that belong to a given Application.
 * A task belongs to the Application iff at least one of its `tagIds` is in
 * `application.relatedTagIds`. Sub-tasks are excluded — they show up under
 * their parent.
 */
export const selectTasksForApplication = (
  applicationId: string,
): MemoizedSelector<object, Task[]> =>
  createSelector(
    selectApplicationById(applicationId),
    selectAllTasks,
    (app, tasks): Task[] => {
      if (!app) {
        return [];
      }
      const related = new Set(app.relatedTagIds ?? []);
      if (related.size === 0) {
        return [];
      }
      return tasks.filter((t) => !t.parentId && t.tagIds.some((tId) => related.has(tId)));
    },
  );
