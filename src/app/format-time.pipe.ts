import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatTime',
  standalone: true,
})
export class FormatTimePipe implements PipeTransform {
  transform(value: number): string {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)} segundos`;
    }
    return `${value} milisegundos`;
  }
}
