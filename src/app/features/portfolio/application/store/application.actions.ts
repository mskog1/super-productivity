import { createAction } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { Application } from '../application.model';
import { PersistentActionMeta } from '../../../../op-log/core/persistent-action.interface';
import { OpType } from '../../../../op-log/core/operation.types';

export const addApplication = createAction(
  '[Application] Add Application',
  (props: { application: Application }) => ({
    ...props,
    meta: {
      isPersistent: true,
      entityType: 'APPLICATION',
      entityId: props.application.id,
      opType: OpType.Create,
    } satisfies PersistentActionMeta,
  }),
);

export const updateApplication = createAction(
  '[Application] Update Application',
  (props: { application: Update<Application>; isSkipSnack?: boolean }) => ({
    ...props,
    meta: {
      isPersistent: true,
      entityType: 'APPLICATION',
      entityId: props.application.id as string,
      opType: OpType.Update,
    } satisfies PersistentActionMeta,
  }),
);

export const deleteApplication = createAction(
  '[Application] Delete Application',
  (props: { id: string }) => ({
    ...props,
    meta: {
      isPersistent: true,
      entityType: 'APPLICATION',
      entityId: props.id,
      opType: OpType.Delete,
    } satisfies PersistentActionMeta,
  }),
);

export const deleteApplications = createAction(
  '[Application] Delete multiple Applications',
  (props: { ids: string[] }) => ({
    ...props,
    meta: {
      isPersistent: true,
      entityType: 'APPLICATION',
      entityIds: props.ids,
      opType: OpType.Delete,
      isBulk: true,
    } satisfies PersistentActionMeta,
  }),
);

export const updateApplicationOrder = createAction(
  '[Application] Update Application Order',
  (props: { ids: string[] }) => ({
    ...props,
    meta: {
      isPersistent: true,
      entityType: 'APPLICATION',
      entityIds: props.ids,
      opType: OpType.Move,
      isBulk: true,
    } satisfies PersistentActionMeta,
  }),
);
