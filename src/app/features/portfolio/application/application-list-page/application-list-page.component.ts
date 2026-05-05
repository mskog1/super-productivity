import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApplicationService } from '../application.service';
import { Application } from '../application.model';

/**
 * Minimal first-cut list page for Applications. Aker BP fork.
 *
 * Phase 1 commit 2 — just enough UI to verify the data layer end-to-end:
 * add an Application, see it persist, delete it. Polish (categories,
 * criticality, vendor lookups, the 360 view, etc.) lands in later commits.
 *
 * Reachable at /portfolio/applications.
 */
@Component({
  selector: 'application-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatTooltipModule,
  ],
  template: `
    <section class="page">
      <header class="page-header">
        <div class="header-row">
          <h1>Applications</h1>
          <a
            mat-stroked-button
            routerLink="/portfolio/migrate"
          >
            <mat-icon>upgrade</mat-icon>
            Migrate tags
          </a>
        </div>
        <p class="muted">
          Aker BP portfolio &mdash; {{ applications().length }} total &middot;
          {{ activeCount() }} active
        </p>
      </header>

      @if (!isAdding()) {
        <button
          mat-raised-button
          color="primary"
          (click)="startAdd()"
        >
          <mat-icon>add</mat-icon>
          Add application
        </button>
      } @else {
        <div class="add-row">
          <mat-form-field
            appearance="outline"
            class="add-input"
          >
            <mat-label>Application title</mat-label>
            <input
              matInput
              [(ngModel)]="newTitle"
              (keydown.enter)="confirmAdd()"
              (keydown.escape)="cancelAdd()"
              placeholder="e.g. Ivalua"
              autocomplete="off"
              #titleInput
              autofocus
            />
          </mat-form-field>
          <button
            mat-raised-button
            color="primary"
            (click)="confirmAdd()"
            [disabled]="!newTitle.trim()"
          >
            Save
          </button>
          <button
            mat-button
            (click)="cancelAdd()"
          >
            Cancel
          </button>
        </div>
      }

      @if (applications().length === 0) {
        <div class="empty-state">
          <mat-icon>inventory_2</mat-icon>
          <p>No applications yet.</p>
          <p class="muted">
            Add your first one above &mdash; or wait for the migration tool in Phase 1.5
            to convert your existing tags in bulk.
          </p>
        </div>
      } @else {
        <ul class="app-list">
          @for (app of applications(); track app.id) {
            <li class="app-row">
              <a
                class="app-main"
                [routerLink]="['/portfolio/application', app.id]"
              >
                <div class="app-title">{{ app.title }}</div>
                @if (app.shortName) {
                  <div class="app-meta">{{ app.shortName }}</div>
                }
                <div class="app-meta">
                  Created {{ app.createdAt | date: 'mediumDate' }}
                </div>
              </a>
              <div class="app-actions">
                @if (app.isArchived) {
                  <button
                    mat-button
                    (click)="restore(app)"
                    matTooltip="Restore from archive"
                  >
                    <mat-icon>unarchive</mat-icon>
                    Restore
                  </button>
                } @else {
                  <button
                    mat-button
                    (click)="archive(app)"
                    matTooltip="Soft-archive (reversible)"
                  >
                    <mat-icon>archive</mat-icon>
                    Archive
                  </button>
                }
                <button
                  mat-icon-button
                  (click)="deleteApp(app)"
                  matTooltip="Delete permanently"
                >
                  <mat-icon>delete_outline</mat-icon>
                </button>
              </div>
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: [
    `
      .page {
        max-width: 880px;
        margin: 0 auto;
        padding: 24px 16px;
      }
      .page-header h1 {
        margin: 0;
        font-weight: 500;
      }
      .header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 4px;
      }
      .muted {
        color: var(--color-text-soft, #888);
        font-size: 0.9em;
        margin: 0;
      }
      .add-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 16px 0;
      }
      .add-input {
        flex: 1;
        max-width: 480px;
      }
      .empty-state {
        text-align: center;
        padding: 48px 16px;
        color: var(--color-text-soft, #888);
      }
      .empty-state mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        opacity: 0.5;
      }
      .app-list {
        list-style: none;
        padding: 0;
        margin: 24px 0 0;
      }
      .app-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid var(--color-border, #e5e5e5);
      }
      .app-row:hover {
        background: var(--color-hover-surface, rgba(0, 0, 0, 0.03));
      }
      .app-main {
        flex: 1;
        text-decoration: none;
        color: inherit;
        cursor: pointer;
      }
      .app-main:hover .app-title {
        text-decoration: underline;
      }
      .app-title {
        font-weight: 500;
      }
      .app-meta {
        font-size: 0.85em;
        color: var(--color-text-soft, #888);
      }
      .app-actions {
        display: flex;
        align-items: center;
        gap: 4px;
      }
    `,
  ],
})
export class ApplicationListPageComponent {
  private readonly _applicationService = inject(ApplicationService);

  readonly applications = this._applicationService.applicationsSortedForUI;
  readonly activeCount = computed(
    () => this.applications().filter((a) => !a.isArchived).length,
  );

  readonly isAdding = signal(false);
  newTitle = '';

  startAdd(): void {
    this.newTitle = '';
    this.isAdding.set(true);
  }

  cancelAdd(): void {
    this.newTitle = '';
    this.isAdding.set(false);
  }

  confirmAdd(): void {
    const title = this.newTitle.trim();
    if (!title) {
      return;
    }
    this._applicationService.addApplication({ title });
    this.cancelAdd();
  }

  archive(app: Application): void {
    this._applicationService.archiveApplication(app.id);
  }

  restore(app: Application): void {
    this._applicationService.restoreApplication(app.id);
  }

  deleteApp(app: Application): void {
    // No confirmation dialog yet — Phase 1 polish will add one.
    this._applicationService.deleteApplication(app.id);
  }
}
