import { Pipe, PipeTransform } from '@angular/core';


@Pipe({
  name: 'emailDomain',
  standalone: true,
})
export class EmailDomainPipe implements PipeTransform {
  transform(email: string): string {
    const dominio = email.split('@')[1];
    return `@${dominio}`;
  }
}
