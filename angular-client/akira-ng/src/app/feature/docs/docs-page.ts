import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

type WorkflowGuide = Readonly<{
  name: string;
  summary: string;
  action: string;
  href: string;
  badge: string
}>;
type NavGuide = Readonly<{ label: string; description: string; href: string }>;
type FooterLink = Readonly<{ label: string; href: string; external?: boolean; fragment?: string }>;
type FooterGuide = Readonly<{
  label: string;
  description: string;
  links: ReadonlyArray<FooterLink>
}>;
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
      name: 'Dashboard',
      summary:
        'Access all relevant information and operations you need through widgets—Profile, Shelves, and Elections.',
      action: 'Open dashboard',
      href: '/dashboard',
      badge: '01',
    },
    {
      name: 'Shelves',
      summary:
        'Create curated lists and keep track of books you haven\'t found a place for, or have nominated in elections.',
      action: 'View shelves',
      href: '/shelves',
      badge: '02',
    },
    {
      name: 'Elections',
      summary:
        'Schedule ranked-choice races and vote using the ballot. Assign end dates, close elections, reopen them, and view historical victors.',
      action: 'View elections',
      href: '/elections',
      badge: '03',
    },
    {
      name: 'Docs',
      summary:
        'You\'re here! You know what this is!',
      action: 'Explore docs',
      href: '/docs',
      badge: '04',
    },
  ];

  protected readonly mainNavGuides: ReadonlyArray<NavGuide> = [
    {
      label: 'Docs',
      description: 'This page. Covers workflows, stack decisions, and case studies.',
      href: '/docs',
    },
    {
      label: 'Dashboard',
      description: 'Authenticated command center with profile, shelves, and elections widgets.',
      href: '/dashboard',
    },
    {
      label: 'Shelves',
      description: 'Full list of paginated, filterable shelves.',
      href: '/shelves',
    },
    {
      label: 'Elections',
      description: 'Ranked-choice election list plus quick access to create, close, or reopen.',
      href: '/elections',
    },
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
        {
          label: 'Social Choice Theory',
          href: 'https://en.wikipedia.org/wiki/Social_choice_theory',
          external: true,
        },
      ],
    },
    {
      label: 'Community',
      description: 'Places to file issues, chat with the team, or track release plans.',
      links: [
        { label: 'GitHub', href: 'https://github.com/grifftatarsky/SpringBonk', external: true },
        { label: 'Discord', href: '' },
        {
          label: 'Bluesky',
          href: 'https://bsky.app/profile/micro-gpt.bsky.social',
          external: true,
        },
      ],
    },
  ];

  protected readonly techHighlights: ReadonlyArray<TechHighlight> = [
    {
      title: 'Angular 20',
      detail:
        'Standalone components, modern control flow, and signal stores keep the UI fast and scalable.',
    },
    {
      title: 'NGINX BFF + OAuth 2',
      detail:
        'The browser talks to NGINX, which fronts a Spring Boot backend-for-frontend microservice so OAuth 2 + Keycloak sessions stay scoped per request.',
    },
    {
      title: 'Spring Boot on Java 24',
      detail:
        'The resource server uses virtual threads and purpose-built data structures so shelves and elections stay responsive under load.',
    },
    {
      title: 'Postgres, Docker & Pi fleet',
      detail:
        'Data lands in Postgres, containers are orchestrated with Docker + Kubernetes, and everything runs on a Raspberry Pi cluster in...uh, not a cabinet in the founder\'s house.',
    },
  ];

  protected readonly adoptionPoints: ReadonlyArray<AdoptionPoint> = [
    {
      title: 'Rapid onboarding',
      detail:
        'For any quickstart org, clone the repo, hit the dashboard, and you immediately reuse the shelves/elections flows your team already saw in the widgets. Intention is to rename the book stuff so you can customize your own candidates (people, places...things).',
    },
    {
      title: 'Preferential integrity',
      detail:
        'Ranked ballots, transparent state, and optimistic UX mean members can audit every change even when elections move fast. Intention is to add choice even to the type of ranked choice you want based on criteria.',
    },
    {
      title: 'Secure by default',
      detail:
        'Keycloak-backed auth, API guards, and typed clients keep ballots gated so that only trusted voters influence the rankings. Security is paramount!',
    },
  ];
}
