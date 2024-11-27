import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EspecialistasTurnosComponent } from './especialistas-turnos.component';

describe('EspecialistasTurnosComponent', () => {
  let component: EspecialistasTurnosComponent;
  let fixture: ComponentFixture<EspecialistasTurnosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EspecialistasTurnosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EspecialistasTurnosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
