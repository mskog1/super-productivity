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
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { TagService } from '../../tag/tag.service';
import { Tag } from '../../tag/tag.model';
import { ApplicationService } from '../application/application.service';
import {
  Application,
  ApplicationCategory,
  ApplicationCriticality,
  ApplicationStatus,
} from '../application/application.model';
import { selectAllTasks } from '../../tasks/store/task.selectors';
import { Task } from '../../tasks/task.model';

interface TagWithStats {
  tag: Tag;
  taskCount: number;
  /** The Application that already links to this tag, if any. */
  linkedApplication: Application | undefined;
}

interface ConvertForm {
  title: string;
  shortName: string;
  status: ApplicationStatus | undefined;
  category: ApplicationCategory | undefined;
  criticality: ApplicationCriticality | undefined;
  vendorId: string;
}

/**
 * Migration page — Aker BP fork, Phase 1.5 commit 1.
 *
 * Converts existing SP tags into Applications. Non-breaking: the tag stays,
 * the Application gains a relatedTagIds pointer, tagged tasks light up
 * automatically on the Application's 360 view.
 *
 * v1 scope: per-tag manual conversion only. The merge flow and AI-assisted
 * metadata suggestions ship in commit 2 (after Phase 3 wires up Anthropic
 * API access).
 *
 * Reachable at /portfolio/migrate.
 */
