import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Footer } from '../../shared/footer/footer';
import { OnboardingWorkspace } from '../../shared/onboarding-workspace/onboarding-workspace';
import { MunicipalityService } from '../../core/municipality.service';

/**
 * Faithful Angular port of the React <Onboarding> page (route `/onboarding/:token`).
 * The emailed token's slug prefix (`token.split('-')[0]`) resolves the municipality; an unknown
 * slug renders the InvalidLink view. The emailed link lands the LGU in the Onboarding stage.
 */
@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [Footer, OnboardingWorkspace, RouterLink],
  templateUrl: './onboarding.html',
})
export class Onboarding {
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly municipalityService = inject(MunicipalityService);

  readonly PROVINCE = 'Province of Surigao del Sur';
  readonly stages = ['Assessment', 'Onboarding', 'Validation', 'Activation'];
  readonly CURRENT = 1; // The emailed link lands the LGU in the Onboarding stage.

  readonly municipality = computed(() => {
    const token = this.route.snapshot.paramMap.get('token') || '';
    const slug = token.split('-')[0];
    return this.municipalityService.getByCode(slug) ?? null;
  });

  constructor() {
    const m = this.municipality();
    this.title.setTitle(m ? `${m.name} Onboarding — StallTrack` : 'Onboarding — StallTrack');
  }

  stageDone(i: number): boolean {
    return i < this.CURRENT;
  }
  stageCurrent(i: number): boolean {
    return i === this.CURRENT;
  }
}
