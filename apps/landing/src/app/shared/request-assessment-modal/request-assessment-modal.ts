import {
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Municipality } from '../../core/municipality.model';
import { AssessmentService } from '../../core/assessment.service';
import { AssessmentSelect } from './assessment-select';

/**
 * Faithful Angular port of the React <RequestAssessmentModal>.
 *
 * Public-stage assessment request. Collects intent, contact, scope, and authorization STATUS only.
 * Official documents and the Mayor's endorsement / signatures are collected later in the secure
 * onboarding workspace — never on this public page (data-privacy + authenticity).
 *
 * Posts natively to formsubmit.co; the polished selects aren't native inputs, so the required ones
 * are validated on submit (native required inputs are validated by the browser first). The React
 * `municipality` / `onClose` props become the `municipality` input and `close` output.
 */
@Component({
  selector: 'app-request-assessment-modal',
  standalone: true,
  imports: [AssessmentSelect],
  templateUrl: './request-assessment-modal.html',
})
export class RequestAssessmentModal {
  private readonly destroyRef = inject(DestroyRef);
  private readonly assessments = inject(AssessmentService);
  private readonly router = inject(Router);

  readonly municipality = input<Municipality | null>(null);
  /** Mirrors the React `onClose` prop. */
  readonly close = output<void>();

  readonly requestingOffices: ReadonlyArray<string> = [
    'Economic Enterprise & Management Office (EEMO)',
    'Local Economic Enterprise Office (LEEO)',
    'Office of the Municipal Treasurer',
    'Public Market Office / Market Administrator',
    'Office of the Municipal Mayor',
    'Municipal Planning & Development Office (MPDO)',
    'Other',
  ];

  readonly facilities: ReadonlyArray<string> = [
    'Public Market — daily stalls',
    'Commercial Center / monthly rental',
    'Barbecue / food stalls',
    'Iceplant / cold storage',
    'Slaughterhouse — per head',
    'Transport / Bus Terminal — per trip',
    'Weekly / Tabo market — market day',
    'Other',
  ];

  readonly vendorScale: ReadonlyArray<string> = ['Under 50', '50–150', '150–300', '300–600', 'Over 600'];

  readonly authStatusOptions: ReadonlyArray<string> = [
    'Endorsement / authorization already available',
    'In process',
    'Not yet initiated',
  ];

  readonly fieldClass =
    'mt-2 w-full rounded-xl border border-line bg-white px-3.5 py-3 font-normal text-navy outline-none transition placeholder:text-muted/70 focus:border-gold focus:ring-2 focus:ring-gold/20';

  readonly confirmationUrl = signal('');
  readonly office = signal('');
  readonly otherOffice = signal('');
  readonly vendorScaleValue = signal('');
  readonly authStatus = signal('');
  readonly selectedFacilities = signal<string[]>([]);
  readonly errors = signal<Record<string, string | undefined>>({});
  readonly submitting = signal(false);
  readonly submitError = signal('');

  readonly municipalityName = computed(() => this.municipality()?.name ?? '');
  readonly resolvedOffice = computed(() =>
    this.office() === 'Other' ? this.otherOffice().trim() : this.office(),
  );
  readonly subject = computed(() => `StallTrack — ${this.municipality()?.name ?? 'LGU'} Assessment Request`);
  readonly heading = computed(() =>
    this.municipality()?.name ? `Request assessment — ${this.municipality()?.name}` : 'Request LGU Assessment',
  );
  readonly facilitiesManaged = computed(() => this.selectedFacilities().join(', '));

  constructor() {
    afterNextRender(() => {
      this.confirmationUrl.set(
        `${window.location.origin}/assessment-received?lgu=${encodeURIComponent(this.municipality()?.name ?? '')}`,
      );

      const previousOverflow = document.body.style.overflow;
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') this.close.emit();
      };
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', onKeyDown);

      this.destroyRef.onDestroy(() => {
        document.body.style.overflow = previousOverflow;
        window.removeEventListener('keydown', onKeyDown);
      });
    });
  }

  toggleFacility(value: string): void {
    this.selectedFacilities.update((current) =>
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    );
  }

  setOffice(value: string): void {
    this.office.set(value);
    this.errors.update((prev) => ({ ...prev, office: undefined }));
  }

  setOtherOffice(value: string): void {
    this.otherOffice.set(value);
    this.errors.update((prev) => ({ ...prev, otherOffice: undefined }));
  }

  setAuthStatus(value: string): void {
    this.authStatus.set(value);
    this.errors.update((prev) => ({ ...prev, authStatus: undefined }));
  }

  // The polished selects aren't native inputs, so validate the required ones on submit.
  // Native required inputs (focal person, email, contact, consent checkboxes) are validated by the
  // browser first, so when this handler runs those are already present/valid.
  async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();

    const nextErrors: Record<string, string | undefined> = {};
    if (!this.office()) nextErrors['office'] = 'Please select the responsible office.';
    if (this.office() === 'Other' && !this.otherOffice().trim())
      nextErrors['otherOffice'] = 'Please specify the office name.';
    if (!this.authStatus()) nextErrors['authStatus'] = 'Please select the current authorization status.';
    if (this.selectedFacilities().length === 0)
      nextErrors['facilities'] = 'Please select at least one facility.';

    if (Object.keys(nextErrors).length > 0) {
      this.errors.set(nextErrors);
      return;
    }

    if (this.submitting()) return;
    this.submitError.set('');
    this.submitting.set(true);

    const form = event.target as HTMLFormElement;
    const fd = new FormData(form);
    const value = (name: string) => ((fd.get(name) as string) ?? '').trim();

    // Fold the extra scale inputs into notes so nothing is lost (backend has no dedicated columns).
    const extras: string[] = [];
    if (value('Facilities to onboard')) extras.push(`Facilities to onboard: ${value('Facilities to onboard')}`);
    if (value('Collectors')) extras.push(`Field collectors: ${value('Collectors')}`);
    const noteParts = [value('Notes'), ...extras].filter((s) => s.length > 0);

    const result = await this.assessments.submit({
      municipality: this.municipalityName().trim(),
      province: 'Surigao del Sur',
      requestingOffice: this.resolvedOffice(),
      focalPerson: value('Focal person'),
      position: value('Position'),
      officialEmail: value('Official email'),
      contactNumber: value('Contact number'),
      facilitiesManaged: this.facilitiesManaged(),
      approxVendors: this.vendorScaleValue() || null,
      authorizationStatus: this.authStatus() || null,
      acknowledged: fd.get('Authorization acknowledgement') === 'Confirmed',
      notes: noteParts.length ? noteParts.join(' · ') : null,
    });

    this.submitting.set(false);

    if (result.ok) {
      this.close.emit();
      this.router.navigateByUrl(
        `/assessment-received?lgu=${encodeURIComponent(this.municipalityName())}`,
      );
    } else {
      this.submitError.set(result.error);
    }
  }
}
