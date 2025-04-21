import { Component } from '@angular/core';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [],
  template: ` <p>
    This application is a show-case for an Angular app consuming a REST API
    through an OAuth2 BFF.
  </p>`,
  styles: ``,
})
export class AboutView {}
