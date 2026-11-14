import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PaymentSuccess } from './payment-success';
import { API_BASE_URL } from '../../core/api.config';

// This screen is the payor's only word on whether their money landed. Saying "credited" while the balance still owes the
// amount, or "nothing was charged" when the gateway may have taken it, invites a second payment or a dispute.
describe('PaymentSuccess', () => {
  async function outcome(status: string, settled: boolean): Promise<string> {
    window.history.replaceState({}, '', '?ref=EEMO-OP-TEST');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(PaymentSuccess);
    const req = http.expectOne(`${API_BASE_URL}/api/onlinepayments/confirm`);
    expect(req.request.body).toEqual({ reference: 'EEMO-OP-TEST' });
    req.flush({ status, settled });
    await fixture.whenStable();
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  afterEach(() => window.history.replaceState({}, '', '/'));

  it('says credited only for a settled payment', async () => {
    const text = await outcome('Paid', true);

    expect(text).toContain('Payment received');
    expect(text).toContain('credited');
  });

  it('never says credited while the office reviews the money, and asks the payor not to pay again', async () => {
    const text = await outcome('UnderReview', false);

    expect(text).toContain('under review');
    expect(text).toContain('do not pay it again');
    expect(text).not.toContain('credited');
  });

  it('states a refund as a refund', async () => {
    const text = await outcome('Refunded', false);

    expect(text).toContain('Payment refunded');
    expect(text).not.toContain('credited');
  });

  it.each(['Failed', 'Expired', 'Cancelled'])('does not claim nothing was charged when the status is %s', async (status) => {
    const text = await outcome(status, false);

    expect(text).toContain('Payment not completed');
    expect(text).toContain('contact the');
    expect(text).not.toContain('Nothing was charged');
  });
});
