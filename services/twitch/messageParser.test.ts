import { describe, it, expect, beforeEach, vi } from 'vitest';

// messageParser transitively imports authService.ts, which registers
// ipcMain handlers at module load — fatal in the Node test env where
// 'electron' has no real ipcMain. We mock the few electron primitives
// touched at import time. vi.mock is hoisted by Vitest, so this runs
// before the import chain resolves.
vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn(), on: vi.fn(), removeHandler: vi.fn() },
  shell: { openExternal: vi.fn() },
  dialog: {},
  app: { getPath: () => '/tmp' },
}));
vi.mock('keytar', () => ({
  default: { getPassword: vi.fn(), setPassword: vi.fn(), deletePassword: vi.fn() },
}));

import {
  parseBadges,
  extractRolesFromBadges,
  setBadgeOverrideConfig,
  type BadgeOverrideConfig,
} from './messageParser';

const DEFAULT_PRIORITY = [
  'broadcaster',
  'lead_moderator',
  'moderator',
  'vip',
  'artist',
  'editor',
  'subscriber',
];

function makeConfig(overrides: Partial<BadgeOverrideConfig> = {}): BadgeOverrideConfig {
  return {
    source: 'custom',
    multipleMode: 'all',
    priorityOrder: DEFAULT_PRIORITY,
    customBadges: {},
    ...overrides,
  };
}

// Each test starts with no override config installed and no preloaded
// Twitch badge data (the module's channelBadges/globalBadges stay empty in
// the test environment because no Helix calls run). This means source=twitch
// paths produce empty output unless we explicitly set a custom override —
// which is exactly what makes the override logic cleanly testable.
beforeEach(() => {
  setBadgeOverrideConfig(null);
});

describe('extractRolesFromBadges', () => {
  it('returns all-false for an empty tag', () => {
    expect(extractRolesFromBadges('')).toEqual({
      isModerator: false,
      isLeadModerator: false,
      isVip: false,
      isBroadcaster: false,
      isStaff: false,
      isAdmin: false,
      isGlobalMod: false,
    });
  });

  it('detects a regular moderator without flagging lead', () => {
    const r = extractRolesFromBadges('moderator/1');
    expect(r.isModerator).toBe(true);
    expect(r.isLeadModerator).toBe(false);
  });

  it('promotes lead_moderator to also set isModerator', () => {
    // Critical invariant: Twitch IRC replaces 'moderator' with
    // 'lead_moderator' for head mods. Downstream code (RoleRestoreManager,
    // TriggerMiddleware) checks only isModerator — losing that flag would
    // silently break moderation logic for lead mods.
    const r = extractRolesFromBadges('lead_moderator/1');
    expect(r.isLeadModerator).toBe(true);
    expect(r.isModerator).toBe(true);
  });

  it('detects broadcaster and vip in a combined tag', () => {
    const r = extractRolesFromBadges('broadcaster/1,vip/1,subscriber/6');
    expect(r.isBroadcaster).toBe(true);
    expect(r.isVip).toBe(true);
  });

  it('detects platform roles (staff/admin/global_mod)', () => {
    expect(extractRolesFromBadges('staff/1').isStaff).toBe(true);
    expect(extractRolesFromBadges('admin/1').isAdmin).toBe(true);
    expect(extractRolesFromBadges('global_mod/1').isGlobalMod).toBe(true);
  });

  it('ignores unrelated badge keys', () => {
    const r = extractRolesFromBadges('founder/0,sub-gifter/5,turbo/1,premium/1');
    expect(r.isModerator).toBe(false);
    expect(r.isVip).toBe(false);
    expect(r.isBroadcaster).toBe(false);
  });
});

