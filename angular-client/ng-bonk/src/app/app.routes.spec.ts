import { routes } from './app.routes';

describe('App Routes', () => {
  it('should define shelves route with child detail', () => {
    const shelves = routes.find(r => r.path === 'shelves');
    expect(shelves).toBeTruthy();
    expect(shelves?.children).toBeTruthy();
    const detail = shelves?.children?.find(c => c.path === ':id');
    expect(detail).toBeTruthy();
  });
});
