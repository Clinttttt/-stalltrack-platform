import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { BrandingService } from '../core/branding.service';
import { PortalApi } from '../core/portal.api';

/**
 * The shell every signed-in screen sits in: the office's own header, the screen itself, and the footer navigation.
 *
 * Mirrors the Blazor portal a payor already knows, seal and office name above "Payor Portal", so moving to this address
 * does not look like moving to a different government. The office is read from the payor's account rather than the host,
 * because one address serves every municipality here.
 */
@Component({
  selector: 'app-payor-layout',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './payor-layout.html',
})
export class PayorLayout {
  protected readonly branding = inject(BrandingService);
  private readonly api = inject(PortalApi);
  protected readonly unread = this.api.unread;

  /** "EEMO · MUNICIPALITY OF CANTILAN" where the office is known, and the platform's name until it is. */
  protected readonly eyebrow = computed(() => {
    const acronym = this.branding.acronym();
    const municipality = this.branding.municipality();

    if (!municipality) return 'StallTrack';
    return acronym
      ? `${acronym} · Municipality of ${municipality}`.toUpperCase()
      : `Municipality of ${municipality}`.toUpperCase();
  });

  constructor() {
    void this.branding.ensureLoaded();
    // A count is a convenience: a failed read keeps the last one and costs the screen nothing.
    // shortcut: asked once per screen, so a message written meanwhile shows on the next screen. Use the existing hub if payors need it live.
    this.api.inbox().catch(() => undefined);
  }
}
