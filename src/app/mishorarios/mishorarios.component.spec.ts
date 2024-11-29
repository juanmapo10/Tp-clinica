import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MishorariosComponent } from './mishorarios.component';

describe('MishorariosComponent', () => {
  let component: MishorariosComponent;
  let fixture: ComponentFixture<MishorariosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MishorariosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MishorariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
