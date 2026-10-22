import { describe, expect, it } from 'vitest';
import { defaultTerminalChoices, readTerminalSections, terminalNameProblem, writeTerminalSections } from '@stalltrack/terminal-config';

describe('Tenant Terminal section declarations', () => {
  it('retains all three safe legacy defaults for documents with no Terminal block', () => {
    const block = readTerminalSections(undefined);
    expect(block.present).toBe(false);
    expect(block.unreadable).toBe(false);
    expect(block.choices).toHaveLength(3);
    expect(block.choices.every((s) => s.isEnabled)).toBe(true);
  });

  it('round-trips disabled and locally named sections without changing stable identities', () => {
    const choices = defaultTerminalChoices();
    choices[0] = { section: 'ComfortRoom', isEnabled: false, localDisplayName: 'Public toilet' };
    choices[2] = { section: 'Tricycad', isEnabled: true, localDisplayName: 'Tricycle terminal' };
    const saved = writeTerminalSections(choices);
    expect(readTerminalSections(saved).choices).toEqual(choices);
    expect(saved.items[0].section).toBe('ComfortRoom');
  });

  it('refuses a future, partial, or ambiguous declaration instead of silently enabling an unknown source', () => {
    const defaults = writeTerminalSections(defaultTerminalChoices());
    expect(readTerminalSections({ ...defaults, version: 4 }).unreadable).toBe(true);
    expect(readTerminalSections({ version: 1, items: defaults.items.slice(0, 2) }).unreadable).toBe(true);
    const duplicate = defaultTerminalChoices();
    duplicate[0].localDisplayName = 'Same local name';
    duplicate[1].localDisplayName = 'Same local name';
    expect(terminalNameProblem(duplicate)).not.toBeNull();
  });
});
