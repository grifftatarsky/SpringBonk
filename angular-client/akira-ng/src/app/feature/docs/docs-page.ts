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
      name: 'Dashboard operations',
      summary:
        'Audit your authenticated profile, avatar picker, and toast telemetry while watching shelves and elections update live.',
      action: 'Open dashboard',
      href: '/dashboard',
      badge: '01',
    },
    {
      name: 'Shelf intelligence',
      summary:
        'Create curated lists, paginate them Pip-Boy style, and feed the nominations widget so ballots stay aligned with current reading moods.',
      action: 'View shelves',
      href: '/shelves',
      badge: '02',
    },
    {
      name: 'Election control',
      summary:
        'Schedule ranked-choice races, reopen or close them, and manage candidate pools backed by shelves, Open Library search, or custom entries.',
      action: 'Review elections',
      href: '/elections',
      badge: '03',
    },
    {
      name: 'Docs & telemetry',
      summary:
        'Need the architecture map or troubleshooting steps? Everything lives here so you can stay oriented while shipping features.',
      action: 'Explore docs',
      href: '/docs',
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
        'Standalone components, modern control flow, and signal stores keep the UI fast with OnPush change detection and zero zone overhead.',
    },
    {
      title: 'NGINX BFF + OAuth 2',
      detail:
        'The browser talks to NGINX, which fronts a backend-for-frontend so OAuth 2 + Keycloak sessions stay scoped per request.',
    },
    {
      title: 'Spring Boot on Java 24',
      detail:
        'The resource server uses virtual threads and purpose-built data structures so shelves and elections stay responsive under load.',
    },
    {
      title: 'Postgres, Docker & Pi fleet',
      detail:
        'Data lands in Postgres, containers are orchestrated with Docker + Kubernetes, and everything runs on a Raspberry Pi cluster in an undisclosed location.',
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
