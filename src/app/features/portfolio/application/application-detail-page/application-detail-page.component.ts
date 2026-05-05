import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { ApplicationService } from '../application.service';
import {
  Application,
  ApplicationCategory,
  ApplicationCriticality,
  ApplicationStatus,
} from '../application.model';
import { selectTasksForApplication } from '../store/application.selectors';
import { Task } from '../../../tasks/task.model';
import { TagService } from '../../../tag/tag.service';
import { Tag } from '../../../tag/tag.model';

/**
 * Application 360 detail page — Aker BP fork.
 *
 * Phase 1 commit 3: skeleton. The header + edit, plus a panel showing
 * tasks linked through `relatedTagIds`. AI summary, contracts, POs,
 * decisions, meeting notes are all placeholders that light up as their
 * respective modules ship in later phases.
 *
 * Reachable at /portfolio/application/:id.
 */
@Component({
  selector: 'application-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
    MatChipsModule,
  ],
  template: `
    @if (application(); as app) {
      <section class="page">
        <a
          routerLink="/portfolio/applications"
          class="back-link"
        >
          <mat-icon>arrow_back</mat-icon>
          All applications
        </a>

        <!-- Header -->
        <header class="header">
          @if (!isEditing()) {
            <div class="header-display">
              <div class="header-title-row">
                <h1>{{ app.title }}</h1>
                @if (app.shortName) {
                  <span class="chip chip-short">{{ app.shortName }}</span>
                }
                @if (app.status) {
                  <span class="chip chip-status chip-status-{{ app.status }}">
                    {{ app.status }}
                  </span>
                }
                @if (app.criticality) {
                  <span class="chip chip-criticality-{{ app.criticality }}">
                    {{ app.criticality }} criticality
                  </span>
                }
                @if (app.isArchived) {
                  <span class="chip chip-archived">archived</span>
                }
              </div>
              <div class="header-meta">
                @if (app.category) {
                  <span>Category: {{ app.category }}</span>
                }
                @if (app.vendorId) {
                  <span>Vendor ref: {{ app.vendorId }}</span>
                }
                @if (app.primaryUrl) {
                  <span>
                    <a
                      [href]="app.primaryUrl"
                      target="_blank"
                      rel="noopener"
                    >
                      {{ app.primaryUrl }}
                    </a>
                  </span>
                }
              </div>
              <button
                mat-stroked-button
                (click)="startEdit(app)"
              >
                <mat-icon>edit</mat-icon>
                Edit
              </button>
            </div>
          } @else {
            <div class="header-edit">
              <mat-form-field appearance="outline">
                <mat-label>Title</mat-label>
                <input
                  matInput
                  [(ngModel)]="editForm.title"
                />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Short name</mat-label>
                <input
                  matInput
                  [(ngModel)]="editForm.shortName"
                />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Status</mat-label>
                <mat-select [(ngModel)]="editForm.status">
                  <mat-option [value]="undefined">—</mat-option>
                  @for (s of statuses; track s) {
                    <mat-option [value]="s">{{ s }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Category</mat-label>
                <mat-select [(ngModel)]="editForm.category">
                  <mat-option [value]="undefined">—</mat-option>
                  @for (c of categories; track c) {
                    <mat-option [value]="c">{{ c }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Criticality</mat-label>
                <mat-select [(ngModel)]="editForm.criticality">
                  <mat-option [value]="undefined">—</mat-option>
                  @for (c of criticalities; track c) {
                    <mat-option [value]="c">{{ c }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field
                appearance="outline"
                class="span-2"
              >
                <mat-label>Vendor (free text for now)</mat-label>
                <input
                  matInput
                  [(ngModel)]="editForm.vendorId"
                />
              </mat-form-field>

              <mat-form-field
                appearance="outline"
                class="span-2"
              >
                <mat-label>Primary URL</mat-label>
                <input
                  matInput
                  [(ngModel)]="editForm.primaryUrl"
                />
              </mat-form-field>

              <mat-form-field
                appearance="outline"
                class="span-2"
              >
                <mat-label>Notes</mat-label>
                <textarea
                  matInput
                  [(ngModel)]="editForm.notesText"
                  rows="4"
                ></textarea>
              </mat-form-field>

              <div class="edit-actions span-2">
                <button
                  mat-raised-button
                  color="primary"
                  (click)="saveEdit()"
                >
                  Save
                </button>
                <button
                  mat-button
                  (click)="cancelEdit()"
                >
                  Cancel
                </button>
              </div>
            </div>
          }
        </header>

        <!-- Linked tags -->
        <section class="panel">
          <h2>Linked tags</h2>
          @if (relatedTags().length === 0) {
            <p class="muted">
              No tags linked yet. Phase 1.5's migration tool will fill these in
              automatically. For now you can edit
              <code>relatedTagIds</code> via the store.
            </p>
          } @else {
            <mat-chip-set>
              @for (tag of relatedTags(); track tag.id) {
                <mat-chip>{{ tag.title }}</mat-chip>
              }
            </mat-chip-set>
          }
        </section>

        <!-- Tasks (in-flight + recent) -->
        <section class="panel">
          <h2>
            Tasks
            <span class="muted"
              >— {{ inFlightTasks().length }} in flight ·
              {{ recentDoneTasks().length }} done in last 30 days</span
            >
          </h2>

          @if (inFlightTasks().length > 0) {
            <h3>In flight</h3>
            <ul class="task-list">
              @for (task of inFlightTasks(); track task.id) {
                <li class="task-row">
                  <mat-icon class="task-icon">radio_button_unchecked</mat-icon>
                  <span class="task-title">{{ task.title }}</span>
                </li>
              }
            </ul>
          }

          @if (recentDoneTasks().length > 0) {
            <h3>Recently completed</h3>
            <ul class="task-list">
              @for (task of recentDoneTasks(); track task.id) {
                <li class="task-row done">
                  <mat-icon class="task-icon">check_circle</mat-icon>
                  <span class="task-title">{{ task.title }}</span>
                </li>
              }
            </ul>
          }

          @if (allTasks().length === 0) {
            <p class="muted">
              No tasks yet — link tags to this Application (via Edit) and tagged tasks
              will surface here.
            </p>
          }
        </section>

        <!-- Placeholder panels for upcoming modules -->
        <section class="panel placeholder">
          <h2>AI summary</h2>
          <p class="muted">Lights up in Phase 3.</p>
        </section>

        <div class="grid-2">
          <section class="panel placeholder">
            <h2>Contracts &amp; POs</h2>
            <p class="muted">Phase 6.</p>
          </section>
          <section class="panel placeholder">
            <h2>OPEX</h2>
            <p class="muted">Phase 7.</p>
          </section>
          <section class="panel placeholder">
            <h2>People</h2>
            <p class="muted">Phase 5.</p>
          </section>
          <section class="panel placeholder">
            <h2>Decisions &amp; meetings</h2>
            <p class="muted">Phase 9.</p>
          </section>
        </div>
      </section>
    } @else {
      <section class="page">
        <p>Application not found.</p>
        <a
          mat-button
          routerLink="/portfolio/applications"
          >All applications</a
        >
      </section>
    }
  `,
  styles: [
    `
      .page {
        max-width: 980px;
        margin: 0 auto;
        padding: 24px 16px;
      }
      .back-link {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: var(--color-text-soft, #888);
        text-decoration: none;
        margin-bottom: 12px;
        font-size: 0.9em;
      }
      .back-link mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
      .header {
        margin-bottom: 24px;
      }
      .header h1 {
        margin: 0;
        font-weight: 500;
      }
      .header-title-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .header-meta {
        margin: 8px 0;
        color: var(--color-text-soft, #888);
        font-size: 0.9em;
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
      }
      .chip {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 12px;
        font-size: 0.8em;
        font-weight: 500;
        background: var(--color-hover-surface, rgba(0, 0, 0, 0.06));
      }
      .chip-status-live {
        background: #d4edda;
        color: #155724;
      }
      .chip-status-onboarding {
        background: #d1ecf1;
        color: #0c5460;
      }
      .chip-status-sunsetting {
        background: #fff3cd;
        color: #856404;
      }
      .chip-status-retired {
        background: #e2e3e5;
        color: #383d41;
      }
      .chip-criticality-high {
        background: #f8d7da;
        color: #721c24;
      }
      .chip-criticality-medium {
        background: #fff3cd;
        color: #856404;
      }
      .chip-criticality-low {
        background: #d1ecf1;
        color: #0c5460;
      }
      .chip-archived {
        background: #e2e3e5;
        color: #383d41;
      }
      .header-edit {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        align-items: start;
      }
      .header-edit .span-2 {
        grid-column: 1 / -1;
      }
      .edit-actions {
        display: flex;
        gap: 8px;
      }
      .panel {
        margin: 24px 0;
        padding: 16px 20px;
        border: 1px solid var(--color-border, #e5e5e5);
        border-radius: 6px;
        background: var(--color-surface, #fff);
      }
      .panel h2 {
        margin: 0 0 12px;
        font-size: 1.1em;
        font-weight: 500;
      }
      .panel h3 {
        margin: 16px 0 4px;
        font-size: 0.95em;
        font-weight: 500;
        color: var(--color-text-soft, #888);
      }
      .panel.placeholder {
        background: var(--color-surface-alt, #fafafa);
      }
      .grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      .grid-2 .panel {
        margin: 0;
      }
      .muted {
        color: var(--color-text-soft, #888);
        font-size: 0.9em;
      }
      .task-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .task-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 0;
      }
      .task-row.done {
        color: var(--color-text-soft, #888);
        text-decoration: line-through;
      }
      .task-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
      code {
        background: var(--color-hover-surface, rgba(0, 0, 0, 0.06));
        padding: 1px 6px;
        border-radius: 3px;
        font-size: 0.85em;
      }
      @media (max-width: 720px) {
        .header-edit,
        .grid-2 {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ApplicationDetailPageComponent {
  private readonly _route = inject(ActivatedRoute);
  private readonly _store = inject(Store);
  private readonly _applicationService = inject(ApplicationService);
  private readonly _tagService = inject(TagService);

  readonly statuses = Object.values(ApplicationStatus);
  readonly categories = Object.values(ApplicationCategory);
  readonly criticalities = Object.values(ApplicationCriticality);

  private readonly _applicationId = toSignal(this._route.paramMap, {
    initialValue: undefined,
  });

  readonly application = toSignal(
    this._route.paramMap.pipe(
      switchMap((params) => {
        const id = params.get('id');
        return id ? this._applicationService.getApplicationById$(id) : of(undefined);
      }),
    ),
    { initialValue: undefined },
  );

  readonly applicationTasks = toSignal(
    this._route.paramMap.pipe(
      switchMap((params) => {
        const id = params.get('id');
        return id ? this._store.select(selectTasksForApplication(id)) : of([]);
      }),
    ),
    { initialValue: [] as Task[] },
  );

  readonly allTasks = computed(() => this.applicationTasks());

  readonly inFlightTasks = computed(() =>
    this.applicationTasks().filter((t) => !t.isDone),
  );

  private readonly _RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

  readonly recentDoneTasks = computed(() => {
    const cutoff = Date.now() - this._RECENT_WINDOW_MS;
    return this.applicationTasks().filter((t) => t.isDone && (t.doneOn ?? 0) >= cutoff);
  });

  readonly relatedTags = computed<Tag[]>(() => {
    const app = this.application();
    if (!app) {
      return [];
    }
    const ids = new Set(app.relatedTagIds ?? []);
    return this._tagService.tags().filter((t) => ids.has(t.id));
  });

  readonly isEditing = signal(false);
  editForm: Partial<Application> = {};

  startEdit(app: Application): void {
    this.editForm = {
      title: app.title,
      shortName: app.shortName,
      status: app.status,
      category: app.category,
      criticality: app.criticality,
      vendorId: app.vendorId,
      primaryUrl: app.primaryUrl,
      notesText: app.notesText,
    };
    this.isEditing.set(true);
  }

  cancelEdit(): void {
    this.isEditing.set(false);
    this.editForm = {};
  }

  saveEdit(): void {
    const app = this.application();
    if (!app) {
      return;
    }
    this._applicationService.updateApplication(app.id, this.editForm);
    this.isEditing.set(false);
  }
}
