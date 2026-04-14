import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Step {
  readonly n: string;
  readonly title: string;
  readonly body: string;
}

interface Link {
  readonly label: string;
  readonly href: string;
  readonly external?: boolean;
}

@Component({
  selector: 'app-docs-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './docs-page.html',
  styleUrl: './docs-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsPage {
  protected readonly gettingStarted: ReadonlyArray<Step> = [
    {
      n: '01',
      title: 'Make a shelf',
      body:
        'Shelves are your book piles. "To read," "read," "could read," whatever. They hold books you might want to vote on later.',
    },
    {
      n: '02',
      title: 'Put books on it',
      body:
        'Search Open Library, or type one in by hand if it\'s not there. Give it a pitch if you feel strongly.',
    },
    {
      n: '03',
      title: 'Start an election',
      body:
        'Give it a title. Add an end date if you want a deadline, or leave it open-ended.',
    },
    {
      n: '04',
      title: 'Nominate candidates',
      body:
        'Pull from a shelf, search Open Library, or type one in. Anyone in your club can nominate.',
    },
    {
      n: '05',
      title: 'Rank the ballot',
      body:
        'Order the candidates from best to worst. You don\'t have to rank all of them — just the ones you have an opinion on.',
    },
    {
      n: '06',
      title: 'Close it and see the winner',
      body:
        'Akira runs an instant-runoff count and shows you the round-by-round breakdown. Read the winner. Argue about the result with your friends.',
    },
  ];

  protected readonly stack: ReadonlyArray<Link> = [
    { label: 'Angular 20 (frontend)', href: 'https://angular.dev', external: true },
    { label: 'Spring Boot 3 + Java 24 (resource server)', href: 'https://spring.io/projects/spring-boot', external: true },
    { label: 'NGINX BFF with OAuth 2', href: 'https://docs.spring.io/spring-boot/docs/current/reference/html/web.html', external: true },
    { label: 'Keycloak (auth)', href: 'https://www.keycloak.org/', external: true },
    { label: 'PostgreSQL (storage)', href: 'https://www.postgresql.org/', external: true },
    { label: 'Tailwind CSS v4', href: 'https://tailwindcss.com/', external: true },
    { label: 'Source on GitHub', href: 'https://github.com/grifftatarsky/SpringBonk', external: true },
  ];

  protected readonly reading: ReadonlyArray<Link> = [
    {
      label: 'Instant-runoff voting — Wikipedia',
      href: 'https://en.wikipedia.org/wiki/Instant-runoff_voting',
      external: true,
    },
    {
      label: 'Ranked-choice voting — Wikipedia',
      href: 'https://en.wikipedia.org/wiki/Ranked_voting',
      external: true,
    },
    {
      label: 'Social choice theory — Wikipedia',
      href: 'https://en.wikipedia.org/wiki/Social_choice_theory',
      external: true,
    },
  ];
}
