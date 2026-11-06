import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { officeDate } from '../../core/format';
import { InboxItem, InboxPage, PortalApi } from '../../core/portal.api';
import { PayorLayout } from '../../shared/payor-layout';

/** The payor's own messages. The API scopes them to whoever holds the cookies, so this screen cannot ask for anyone else's. */
@Component({
  selector: 'app-notifications',
  imports: [PayorLayout, RouterLink],
  templateUrl: './notifications.html',
})
export class Notifications {
  private readonly api = inject(PortalApi);
  private readonly router = inject(Router);

  protected readonly page = signal<InboxPage | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected date = officeDate;

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.page.set(await this.api.inbox());
    } catch {
      this.page.set(null);
      this.error.set('Your notifications could not be read. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  protected async markRead(id?: string): Promise<void> {
    this.error.set(null);
    try {
      this.page.set(await this.api.markRead(id));
    } catch {
      this.error.set('That could not be saved. Please try again.');
    }
  }

  /** Saved before leaving, so the bell is right on the next screen. A failed save must not stop the payor reaching the page. */
  protected async open(event: Event, item: InboxItem): Promise<void> {
    event.preventDefault();
    if (!item.read) await this.markRead(item.id);
    if (item.link) await this.router.navigateByUrl(item.link);
  }
}
