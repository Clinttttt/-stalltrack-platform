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
 * The kinds of thing a payor can owe. Serialised as names by the API, so they are compared as names here.
 * A market stall can owe all three at once: its daily fees, its metered utilities, and a fish day it declares.
 */
export type PayableKind = 'Monthly' | 'NpmDaily' | 'NpmUtility' | 'NpmFish';

/** One payable item. Mirrors the API's PayorPayableItemDto. */
export interface PayableItem {
  stallId: string;
  stallNo: string;
  facility: string;
  year: number;
  month: number;
  period: string;
  balanceDue: number;
  kind: PayableKind;
  /** NpmFish only: the days still open for the payor to declare kilos against. */
  uncollectedDays: string[] | null;
  baseFee: number | null;
  fishRatePerKilo: number | null;
  /** NpmDaily only: how many days the amount is made of, and the fee for one of them. */
  days: number | null;
  dailyRate: number | null;
}

/** One day inside a daily-billed month, as the payor's own record of it. */
export interface HistoryDay {
  day: string;
  amount: number;
  orNumber: string | null;
  recordedByName: string | null;
}

/** One month of a space's ledger. Mirrors the API's PaymentHistoryDto. */
export interface HistoryMonth {
  period: string;
  status: 'Unpaid' | 'Partial' | 'Paid';
  totalBill: number;
  amountPaid: number;
  balanceDue: number;
  orNumber: string | null;
  paidAt: string | null;
  isExcused: boolean;
  recordedByName: string | null;
  /** The days behind a market month, earliest first. Absent for monthly facilities. */
  days: HistoryDay[] | null;
}

/**
 * The payor's own account data.
 *
 * No token is passed anywhere: the interceptor attaches the cookies and the API decides which payor is asking. These
 * endpoints are scoped to the caller, so this service could not read another payor's account even if it asked.
 */
@Injectable({ providedIn: 'root' })
export class PortalApi {
  private readonly http = inject(HttpClient);

  async balances(): Promise<PayorBalance[]> {
    return (
      (await firstValueFrom(this.http.get<PayorBalance[]>(`${API_BASE_URL}/api/payorportal/balances`))) ?? []
    );
  }

  async payableItems(): Promise<PayableItem[]> {
    return (
      (await firstValueFrom(this.http.get<PayableItem[]>(`${API_BASE_URL}/api/payorportal/payable-items`))) ?? []
    );
  }

  /**
   * Starts a payment and answers with the gateway's checkout address.
   *
   * The amount is not sent: the API prices the item again at initiation, so a figure altered on the way out cannot
   * become the figure charged. Where the payor returns afterwards is decided by the API too.
   */
  async initiate(item: PayableItem): Promise<{ checkoutUrl: string; reference: string }> {
    return await firstValueFrom(
      this.http.post<{ checkoutUrl: string; reference: string }>(`${API_BASE_URL}/api/onlinepayments/initiate`, {
        stallId: item.stallId,
        year: item.year,
        month: item.month,
        kind: item.kind,
      }),
    );
  }

  /**
   * Asks the API to reconcile a payment on return from checkout. The gateway's own webhook is what settles a payment;
   * this only reads the outcome, and says so plainly when it is not settled yet.
   */
  async confirm(reference: string): Promise<{ status: string; settled: boolean }> {
    return await firstValueFrom(
      this.http.post<{ status: string; settled: boolean }>(`${API_BASE_URL}/api/onlinepayments/confirm`, {
        reference,
      }),
    );
  }

  async history(stallId: string): Promise<HistoryMonth[]> {
    return (
      (await firstValueFrom(
        this.http.get<HistoryMonth[]>(`${API_BASE_URL}/api/payorportal/stalls/${stallId}/history`),
      )) ?? []
    );
  }
}
