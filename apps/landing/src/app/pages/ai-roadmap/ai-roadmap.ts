import { Component, DestroyRef, afterNextRender, inject, signal } from '@angular/core';
import { Navbar } from '../../shared/navbar/navbar';
import { Footer } from '../../shared/footer/footer';
import { Reveal } from '../../shared/reveal/reveal';
import { DemoRequestModal } from '../../shared/demo-request-modal/demo-request-modal';

interface Agent {
  t: string;
  d: string;
  icon: 'chart' | 'file' | 'route' | 'shield' | 'contract' | 'question';
}

/**
 * Faithful Angular port of the React <AIRoadmap> page (route `/ai-roadmap`). Composed of the
 * React Hero / Principles / Agents / Workflow / Roadmap / CTA sections. The React <Icon>,
 * <Heading>, and <Reveal> helpers are inlined in the template (Reveal via the shared attribute
 * directive). Wrapped in the same App-shell chrome the React App renders for non-municipality
 * routes: Navbar, Footer, BackToTop, and the demo-request modal (opened from the Navbar CTA).
 */
@Component({
  selector: 'app-ai-roadmap',
  standalone: true,
  imports: [Navbar, Footer, Reveal, DemoRequestModal],
  templateUrl: './ai-roadmap.html',
})
export class AIRoadmap {
  private readonly destroyRef = inject(DestroyRef);

  readonly demoModalOpen = signal(false);
  readonly showBackToTop = signal(false);

  /** Hero "AI Operations Brief" list — [title, desc]. */
  readonly heroBrief: ReadonlyArray<[string, string]> = [
    ['3 vendors need follow-up', 'Prioritize arrears over 60 days before month-end close.'],
    ['2 contracts expiring soon', 'Prepare renewal list for stalls with active collection history.'],
    ['1 OR sequence gap', 'Review missing receipt number before finalizing report.'],
  ];

  readonly principles: ReadonlyArray<{ t: string; d: string }> = [
    { t: 'Human-approved actions', d: 'AI can recommend and prepare work, but staff approve payment, OR, contract, and enforcement decisions.' },
    { t: 'Source-grounded suggestions', d: 'Recommendations are tied to StallTrack records such as payments, contracts, facility rules, and audit logs.' },
    { t: 'Audit-aware automation', d: 'Agent activity is designed to be logged, explainable, and reviewable by office leadership.' },
  ];

  readonly agents: ReadonlyArray<Agent> = [
    {
      t: 'Collection Risk Agent',
      d: 'Surfaces stalls, vendors, facilities, or periods likely to become delinquent based on payment history, billing rhythm, and missed collection patterns.',
      icon: 'chart',
    },
    {
      t: 'Report Drafting Agent',
      d: 'Prepares monthly collection summaries, delinquency narratives, and treasurer-ready report drafts from approved transaction records.',
      icon: 'file',
    },
    {
      t: 'Collector Route Assistant',
      d: 'Suggests practical field collection priorities, follow-up lists, and facility-specific reminders for mobile collectors during daily rounds.',
      icon: 'route',
    },
    {
      t: 'Audit Review Agent',
      d: 'Flags unusual edits, duplicate-looking entries, OR sequence gaps, and before/after changes that may need supervisor review.',
      icon: 'shield',
    },
    {
      t: 'Contract Watch Agent',
      d: 'Monitors expiring leases, unsigned occupancy issues, no-contract spaces, and renewal tasks across commercial centers and market stalls.',
      icon: 'contract',
    },
    {
      t: 'Policy Q&A Agent',
      d: 'Answers staff questions using approved office rules, facility fee schedules, and internal documentation without exposing public data.',
      icon: 'question',
    },
  ];

  /** Workflow steps — [number, title, desc]. */
  readonly workflow: ReadonlyArray<[string, string, string]> = [
    ['1', 'Observe', 'Agents read approved StallTrack records, facility configuration, audit logs, and billing schedules.'],
    ['2', 'Reason', 'The system identifies patterns such as missed collection days, arrears, expiring contracts, and report gaps.'],
    ['3', 'Recommend', 'Staff receive ranked actions with plain-language explanations and links back to source records.'],
    ['4', 'Approve', 'Authorized users decide what to submit, follow up, export, or mark for review.'],
  ];

  /** Roadmap phases — [phase, title, desc]. */
  readonly phases: ReadonlyArray<[string, string, string]> = [
    ['Phase 1', 'AI-assisted reporting', 'Generate draft summaries, delinquency lists, and variance notes from existing dashboard records.'],
    ['Phase 2', 'Predictive collection insights', 'Prioritize follow-ups, detect missed collection patterns, and identify facilities needing intervention.'],
    ['Phase 3', 'Agentic office workflows', 'Coordinate report preparation, audit review queues, contract reminders, and collector task lists.'],
  ];

  constructor() {
    afterNextRender(() => {
      const onScroll = () => this.showBackToTop.set(window.scrollY > 600);
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
      this.destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));

      // Mirror App.jsx ScrollToTop hash handling for initial-load anchors (e.g. /ai-roadmap#agents).
      const hash = window.location.hash;
      if (hash) {
        const target = document.getElementById(hash.slice(1));
        if (target) {
          const top = target.getBoundingClientRect().top + window.scrollY - 80;
          window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
        }
      }
    });
  }

  openDemo(): void {
    this.demoModalOpen.set(true);
  }

  closeDemo(): void {
    this.demoModalOpen.set(false);
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
