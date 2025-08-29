import { Component } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';

@Component({
  selector: 'app-login-error',
  standalone: true,
  imports: [],
  template: `
    <h1>Login Error</h1>
    <p>{{ msg }}</p>
  `,
  styles: ``,
})
export class LoginErrorView {
  msg: string = '';

  constructor(activatedRoute: ActivatedRoute) {
    activatedRoute.queryParams.subscribe((params: Params): void => {
      this.msg = params['error'];
    });
  }
}
