import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api.config';

/** One space the payor holds, and what it currently owes. Mirrors the API's PayorStallBalanceDto. */
export interface PayorBalance {
  stallId: string;
  stallNo: string;
  facility: string;
  occupant: string;
  monthlyRate: number;
  outstandingBalance: number;
  unpaidMonths: number;
  oldestUnpaidPeriod: string | null;
  /** True where the space is charged by the DAY, which is how a market stall is billed. */
  isDailyBilled: boolean;
  dailyRate: number;
  daysOwed: number;
}

/**
 * The payor's own account data. Read-only here; paying is a separate step and a separate screen.
 *
 * No token is passed: the interceptor attaches the cookies, and the API decides which payor is asking. This service
 * cannot see another payor's account even if it asked, because the endpoint is scoped to the caller.
 */
@Injectable({ providedIn: 'root' })
export class PortalApi {
  private readonly http = inject(HttpClient);

  async balances(): Promise<PayorBalance[]> {
    return (
      (await firstValueFrom(
        this.http.get<PayorBalance[]>(`${API_BASE_URL}/api/payorportal/balances`),
      )) ?? []
    );
  }
}
