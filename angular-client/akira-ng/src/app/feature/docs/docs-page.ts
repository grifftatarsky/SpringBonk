import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

type WorkflowGuide = Readonly<{ name: string; summary: string; action: string; href: string; badge: string }>;
type NavGuide = Readonly<{ label: string; description: string; href: string }>;
type FooterLink = Readonly<{ label: string; href: string; external?: boolean; fragment?: string }>;
type FooterGuide = Readonly<{ label: string; description: string; links: ReadonlyArray<FooterLink> }>;
type TechHighlight = Readonly<{ title: string; detail: string }>;
type AdoptionPoint = Readonly<{ title: string; detail: string }>;

@Component({
  selector: 'app-docs-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './docs-page.html',
  styleUrl: './docs-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsPage {
  protected readonly workflowGuides: ReadonlyArray<WorkflowGuide> = [
    {
      name: 'Dashboard overview',
      summary:
        'Centralizes profile data, the shelf widget, and elections widget so you can see live status before drilling in.',
      action: 'Open dashboard',
      href: '/dashboard',
      badge: '01',
    },
    {
      name: 'Shelves service',
      summary:
        'Create curated book collections, search Open Library, and feed nominations directly into elections from default shelves.',
      action: 'View shelves',
      href: '/shelves',
      badge: '02',
    },
    {
      name: 'Election control',
      summary:
        'Spin up ranked-choice elections, reopen or close them, and manage candidate pools sourced from shelves or custom entries.',
      action: 'Review elections',
      href: '/elections',
      badge: '03',
    },
    {
      name: 'Book detail flyout',
      summary:
        'Use /books/:id to inspect metadata, confirm ISBNs, and keep members aligned on the edition that will hit the ballot.',
      action: 'Inspect a book',
      href: '/books/ol12345m',
      badge: '04',
    },
  ];

  protected readonly mainNavGuides: ReadonlyArray<NavGuide> = [
    { label: 'Docs', description: 'This page. Covers workflows, stack decisions, and case studies.', href: '/docs' },
    { label: 'Dashboard', description: 'Authenticated command center with profile, shelves, and elections widgets.', href: '/dashboard' },
    { label: 'Shelves', description: 'Full list of curated shelves with filtering, paging, and Pip-Boy list styling.', href: '/shelves' },
    { label: 'Elections', description: 'Ranked-choice election list plus quick access to create, close, or reopen.', href: '/elections' },
  ];

  protected readonly footerGuides: ReadonlyArray<FooterGuide> = [
    {
      label: 'Case studies',
      description: 'Deep dives on real deployments that show how ranked-choice fits clubs and civic orgs.',
      links: [
        { label: 'Bonk! Book Club', href: '/docs', fragment: 'case-study' },
      ],
    },
    {
      label: 'Resources',
      description: 'Reference material that grounds the product decisions in established research.',
      links: [
        { label: 'Social Choice Theory', href: 'https://en.wikipedia.org/wiki/Social_choice_theory', external: true },
      ],
    },
    {
      label: 'Community',
      description: 'Places to file issues, chat with the team, or track release plans.',
      links: [
        { label: 'GitHub', href: 'https://github.com/grifftatarsky/SpringBonk', external: true },
        { label: 'Discord', href: '' },
        { label: 'Bluesky', href: 'https://bsky.app/profile/micro-gpt.bsky.social', external: true },
      ],
    },
  ];

  protected readonly techHighlights: ReadonlyArray<TechHighlight> = [
    {
      title: 'Angular 20 + signals',
      detail:
        'Standalone components, Control Flow syntax, and signal-based stores keep the UI reactive without zone overhead.',
    },
    {
      title: 'Tailwind 4 Pip-Boy aesthetic',
      detail:
        'Green-on-black palette, neon glows, and thin borders mirror the Pip-Boy HUD for every widget and marketing page.',
    },
    {
      title: 'NgRx-style stores',
      detail:
        'Store classes use inject(), effects, and typed actions to orchestrate HTTP calls with optimistic updates and toasts.',
    },
    {
      title: 'Spring resource server',
      detail:
        'Shelf, Book, and Election HTTP services talk to the Spring backend with proper auth tokens and pagination helpers.',
    },
  ];

  protected readonly adoptionPoints: ReadonlyArray<AdoptionPoint> = [
    {
      title: 'Rapid onboarding',
      detail:
        'For any quickstart org, clone the repo, hit the dashboard, and you immediately reuse the shelves/elections flows your team already saw in the widgets.',
    },
    {
      title: 'Preferential integrity',
      detail:
        'Ranked ballots, transparent state, and optimistic UX mean members can audit every change even when elections move fast.',
    },
    {
      title: 'Secure by default',
      detail:
        'Keycloak-backed auth, API guards, and typed clients keep ballots gated so that only trusted voters influence the rankings.',
    },
  ];
}