@Component({
  selector: 'portfolio-migration-page',
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
    MatExpansionModule,
  ],
  template: `
    <section class="page">
      <header class="page-header">
        <a
          routerLink="/portfolio/applications"
          class="back-link"
        >
          <mat-icon>arrow_back</mat-icon>
          Applications
        </a>
        <h1>Migrate tags to Applications</h1>
        <p class="muted">
          Each tag in your Super Productivity install can become an Application — adding
          portfolio metadata (vendor, category, criticality) without breaking your
          existing tag-based workflow. Tasks stay tagged; the Application gains a pointer
          back to the tag.
        </p>
        <p class="muted">
          <strong>{{ convertedCount() }}</strong> of
          <strong>{{ tagsWithStats().length }}</strong> tags converted.
        </p>
      </header>

      <!-- Pending tags -->
      <h2>Not yet converted ({{ pendingTags().length }})</h2>
      @if (pendingTags().length === 0) {
        <p class="muted empty">All tags converted. Nothing to do here.</p>
      } @else {
        <ul class="tag-list">
          @for (item of pendingTags(); track item.tag.id) {
            <li class="tag-row">
              @if (activeFormFor() !== item.tag.id) {
                <div class="tag-summary">
                  <div>
                    <div class="tag-title">{{ item.tag.title }}</div>
                    <div class="tag-meta">
                      {{ item.taskCount }} task{{ item.taskCount === 1 ? '' : 's' }}
                    </div>
                  </div>
                  <button
                    mat-raised-button
                    color="primary"
                    (click)="startConvert(item.tag)"
                  >
                    Convert
                  </button>
                </div>
              } @else {
                <div class="convert-form">
                  <h3>Convert "{{ item.tag.title }}" to Application</h3>
                  <div class="form-grid">
                    <mat-form-field appearance="outline">
                      <mat-label>Application title</mat-label>
                      <input
                        matInput
                        [(ngModel)]="form.title"
                      />
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Short name</mat-label>
                      <input
                        matInput
                        [(ngModel)]="form.shortName"
                      />
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Status</mat-label>
                      <mat-select [(ngModel)]="form.status">
                        <mat-option [value]="undefined">—</mat-option>
                        @for (s of statuses; track s) {
                          <mat-option [value]="s">{{ s }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Category</mat-label>
                      <mat-select [(ngModel)]="form.category">
                        <mat-option [value]="undefined">—</mat-option>
                        @for (c of categories; track c) {
                          <mat-option [value]="c">{{ c }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Criticality</mat-label>
                      <mat-select [(ngModel)]="form.criticality">
                        <mat-option [value]="undefined">—</mat-option>
                        @for (c of criticalities; track c) {
                          <mat-option [value]="c">{{ c }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Vendor</mat-label>
                      <input
                        matInput
                        [(ngModel)]="form.vendorId"
                      />
                    </mat-form-field>
                  </div>
                  <div class="form-actions">
                    <button
                      mat-raised-button
                      color="primary"
                      (click)="confirmConvert(item.tag)"
                      [disabled]="!form.title.trim()"
                    >
                      Save &amp; convert
                    </button>
                    <button
                      mat-button
                      (click)="cancelConvert()"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              }
            </li>
          }
        </ul>
      }

      <!-- Already converted -->
      @if (convertedTags().length > 0) {
        <h2>Already converted ({{ convertedTags().length }})</h2>
        <ul class="tag-list">
          @for (item of convertedTags(); track item.tag.id) {
            <li class="tag-row converted">
              <div class="tag-summary">
                <div>
                  <div class="tag-title">{{ item.tag.title }}</div>
                  <div class="tag-meta">
                    {{ item.taskCount }} task{{ item.taskCount === 1 ? '' : 's' }}
                    &middot; linked to
                    <a
                      [routerLink]="[
                        '/portfolio/application',
                        item.linkedApplication!.id,
                      ]"
                    >
                      {{ item.linkedApplication!.title }}
                    </a>
                  </div>
                </div>
                <mat-icon class="check-icon">check_circle</mat-icon>
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
      .back-link {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: var(--color-text-soft, #888);
        text-decoration: none;
        font-size: 0.9em;
        margin-bottom: 8px;
      }
      .back-link mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
      .page-header h1 {
        margin: 0 0 8px;
        font-weight: 500;
      }
      .muted {
        color: var(--color-text-soft, #888);
        font-size: 0.9em;
        margin: 4px 0;
      }
      .empty {
        padding: 24px 0;
        text-align: center;
      }
      h2 {
        margin: 32px 0 8px;
        font-size: 1.05em;
        font-weight: 500;
        color: var(--color-text-soft, #888);
      }
      .tag-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .tag-row {
        border-bottom: 1px solid var(--color-border, #e5e5e5);
      }
      .tag-row.converted {
        opacity: 0.7;
      }
      .tag-summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
      }
      .tag-row:hover .tag-summary {
        background: var(--color-hover-surface, rgba(0, 0, 0, 0.03));
      }
      .tag-title {
        font-weight: 500;
      }
      .tag-meta {
        font-size: 0.85em;
        color: var(--color-text-soft, #888);
      }
      .check-icon {
        color: #4caf50;
      }
      .convert-form {
        padding: 16px;
        background: var(--color-surface-alt, #fafafa);
      }
      .convert-form h3 {
        margin: 0 0 12px;
        font-weight: 500;
      }
      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .form-actions {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }
      @media (max-width: 720px) {
        .form-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class PortfolioMigrationPageComponent {
  private readonly _store = inject(Store);
  private readonly _tagService = inject(TagService);
  private readonly _applicationService = inject(ApplicationService);

  readonly statuses = Object.values(ApplicationStatus);
  readonly categories = Object.values(ApplicationCategory);
  readonly criticalities = Object.values(ApplicationCriticality);

  private readonly _tags = this._tagService.tagsNoMyDayAndNoListSorted;
  private readonly _applications = this._applicationService.applications;

  private readonly _allTasks = toSignal(this._store.select(selectAllTasks), {
    initialValue: [] as Task[],
  });

  /** Map tagId -> count of (parent) tasks tagged with it. */
  private readonly _taskCountsByTag = computed<Map<string, number>>(() => {
    const counts = new Map<string, number>();
    for (const task of this._allTasks()) {
      if (task.parentId) {
        continue;
      }
      for (const tagId of task.tagIds) {
        counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
      }
    }
    return counts;
  });

  /** Map tagId -> Application that already links to it (first match wins). */
  private readonly _appByTag = computed<Map<string, Application>>(() => {
    const map = new Map<string, Application>();
    for (const app of this._applications()) {
      for (const tagId of app.relatedTagIds ?? []) {
        if (!map.has(tagId)) {
          map.set(tagId, app);
        }
      }
    }
    return map;
  });

  readonly tagsWithStats = computed<TagWithStats[]>(() => {
    const counts = this._taskCountsByTag();
    const linked = this._appByTag();
    return this._tags().map((tag) => ({
      tag,
      taskCount: counts.get(tag.id) ?? 0,
      linkedApplication: linked.get(tag.id),
    }));
  });

  readonly pendingTags = computed(() =>
    this.tagsWithStats()
      .filter((item) => !item.linkedApplication)
      .sort((a, b) => b.taskCount - a.taskCount),
  );

  readonly convertedTags = computed(() =>
    this.tagsWithStats()
      .filter((item) => !!item.linkedApplication)
      .sort((a, b) => a.tag.title.localeCompare(b.tag.title)),
  );

  readonly convertedCount = computed(() => this.convertedTags().length);

  readonly activeFormFor = signal<string | undefined>(undefined);
  form: ConvertForm = this._emptyForm();

  startConvert(tag: Tag): void {
    this.form = {
      title: tag.title,
      shortName: '',
      status: undefined,
      category: undefined,
      criticality: undefined,
      vendorId: '',
    };
    this.activeFormFor.set(tag.id);
  }

  cancelConvert(): void {
    this.activeFormFor.set(undefined);
    this.form = this._emptyForm();
  }

  confirmConvert(tag: Tag): void {
    const title = this.form.title.trim();
    if (!title) {
      return;
    }
    this._applicationService.addApplication({
      title,
      shortName: this.form.shortName.trim() || undefined,
      status: this.form.status,
      category: this.form.category,
      criticality: this.form.criticality,
      vendorId: this.form.vendorId.trim() || undefined,
      relatedTagIds: [tag.id],
    });
    this.cancelConvert();
  }

  private _emptyForm(): ConvertForm {
    return {
      title: '',
      shortName: '',
      status: undefined,
      category: undefined,
      criticality: undefined,
      vendorId: '',
    };
  }
}