describe('parseBadges', () => {
  it('returns empty string for an empty tag', () => {
    expect(parseBadges('', null)).toBe('');
  });

  it('returns empty string when no override config is installed and twitch badges are not loaded', () => {
    expect(parseBadges('moderator/1,vip/1', 'alice')).toBe('');
  });

  it('renders the custom image when source=custom and the override is set', () => {
    setBadgeOverrideConfig(makeConfig({
      customBadges: {
        moderator: { image: '/images/badges/t1/moderator.png' },
      },
    }));
    const html = parseBadges('moderator/1', 'alice');
    expect(html).toContain('src="/images/badges/t1/moderator.png"');
    expect(html).toContain('alt="moderator"');
  });

  it('ignores custom image when source=twitch', () => {
    // Even if customBadges has an image, source=twitch means "use Twitch
    // CDN url" — which is empty in the test env, so nothing renders.
    setBadgeOverrideConfig(makeConfig({
      source: 'twitch',
      customBadges: {
        moderator: { image: '/images/wrong.png' },
      },
    }));
    expect(parseBadges('moderator/1', 'alice')).toBe('');
  });

  it('adds a synthetic artist badge when the login matches userList', () => {
    setBadgeOverrideConfig(makeConfig({
      customBadges: {
        artist: { image: '/images/artist.png', userList: ['Alice'] },
      },
    }));
    const html = parseBadges('', 'alice');
    expect(html).toContain('src="/images/artist.png"');
    expect(html).toContain('alt="artist"');
  });

  it('adds a synthetic editor badge for userList membership (no Twitch badge for editor)', () => {
    setBadgeOverrideConfig(makeConfig({
      customBadges: {
        editor: { image: '/images/editor.png', userList: ['bob'] },
      },
    }));
    const html = parseBadges('', 'bob');
    expect(html).toContain('src="/images/editor.png"');
    expect(html).toContain('alt="editor"');
  });

  it('matches userList case-insensitively', () => {
    setBadgeOverrideConfig(makeConfig({
      customBadges: {
        editor: { image: '/images/editor.png', userList: ['ALICE'] },
      },
    }));
    expect(parseBadges('', 'alice')).toContain('alt="editor"');
  });

  it('does not add synthetic role when the login is absent from userList', () => {
    setBadgeOverrideConfig(makeConfig({
      customBadges: {
        editor: { image: '/images/editor.png', userList: ['someone_else'] },
      },
    }));
    expect(parseBadges('', 'alice')).toBe('');
  });

  it('maps artist-badge IRC key to the artist role', () => {
    // Twitch's per-channel artist badge appears in the tag as 'artist-badge'.
    // parseBadges must rename it to 'artist' so customBadges.artist applies.
    setBadgeOverrideConfig(makeConfig({
      customBadges: { artist: { image: '/images/art.png' } },
    }));
    const html = parseBadges('artist-badge/1', 'alice');
    expect(html).toContain('src="/images/art.png"');
    expect(html).toContain('alt="artist"');
  });

  describe('multipleMode', () => {
    it('first → keeps only the highest-priority role', () => {
      setBadgeOverrideConfig(makeConfig({
        multipleMode: 'first',
        customBadges: {
          broadcaster: { image: '/images/bc.png' },
          vip:         { image: '/images/vip.png' },
        },
      }));
      const html = parseBadges('broadcaster/1,vip/1', 'alice');
      expect(html).toContain('alt="broadcaster"');
      expect(html).not.toContain('alt="vip"');
    });

    it('overriddenOnly → drops badges without a custom image', () => {
      setBadgeOverrideConfig(makeConfig({
        multipleMode: 'overriddenOnly',
        customBadges: {
          vip: { image: '/images/vip.png' },
          // no moderator override → moderator must be dropped
        },
      }));
      const html = parseBadges('moderator/1,vip/1', 'alice');
      expect(html).toContain('alt="vip"');
      expect(html).not.toContain('alt="moderator"');
    });

    it('all → renders every overridden badge', () => {
      setBadgeOverrideConfig(makeConfig({
        multipleMode: 'all',
        customBadges: {
          broadcaster: { image: '/images/bc.png' },
          vip:         { image: '/images/vip.png' },
        },
      }));
      const html = parseBadges('broadcaster/1,vip/1', 'alice');
      expect(html).toContain('alt="broadcaster"');
      expect(html).toContain('alt="vip"');
    });
  });

  describe('priorityOrder', () => {
    it('sorts rendered badges by priorityOrder regardless of input order', () => {
      setBadgeOverrideConfig(makeConfig({
        priorityOrder: ['vip', 'broadcaster'], // reversed
        customBadges: {
          broadcaster: { image: '/images/bc.png' },
          vip:         { image: '/images/vip.png' },
        },
      }));
      const html = parseBadges('broadcaster/1,vip/1', 'alice');
      const vipIdx = html.indexOf('vip.png');
      const bcIdx  = html.indexOf('bc.png');
      expect(vipIdx).toBeGreaterThanOrEqual(0);
      expect(bcIdx).toBeGreaterThanOrEqual(0);
      expect(vipIdx).toBeLessThan(bcIdx);
    });

    it('picks the highest-priority role in multipleMode=first by priorityOrder', () => {
      setBadgeOverrideConfig(makeConfig({
        multipleMode: 'first',
        priorityOrder: ['vip', 'broadcaster'], // vip wins now
        customBadges: {
          broadcaster: { image: '/images/bc.png' },
          vip:         { image: '/images/vip.png' },
        },
      }));
      const html = parseBadges('broadcaster/1,vip/1', 'alice');
      expect(html).toContain('alt="vip"');
      expect(html).not.toContain('alt="broadcaster"');
    });
  });
});
