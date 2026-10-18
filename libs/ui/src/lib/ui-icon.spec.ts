import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiIcon } from './ui-icon';

@Component({
  standalone: true,
  imports: [UiIcon],
  template: `<ui-icon name="check" /><app-icon name="x" className="h-4 w-4" />`,
})
class Host {}

const NAMES = [
  'inbox', 'check', 'x', 'clock', 'building', 'mail', 'link', 'copy', 'logout', 'shield', 'layers', 'send', 'arrowRight', 'file', 'lock',
  'user', 'activity', 'gauge', 'power', 'key', 'building2', 'info', 'chevronDown', 'chevronLeft', 'chevronRight', 'search', 'plus',
  'alert', 'eye', 'home', 'list', 'receipt', 'ticket', 'zap', 'droplet', 'download', 'filter',
];

describe('UiIcon: one icon set, one weight', () => {
  function render(name: string): SVGElement {
    TestBed.resetTestingModule();
    const f = TestBed.createComponent(UiIcon);
    f.componentRef.setInput('name', name);
    f.detectChanges();
    return (f.nativeElement as HTMLElement).querySelector('svg')!;
  }

  it('draws every icon on the 24 grid with the 1.8 stroke, round caps, currentColor, hidden from screen readers', () => {
    for (const n of NAMES) {
      const svg = render(n);
      expect(svg.getAttribute('viewBox'), n).toBe('0 0 24 24');
      expect(svg.getAttribute('stroke-width'), n).toBe('1.8');
      expect(svg.getAttribute('stroke-linecap'), n).toBe('round');
      expect(svg.getAttribute('stroke-linejoin'), n).toBe('round');
      expect(svg.getAttribute('stroke'), n).toBe('currentColor');
      expect(svg.getAttribute('fill'), n).toBe('none');
      expect(svg.getAttribute('aria-hidden'), n).toBe('true');
      expect(svg.querySelectorAll('path,circle,rect,line,polyline').length, `${n} has shapes`).toBeGreaterThan(0);
    }
  });

  it('draws an arrow for arrowRight, not the old activity zig-zag', () => {
    const arrow = render('arrowRight').innerHTML;
    expect(arrow).toContain('M5 12h14');
    expect(arrow).not.toContain('M22 12h-4l-3 9');
  });

  it('draws nothing for a name that is not in the set, rather than something wrong', () => {
    expect(render('no-such-icon').querySelectorAll('path,circle,rect,line,polyline').length).toBe(0);
  });

  it('takes its size from the caller', () => {
    TestBed.resetTestingModule();
    const f = TestBed.createComponent(UiIcon);
    f.componentRef.setInput('name', 'check');
    f.componentRef.setInput('className', 'h-4 w-4');
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).querySelector('svg')!.getAttribute('class')).toBe('h-4 w-4');
  });

  it('answers to both selectors, so templates written for app-icon keep working', () => {
    TestBed.resetTestingModule();
    const f = TestBed.createComponent(Host);
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).querySelectorAll('svg').length).toBe(2);
  });
});
