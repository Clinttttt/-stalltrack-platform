import { Component, HostListener, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MunicipalityService } from '../../core/municipality.service';

/**
 * Public "Select Municipality" landing (CARCANMADCARLAN selector). Faithful Angular port of the React
 * page: identical layout, classes, copy and flow. Active cards link to their portal; upcoming cards
 * route to the rollout page. (Scroll-spy nav highlight + on-scroll reveal are progressive enhancements
 * to be ported next; the resting design is identical.)
 */
@Component({
  selector: 'app-select-municipality',
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet],
  templateUrl: './select-municipality.html',
})
export class SelectMunicipality {
  private readonly municipalityService = inject(MunicipalityService);

  readonly municipalities = this.municipalityService.all;
  readonly sidebarOpen = signal(false);

  readonly navLinks: ReadonlyArray<{ href: string; label: string }> = [
    { href: '#overview', label: 'Overview' },
    { href: '#municipalities', label: 'Municipalities' },
    { href: '#architecture', label: 'Architecture' },
    { href: '#about', label: 'About' },
  ];

  readonly overviewItems: ReadonlyArray<{ title: string; body: string }> = [
    { title: 'Improved public service', body: 'Provides a clearer digital access point for LGU-managed market and facility collection services.' },
    { title: 'More organized records', body: 'Supports consistent viewing of municipal collection information, facility coverage, and operational status.' },
    { title: 'Better office decision-making', body: 'Helps revenue offices review collection performance and identify areas that may need attention.' },
  ];

  readonly architectureCards: ReadonlyArray<{ title: string; body: string }> = [
    { title: 'Consistent service experience', body: 'Gives participating municipalities a familiar and orderly way to present collection access, facility information, and official notices.' },
    { title: 'Support for local differences', body: 'Recognizes that each LGU may have different facilities, collection schedules, rate structures, and office procedures.' },
    { title: 'Facility-aware operations', body: 'Designed around real LGU enterprise activities such as markets, commercial spaces, terminals, slaughterhouses, and other local facilities.' },
    { title: 'Responsible expansion', body: 'Keeps Cantilan as the active implementation while presenting other municipalities as future-ready areas for review and extension.' },
  ];

  readonly aboutFacts: ReadonlyArray<{ label: string; value: string }> = [
    ['Primary focus', 'Cantilan EEMO revenue collection operations'],
    ['Cluster view', 'CARCANMADCARLAN municipalities for future municipal readiness'],
    ['Project purpose', 'Organized collection records, reports, and monitoring'],
  ].map(([label, value]) => ({ label, value }));

  openSidebar(): void {
    this.sidebarOpen.set(true);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.sidebarOpen()) this.closeSidebar();
  }
}
