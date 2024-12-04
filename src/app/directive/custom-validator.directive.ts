import { Directive, Input } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';

@Directive({
  selector: '[appCustomValidator]',
  standalone: true,
  providers: [{
    provide: NG_VALIDATORS, 
    useExisting: CustomValidatorDirective, 
    multi: true
  }]
})
export class CustomValidatorDirective implements Validator {
  @Input('appCustomValidator') validationType: string = '';

  validate(control: AbstractControl): ValidationErrors | null {
    const value = control.value;

    switch(this.validationType) {
      case 'dni':
        return this.validateDNI(value);
      case 'name':
        return this.validateName(value);
      case 'email':
        return this.validateEmail(value);
      default:
        return null;
    }
  }

  private validateDNI(value: string): ValidationErrors | null {
    const dniRegex = /^[0-9]{8}$/;
    return dniRegex.test(value) ? null : { invalidDNI: true };
  }

  private validateName(value: string): ValidationErrors | null {
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,50}$/;
    return nameRegex.test(value) ? null : { invalidName: true };
  }

  private validateEmail(value: string): ValidationErrors | null {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(value) ? null : { invalidEmail: true };
  }
}