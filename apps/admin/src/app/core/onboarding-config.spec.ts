import { mapRequestToCommand } from './activation.mapper';
import { RequestRecord, STATUS } from './demo';
import { parseWorkspaceConfig, toReviewConfig } from './onboarding-config';

describe('onboarding workspace identity through validation preflight', () => {
  const address = 'Municipality of Carmen, Province of Surigao del Sur, Caraga Region, Philippines';

  function request(configJson: string): RequestRecord {
    return {
      id: 'assessment-carmen',
      municipality: 'Carmen',
      province: 'Surigao del Sur',
      requestingOffice: address,
      focalPerson: 'Carmen Focal Person',
      position: 'Officer',
      officialEmail: 'office@carmen.gov.ph',
      contactNumber: '09123456789',
      facilitiesManaged: '',
      approxVendors: '',
      authorizationStatus: '',
      acknowledged: true,
      notes: '',
      submittedAt: '2026-09-18T00:00:00Z',
      status: STATUS.APPROVED,
      stage: 'Validation',
      activated: false,
      decisionMessage: '',
      onboardingLink: '',
      log: [],
      config: toReviewConfig(parseWorkspaceConfig(configJson)),
    };
  }

  it('preserves the saved office name into the exact Validation preflight command', () => {
    const r = request(JSON.stringify({
      branding: { officeName: 'Carmen Economic Enterprise Office', orPrefix: 'CEEO-' },
      administrator: { name: 'Carmen Head', email: 'head@carmen.gov.ph' },
      facilities: [],
    }));

    const { command } = mapRequestToCommand(r, { officeName: r.config?.officeName });

    expect(command.assessmentRequestId).toBe('assessment-carmen');
    expect(command.branding.officeName).toBe('Carmen Economic Enterprise Office');
    expect(command.branding.address).toBe(address);
  });

  it('carries Fish-only independent weighing unchanged through review and activation', () => {
    const r = request(JSON.stringify({
      administrator: { name: 'Carmen Head', email: 'head@carmen.gov.ph' },
      facilities: [],
      operations: { version: 1, items: [{ operationCode: 'WEIGHT_AND_MEASURE', selected: true }] },
      weighing: { version: 1, fishEnabled: true, fishRate: '2.50', meatEnabled: false, meatRate: '' },
    }));
    expect(r.config?.weighing?.fishRate).toBe('2.50');
    expect(mapRequestToCommand(r).command.weighingConfiguration).toEqual({
      fishEnabled: true, fishRatePerKilo: 2.5, meatEnabled: false, meatRatePerKilo: null,
    });
  });

  it('rejects invalid prices and unknown weighing config revisions without guessing', () => {
    const invalid = request(JSON.stringify({
      facilities: [],
      operations: { version: 1, items: [{ operationCode: 'WEIGHT_AND_MEASURE', selected: true }] },
      weighing: { version: 1, fishEnabled: true, fishRate: '-1', meatEnabled: false, meatRate: '' },
    }));
    expect(mapRequestToCommand(invalid).blockingErrors.join(' ')).toMatch(/Fish weighing/);
    const unreadable = request(JSON.stringify({ facilities: [], weighing: { version: 2, fishEnabled: true, fishRate: '2' } }));
    expect(unreadable.config?.weighingUnreadable).toBe(true);
    expect(mapRequestToCommand(unreadable).blockingErrors.join(' ')).toMatch(/unsupported format/);
  });

  it('never imports reference tenant weighing fees into a nonconfigured LGU', () => {
    const r = request(JSON.stringify({ facilities: [], administrator: { name: 'Head', email: 'head@example.gov.ph' } }));
    expect(mapRequestToCommand(r).command.weighingConfiguration).toBeUndefined();
  });

  it('never substitutes the municipal address for a missing workspace office name', () => {
    const r = request(JSON.stringify({ branding: {}, facilities: [] }));

    const { command } = mapRequestToCommand(r, { officeName: r.config?.officeName });

    expect(command.branding.officeName).not.toBe(address);
    expect(command.branding.officeName).not.toContain('Philippines');
    expect(command.branding.address).toBe(address);
  });
});
