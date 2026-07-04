import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Footer } from '../../shared/footer/footer';
import { Reveal } from '../../shared/reveal/reveal';

/**
 * Faithful Angular port of the React <AssessmentReceived> page (route `/assessment-received`).
 * The optional `lgu` name is read from the query string (React `useSearchParams`).
 */
@Component({
  selector: 'app-assessment-received',
  standalone: true,
  imports: [Footer, Reveal, RouterLink],
  templateUrl: './assessment-received.html',
})
export class AssessmentReceived {
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);

  readonly lgu = signal((this.route.snapshot.queryParamMap.get('lgu') || '').trim());
  readonly thankYou = computed(() => (this.lgu() ? `, ${this.lgu()}` : ''));
  readonly forLgu = computed(() => (this.lgu() ? ` for ${this.lgu()}` : ''));

  readonly nextSteps: ReadonlyArray<{ title: string; body: string }> = [
    { title: 'Review', body: 'We verify your request and confirm the responsible LGU office and scope of rollout.' },
    { title: 'Secure onboarding link', body: 'If approved, a private onboarding workspace is issued to your authorized representative — where official documents and signatures are collected securely.' },
    { title: 'Data & validation', body: 'Facilities, rates, users, and reports are prepared and dry-run to confirm accuracy before go-live.' },
    { title: 'Activation', body: 'Your municipality portal is approved and goes live for official use.' },
  ];

  constructor() {
    this.title.setTitle('Assessment request received — StallTrack');
  }
}
