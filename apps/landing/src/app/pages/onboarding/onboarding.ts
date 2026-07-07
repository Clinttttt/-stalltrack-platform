import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Footer } from '../../shared/footer/footer';
import { OnboardingWorkspace } from '../../shared/onboarding-workspace/onboarding-workspace';
import { MunicipalityService } from '../../core/municipality.service';
import { OnboardingDraftDto, OnboardingService } from '../../core/onboarding.service';

/**
 * Onboarding page (route `/onboarding/:token`). Loads the LGU's staged draft from the backend by its
 * secure token, hydrates the configuration workspace, and saves/submits edits. Unknown/expired tokens
 * render the InvalidLink view.
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
  private readonly onboarding = inject(OnboardingService);

  readonly PROVINCE = 'Province of Surigao del Sur';
  readonly stages = ['Assessment', 'Onboarding', 'Validation', 'Activation'];

  private readonly token = this.route.snapshot.paramMap.get('token') || '';

  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly draft = signal<OnboardingDraftDto | null>(null);
  readonly busy = signal(false);
  readonly actionError = signal('');
  readonly saveNote = signal('');

  readonly submitted = computed(() => this.draft()?.isSubmittedForValidation ?? false);
  // Once submitted, the LGU has advanced to the Validation stage in the tracker.
  readonly currentStage = computed(() => (this.submitted() ? 2 : 1));

  readonly presentation = computed(() => {
    const d = this.draft();
    if (!d) return null;
    const match = this.municipalityService.all.find((x) => x.name.toLowerCase() === d.municipality.toLowerCase());
    return { name: d.municipality, image: match?.image ?? '/carcanmadcarlan/backgrounds/cantilan-reference.png' };
  });

  constructor() {
    this.title.setTitle('Onboarding — StallTrack');
    void this.load();
  }

  private async load(): Promise<void> {
    if (!this.token) {
      this.loadError.set('This onboarding link is invalid or has expired.');
      this.loading.set(false);
      return;
    }
    const res = await this.onboarding.getDraft(this.token);
    this.loading.set(false);
    if (res.ok) {
      this.draft.set(res.draft);
      this.title.setTitle(`${res.draft.municipality} Onboarding — StallTrack`);
    } else {
      this.loadError.set(res.error);
    }
  }

  async onSaveDraft(json: string): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.actionError.set('');
    this.saveNote.set('');
    const res = await this.onboarding.saveConfig(this.token, json);
    this.busy.set(false);
    if (res.ok) {
      this.draft.set(res.draft);
      this.saveNote.set('Progress saved.');
    } else {
      this.actionError.set(res.error);
    }
  }

  async onSubmitDraft(json: string): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.actionError.set('');
    this.saveNote.set('');
    const saved = await this.onboarding.saveConfig(this.token, json);
    if (!saved.ok) {
      this.busy.set(false);
      this.actionError.set(saved.error);
      return;
    }
    const submitted = await this.onboarding.submit(this.token);
    this.busy.set(false);
    if (submitted.ok) this.draft.set(submitted.draft);
    else this.actionError.set(submitted.error);
  }

  onEdit(): void {
    // Re-open for editing; the next save re-opens the draft on the backend.
    const d = this.draft();
    if (d) this.draft.set({ ...d, isSubmittedForValidation: false });
    this.saveNote.set('');
  }

  stageDone(i: number): boolean {
    return i < this.currentStage();
  }
  stageCurrent(i: number): boolean {
    return i === this.currentStage();
  }
}
