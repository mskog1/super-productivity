/**
 * Application — Aker BP fork's portfolio-management entity.
 *
 * An Application represents a business application that an Application Service
 * Manager is responsible for. It is the central organising unit for the
 * portfolio modules: tasks, contracts, POs, decisions, meetings, and AI
 * summaries are all linked to an Application.
 *
 * See `docs/decisions/ADR-001-application-extends-tag.md` in the project root
 * for why Application is its own entity and not an extension of Project or
 * Tag. The short version: tasks belong to multiple Applications via the
 * existing `task.tagIds` field, and `application.relatedTagIds` is the link
 * back. Application's own `taskIds` is *not* a source of truth for membership.
 */
import { EntityState } from '@ngrx/entity';

export enum ApplicationCategory {
  Core = 'core',
  Supporting = 'supporting',
  Pilot = 'pilot',
  Sunset = 'sunset',
  Evaluation = 'evaluation',
}

export enum ApplicationCriticality {
  High = 'high',
  Medium = 'medium',
  Low = 'low',
}

export enum ApplicationStatus {
  Live = 'live',
  Onboarding = 'onboarding',
  Sunsetting = 'sunsetting',
  Retired = 'retired',
}

export interface ApplicationLink {
  label: string;
  url: string;
}

export interface ApplicationAISummary {
  generatedAt: number;
  modelUsed: string;
  currentStateMd: string;
  ongoingWorkBullets: string[];
  recentCompletionsBullets: string[];
  openRisks?: string[];
  tokensInput: number;
  tokensOutput: number;
  promptHash: string;
  /** When true, AI generation is disabled for this Application. */
  isDisabled?: boolean;
}

export interface ApplicationCopy {
  // Identity
  id: string;
  title: string;
  shortName?: string;

  // Visual
  icon?: string | null;
  color?: string | null;

  // Portfolio metadata
  vendorId?: string;
  category?: ApplicationCategory;
  criticality?: ApplicationCriticality;
  status?: ApplicationStatus;

  // People
  businessOwnerPersonId?: string;
  technicalContactPersonId?: string;

  // Lifecycle
  inServiceFrom?: string; // YYYY-MM-DD
  plannedSunsetAt?: string; // YYYY-MM-DD

  // Cross-references — IDs only, real data lives in their own feature stores
  contractIds?: string[];
  purchaseOrderIds?: string[];
  decisionIds?: string[];
  meetingNoteIds?: string[];
  /**
   * Tag IDs whose tagged tasks belong to this Application.
   * KEY: this is the link between the legacy tag-based workflow and the
   * Application abstraction. A task belongs to this Application iff at least
   * one of its `task.tagIds` is present in `relatedTagIds`.
   */
  relatedTagIds?: string[];

  // Operational
  primaryUrl?: string;
  internalDocsUrl?: string;
  notesText?: string;
  links?: ApplicationLink[];

  // AI summary state — never user-edited directly
  aiSummary?: ApplicationAISummary;

  // Bookkeeping
  createdAt: number;
  updatedAt: number;

  // Soft-archive (rather than hard-delete) for retired applications
  isArchived?: boolean;
}

export type Application = Readonly<ApplicationCopy>;

export type ApplicationState = EntityState<Application>;
