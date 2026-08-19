import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { MunicipalityRollout } from './municipality-rollout';

/**
 * "View Rollout Requirements" used to be a bare `href="#requirements"`. That moved the viewport and
 * nothing else: focus stayed on the button, and the fragment it left in the address bar was never
 * honoured on a reload because the section sits inside an @if block and is absent when the router
 * looks for it. These tests pin the replacement behaviour.
 */
describe('MunicipalityRollout — activation requirements link', () => {
  let scrollTo: ReturnType<typeof vi.fn>;
  let reduceMotion: boolean;

  /** Carmen is Upcoming in the registry, so the requirements section is rendered. */
  function render(code = 'carmen') {
    TestBed.configureTestingModule({
      imports: [MunicipalityRollout],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ code }) } },
        },
      ],
    });

    const fixture = TestBed.createComponent(MunicipalityRollout);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    reduceMotion = false;
    scrollTo = vi.fn();

    vi.stubGlobal('scrollTo', scrollTo);
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: reduceMotion })),
    );
    // The Reveal directive observes its host; jsdom has no IntersectionObserver.
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe(): void {
          /* never intersects in jsdom */
        }
        disconnect(): void {
          /* nothing to release */
        }
      },
    );

    window.history.replaceState(null, '', '/municipalities/carmen');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it('renders the requirements section as a focus target', () => {
    const fixture = render();
    const section: HTMLElement | null = fixture.nativeElement.querySelector('#requirements');

    expect(section).toBeTruthy();
    expect(section?.getAttribute('tabindex')).toBe('-1');
  });

  it('scrolls to the section, moves focus into it, and records the fragment', () => {
    const fixture = render();
    const section: HTMLElement = fixture.nativeElement.querySelector('#requirements');
    document.body.appendChild(fixture.nativeElement);

    fixture.componentInstance.scrollToRequirements();

    expect(scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth' }),
    );
    expect(document.activeElement).toBe(section);
    expect(window.location.hash).toBe('#requirements');
  });

  it('does not smooth-scroll when the reader prefers reduced motion', () => {
    reduceMotion = true;
    const fixture = render();
    document.body.appendChild(fixture.nativeElement);

    fixture.componentInstance.scrollToRequirements();

    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'auto' }));
  });

  it('prevents the browser default so the router URL is not left behind', () => {
    const fixture = render();
    const event = new MouseEvent('click', { cancelable: true });

    fixture.componentInstance.scrollToRequirements(event);

    expect(event.defaultPrevented).toBe(true);
  });
});
