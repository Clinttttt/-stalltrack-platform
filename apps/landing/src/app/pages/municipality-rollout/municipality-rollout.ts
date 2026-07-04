import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Footer } from '../../shared/footer/footer';
import { Reveal } from '../../shared/reveal/reveal';
import { RequestAssessmentModal } from '../../shared/request-assessment-modal/request-assessment-modal';
import { MunicipalityService } from '../../core/municipality.service';

interface RolloutStep {
  key: string;
  title: string;
  body: string;
}

interface Requirement {
  icon: string;
  title: string;
  body: string;
}

/**
 * Faithful Angular port of the React <MunicipalityRollout> page (route `/municipalities/:code`).
 * The `:code` param is read via ActivatedRoute and resolved through the core municipality registry.
 * When the code is unknown, the NotFound view is rendered (mirrors the React `<NotFound />`).
 */
@Component({
  selector: 'app-municipality-rollout',
  standalone: true,
  imports: [Footer, Reveal, RouterLink, RequestAssessmentModal],
  templateUrl: './municipality-rollout.html',
})
export class MunicipalityRollout {
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly municipalityService = inject(MunicipalityService);

  readonly PROVINCE = 'Province of Surigao del Sur';

  readonly rolloutSteps: ReadonlyArray<RolloutStep> = [
    { key: 'assessment', title: 'Assessment', body: 'Official LGU coordination and scope review before any setup begins.' },
    { key: 'onboarding', title: 'Onboarding', body: 'Facilities, rates, users, and branding are prepared in a secure workspace.' },
    { key: 'validation', title: 'Validation', body: 'Reports, obligations, and sample records are dry-run and verified.' },
    { key: 'activation', title: 'Activation', body: 'The municipality portal is approved and goes live for official use.' },
  ];

  readonly requirements: ReadonlyArray<Requirement> = [
    { icon: 'handshake', title: 'Official LGU coordination', body: 'Responsible office confirmed, focal person identified, and the intended scope of rollout agreed.' },
    { icon: 'building', title: 'Facility inventory', body: 'Public markets, commercial rentals, terminals, slaughterhouse, weekly markets, and other revenue facilities listed.' },
    { icon: 'scale', title: 'Rate & ordinance review', body: 'Fee schedules, legal or policy basis, and effective dates confirmed per facility.' },
    { icon: 'calendar', title: 'Collection cycle mapping', body: 'Each facility mapped to a billing model — daily, weekly, monthly, per trip, per head, or per kilo.' },
    { icon: 'db', title: 'Payor & stallholder data', body: 'Vendor names, stall or space numbers, contract dates, and fee amounts prepared for import.' },
    { icon: 'users', title: 'Authorized users', body: 'LGU administrator, head office, collectors, and any view-only auditors, scoped to the municipality.' },
    { icon: 'receipt', title: 'Report & receipt setup', body: 'Official report header, seal, office label, OR series policy, and payment account configuration.' },
    { icon: 'shield', title: 'Validation & dry run', body: 'Sample dashboards, totals, obligations, and mobile views verified before activation is approved.' },
  ];

  readonly municipality = computed(() =>
    this.municipalityService.getByCode(this.route.snapshot.paramMap.get('code')) ?? null,
  );

  readonly isActive = computed(() => this.municipality()?.status === 'Active');
  readonly stageIndex = computed(() => {
    const m = this.municipality();
    return m?.rolloutStage ? this.rolloutSteps.findIndex((s) => s.key === m.rolloutStage) : -1;
  });
  readonly inProgress = computed(() => !this.isActive() && this.stageIndex() >= 0);
  readonly currentStage = computed(() => (this.inProgress() ? this.rolloutSteps[this.stageIndex()] : null));

  readonly assessmentOpen = signal(false);

  constructor() {
    const m = this.municipality();
    this.title.setTitle(m ? `${m.name} — StallTrack Rollout` : 'Municipality not found — StallTrack');
  }

  /** Presentation state per pipeline card (mirrors the React inline state logic). */
  stepState(index: number): 'done' | 'current' | 'upcoming' {
    if (!this.inProgress()) return 'upcoming';
    if (index < this.stageIndex()) return 'done';
    if (index === this.stageIndex()) return 'current';
    return 'upcoming';
  }

  stepCardClass(state: 'done' | 'current' | 'upcoming'): string {
    return state === 'current'
      ? 'border-gold bg-white shadow-card ring-1 ring-gold/60'
      : state === 'done'
        ? 'border-gold/40 bg-white shadow-soft'
        : 'border-line bg-mist shadow-soft';
  }

  openAssessment(): void {
    this.assessmentOpen.set(true);
  }

  closeAssessment(): void {
    this.assessmentOpen.set(false);
  }
}
