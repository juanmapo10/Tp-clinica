import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'imagenTemporal',
  standalone: true
})
export class ImagenTemporalPipe implements PipeTransform {
  transform(file: File): string {
    return URL.createObjectURL(file);
  }
}
