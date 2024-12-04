import { MaskEmailPipe } from './mask-email.pipe';

describe('MaskEmailPipe', () => {
  it('create an instance', () => {
    const pipe = new MaskEmailPipe();
    expect(pipe).toBeTruthy();
  });
});
