import { Directive, ElementRef, HostListener, Input, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appImagePreview]',
  standalone: true
})
export class ImagePreviewDirective {
  @Input() maxFiles = 2;
  private previewContainer: HTMLElement | null = null;

  constructor(
    private el: ElementRef, 
    private renderer: Renderer2
  ) {}

  @HostListener('change', ['$event']) 
  onChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    
    // Remove existing previews
    if (this.previewContainer) {
      this.renderer.removeChild(this.el.nativeElement.parentNode, this.previewContainer);
      this.previewContainer = null;
    }

    if (!files) return;

    // Create preview container
    this.previewContainer = this.renderer.createElement('div');
    this.renderer.addClass(this.previewContainer, 'image-preview');

    // Check file count
    if (files.length > this.maxFiles) {
      alert(`Solo se permiten ${this.maxFiles} archivos`);
      input.value = '';
      return;
    }

    // Create image previews
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const img = this.renderer.createElement('img');
        this.renderer.setAttribute(img, 'src', e.target?.result as string);
        this.renderer.addClass(img, 'preview-image');
        
        if (this.previewContainer) {
          this.renderer.appendChild(this.previewContainer, img);
        }
      };
      reader.readAsDataURL(file);
    });

    // Add preview container after file input
    if (this.previewContainer) {
      this.renderer.appendChild(this.el.nativeElement.parentNode, this.previewContainer);
    }
  }
}