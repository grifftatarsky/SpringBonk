import { routes } from './app.routes';
import { Route } from '@angular/router';

describe('App Routes', (): void => {
  it('should define shelves route with child detail', (): void => {
    const shelves: Route | undefined = routes.find(
      (r: Route): boolean => r.path === 'shelves'
    );
    expect(shelves).toBeTruthy();
    expect(shelves?.children).toBeTruthy();
    const detail: Route | undefined = shelves?.children?.find(
      (c: Route): boolean => c.path === ':id'
    );
    expect(detail).toBeTruthy();
  });
});
