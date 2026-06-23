import { ChangeDetectionStrategy, Component, HostListener, output } from '@angular/core';

/**
 * "How to play" panel for President — the house rules, opened from the table's
 * "?" button. Presentational only: emits {@link close} on backdrop click,
 * the close button, or Escape.
 */
@Component({
  selector: 'app-rules-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="backdrop" (click)="close.emit()" aria-hidden="true"></div>
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="rules-title">
      <header class="head">
        <div>
          <h2 id="rules-title" class="title">How to play President</h2>
          <p class="sub">House rules · two decks, no jokers · 104 cards</p>
        </div>
        <button type="button" class="close" aria-label="Close" (click)="close.emit()">✕</button>
      </header>

      <div class="body">
        <section>
          <h3>The goal</h3>
          <p>
            Shed all your cards. The first player out is <strong>President</strong>, the
            last one stuck with cards is the <strong>Asshole</strong>. With four or more
            players, second-out is <strong>Vice-President</strong> and second-to-last is
            <strong>Vice-Asshole</strong>; everyone else is a Citizen.
          </p>
        </section>

        <section>
          <h3>Card order</h3>
          <p>
            Low to high: <span class="mono">3 4 5 6 7 8 9 10 J Q K A</span> — then the
            <strong>2</strong>, which is trump. A single 2 beats anything.
          </p>
        </section>

        <section>
          <h3>Playing a trick</h3>
          <ul>
            <li>The leader plays a set of one rank — a single, pair, triple, etc. That
              <strong>count</strong> holds for the whole trick: everyone must play that many cards.</li>
            <li>On your turn, play a set of the same count that is
              <strong>equal to or higher</strong> than the set on top — or <strong>pass</strong>.</li>
            <li><strong>Passing locks you out</strong> for the rest of the trick.</li>
            <li>A <strong>single 2</strong> can always be played to end the trick at once.</li>
            <li>The <strong>winner</strong> of a trick clears the pile and leads the next one.
              The <strong>Asshole</strong> leads the first trick of each round.</li>
          </ul>
        </section>

        <section>
          <h3>Skips — playing equal rank</h3>
          <p>
            Matching the rank on top <strong>skips the next N players</strong>, where N is the
            number of cards. Playing <em>higher</em> just passes to the next player.
          </p>
          <ul>
            <li>You lead a pair of 3s; the next player matches with a pair of 3s → the
              following <strong>two</strong> players are skipped.</li>
            <li>If a skip comes all the way back to you (everyone else skipped), you can't
              play on your own cards — so you <strong>win the trick</strong> and lead again.
              In a 4-player game, three-of-a-kind on three-of-a-kind closes the trick.</li>
          </ul>
        </section>

        <section>
          <h3>The wild 7</h3>
          <p>
            A 7 is wild <strong>only when played with another card</strong> — then it copies
            that card's rank. A lone 7 is just a 7.
          </p>
          <ul>
            <li><span class="mono">3 + 7</span> = a pair of 3s</li>
            <li><span class="mono">J + J + 7</span> = three Jacks</li>
            <li><span class="mono">7 + 7</span> = a natural pair of 7s</li>
          </ul>
        </section>

        <section>
          <h3>You can't win on a 2</h3>
          <p>
            The 2 ends tricks, but you can't go out on one. If the last card you shed is a
            <strong>2</strong>, you don't finish — you drop to last place
            (<strong>Asshole</strong>), even if you were about to win.
          </p>
        </section>

        <section>
          <h3>The swap (start of each round)</h3>
          <ul>
            <li>Asshole gives the President their <strong>two best</strong> cards (2s first,
              then Aces). President gives back <strong>any two</strong> cards.</li>
            <li>Vice-Asshole gives the Vice-President their <strong>single best</strong> card.
              Vice-President gives back <strong>any one</strong> card.</li>
          </ul>
        </section>
      </div>
    </div>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 60;
      display: grid;
      place-items: center;
      padding: 1.25rem;
    }
    .backdrop {
      position: absolute;
      inset: 0;
      background: color-mix(in srgb, var(--color-fg, #000) 45%, transparent);
      backdrop-filter: blur(2px);
    }
    .dialog {
      position: relative;
      width: min(36rem, 100%);
      max-height: min(82vh, 44rem);
      display: flex;
      flex-direction: column;
      border-radius: 0.9rem;
      border: 1px solid var(--color-rule, #1f1f23);
      background: var(--color-bg, #0a0a0b);
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
      color: var(--color-fg, #f4f4f5);
    }
    .head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      padding: 1.1rem 1.25rem 0.75rem;
      border-bottom: 1px solid var(--color-rule, #1f1f23);
    }
    .title {
      font-size: 1.15rem;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    .sub {
      margin-top: 0.15rem;
      font-size: 0.75rem;
      color: var(--color-fg-subtle, #8a8a8f);
    }
    .close {
      flex: none;
      display: grid;
      place-items: center;
      width: 1.9rem;
      height: 1.9rem;
      border-radius: 0.45rem;
      color: var(--color-fg-muted, #a1a1aa);
      transition: background 0.15s, color 0.15s;
    }
    .close:hover {
      background: var(--color-bg-subtle, #111113);
      color: var(--color-fg, #f4f4f5);
    }
    .body {
      overflow-y: auto;
      padding: 0.5rem 1.25rem 1.25rem;
    }
    section {
      margin-top: 1.1rem;
    }
    h3 {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--color-fg-subtle, #8a8a8f);
    }
    p {
      margin-top: 0.4rem;
      font-size: 0.875rem;
      line-height: 1.55;
      color: var(--color-fg-muted, #a1a1aa);
    }
    ul {
      margin-top: 0.4rem;
      padding-left: 1.1rem;
      list-style: disc;
    }
    li {
      margin-top: 0.3rem;
      font-size: 0.875rem;
      line-height: 1.5;
      color: var(--color-fg-muted, #a1a1aa);
    }
    strong {
      color: var(--color-fg, #f4f4f5);
      font-weight: 600;
    }
    .mono {
      font-family: var(--font-mono, ui-monospace, monospace);
      font-size: 0.82em;
      color: var(--color-fg, #f4f4f5);
    }
  `,
})
export class RulesDialog {
  readonly close = output<void>();

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.close.emit();
  }
}
