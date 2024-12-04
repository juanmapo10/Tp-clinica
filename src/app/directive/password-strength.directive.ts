import { Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[appPasswordStrength]',
  standalone: true
})
export class PasswordStrengthDirective {
  @Input() minLength = 6;

  constructor(private el: ElementRef) {}

  @HostListener('input') onInput() {
    const input = this.el.nativeElement;
    const password = input.value;
    
    // Check password strength
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(password);

    const strength = 
      (password.length >= this.minLength ? 1 : 0) +
      (hasUppercase ? 1 : 0) +
      (hasLowercase ? 1 : 0) +
      (hasNumber ? 1 : 0) +
      (hasSpecialChar ? 1 : 0);

    // Apply color based on strength
    switch(strength) {
      case 0:
      case 1:
        input.style.borderColor = 'red';
        break;
      case 2:
      case 3:
        input.style.borderColor = 'orange';
        break;
      case 4:
      case 5:
        input.style.borderColor = 'green';
        break;
    }
  }
}