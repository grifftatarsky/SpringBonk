import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { MyReviewsWidgetComponent } from './my-reviews-widget.component';
import { ReviewHttpService } from '../../../common/http/review-http.service';
import { ReviewResponse } from '../../../model/response/review-response.model';
import { UserService } from '../../../auth/user.service';
import { User } from '../../../auth/user.model';
import { createSpyObj, type SpyObj } from '../../../testing/mock';

const review: ReviewResponse = {
  id: 'r1',
  authorId: 'u1',
  authorName: 'Jane Doe',
  bookId: 'b1',
  bookTitle: 'Dune',
  bookAuthor: 'Frank Herbert',
  bookImageUrl: '',
  rating: 4,
  body: 'Sandworms are a hell of a drug.\nSecond line should not show.',
  createdDate: '2025-01-01T00:00:00Z',
  updatedDate: '2025-01-01T00:00:00Z',
  likeCount: 2,
  likedByMe: false,
  commentCount: 1,
};

function pageOf(items: ReviewResponse[], totalElements = items.length) {
  return { content: items, page: { number: 0, size: 5, totalElements, totalPages: 1 } };
}

describe('MyReviewsWidgetComponent', () => {
  let fixture: ComponentFixture<MyReviewsWidgetComponent>;
  let http: SpyObj<ReviewHttpService>;

  function setup(user: User): void {
    http = createSpyObj<ReviewHttpService>(['getReviewsByAuthor']);
    http.getReviewsByAuthor.mockReturnValue(of(pageOf([review])));

    const userService = {
      valueChanges: new BehaviorSubject<User>(user).asObservable(),
      current: user,
    } as unknown as UserService;

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ReviewHttpService, useValue: http },
        { provide: UserService, useValue: userService },
      ],
    });
  }

  function render(): void {
    fixture = TestBed.createComponent(MyReviewsWidgetComponent);
    fixture.detectChanges();
  }

  const signedIn = new User('u1', 'Jane Doe', 'jane@example.com', [], 'BONKLING_PLUM');

  it('loads the signed-in user\'s reviews on init', async () => {
    setup(signedIn);
    render();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(http.getReviewsByAuthor).toHaveBeenCalledWith('u1', 0, 5);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Dune');
  });

  it('links each review to its book', async () => {
    setup(signedIn);
    render();
    await fixture.whenStable();
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href]');
    expect(link?.getAttribute('href')).toBe('/books/b1');
  });

  it('shows only the first line of the body', async () => {
    setup(signedIn);
    render();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Sandworms are a hell of a drug.');
    expect(text).not.toContain('Second line should not show.');
  });

  it('reports how many reviews are not shown', async () => {
    setup(signedIn);
    http.getReviewsByAuthor.mockReturnValue(of(pageOf([review], 8)));
    render();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('+ 7 more reviews');
  });

  it('does not call the API when nobody is signed in', async () => {
    setup(User.ANONYMOUS);
    render();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(http.getReviewsByAuthor).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Sign in to see your reviews');
  });

  it('surfaces a load failure instead of an empty state', async () => {
    setup(signedIn);
    http.getReviewsByAuthor.mockReturnValue(throwError(() => new Error('boom')));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Unable to load your reviews');
    expect(text).not.toContain("You haven't reviewed anything yet");
  });
});
