/**
 * ParticipantRoster — renders the room's participants with their
 * tier, connected/muted/successor flags. PH/CoHost actions surface
 * inline; non-host viewers see read-only rows.
 */

import type { RoomStateStore, RoomStateSnapshot } from '../store/room-state.js';
import type { HttpClient } from '../http-client.js';
import type { StoredIdentity } from '../identity-store.js';
import type { Tier } from '../../../src/rooms/types.js';

const TIER_LABEL: Record<Tier, string> = {
  primary_host: 'PH',
  co_host: 'Co-Host',
  command_entrant: 'Command',
  participant: 'Participant'
};

export interface RosterDeps {
  store: RoomStateStore;
  http: HttpClient;
  identity: StoredIdentity;
  roomId: string;
}

export function mountParticipantRoster(parent: HTMLElement, deps: RosterDeps): () => void {
  const panel = document.createElement('div');
  panel.className = 'sharpee-panel sharpee-participant-roster';
  panel.innerHTML = '<h2>Participants</h2><ul></ul>';
  parent.appendChild(panel);

  const list = panel.querySelector('ul')!;

  function render(snapshot: RoomStateSnapshot): void {
    list.replaceChildren();
    const ownTier = snapshot.ownTier;
    const isPh = ownTier === 'primary_host';
    const isCoHost = ownTier === 'co_host';

    for (const row of snapshot.roster) {
      const li = document.createElement('li');
      const classes = ['sharpee-participant-row'];
      if (!row.connected) classes.push('sharpee-disconnected');
      if (row.muted) classes.push('sharpee-muted');
      if (row.is_successor) classes.push('sharpee-successor');
      li.className = classes.join(' ');

      const label = document.createElement('span');
      const tier = document.createElement('span');
      tier.className = 'sharpee-tier-badge';
      tier.textContent = TIER_LABEL[row.tier];
      label.textContent = row.handle + ' ';
      label.appendChild(tier);
      li.appendChild(label);

      const isSelf = row.participant_id === snapshot.ownParticipantId;
      const isTargetPh = row.tier === 'primary_host';

      if ((isPh || isCoHost) && !isSelf && !isTargetPh) {
        const actions = document.createElement('span');
        actions.style.display = 'flex';
        actions.style.gap = '0.25rem';

        if (isPh) {
          const promote = document.createElement('button');
          promote.className = 'sharpee-secondary';
          promote.textContent = row.tier === 'co_host' ? 'Demote' : 'Promote';
          promote.addEventListener('click', async () => {
            if (row.tier === 'co_host') {
              await deps.http.demote(deps.roomId, deps.identity.handle, row.handle, 'participant').catch(() => undefined);
            } else {
              await deps.http.promote(deps.roomId, deps.identity.handle, row.handle, 'co_host').catch(() => undefined);
            }
          });
          actions.appendChild(promote);

          const nominate = document.createElement('button');
          nominate.className = 'sharpee-secondary';
          nominate.textContent = row.is_successor ? 'Unmark' : 'Successor';
          nominate.disabled = row.is_successor;
          nominate.addEventListener('click', () => {
            void deps.http.nominateSuccessor(deps.roomId, deps.identity.handle, row.handle).catch(() => undefined);
          });
          actions.appendChild(nominate);
        }

        const mute = document.createElement('button');
        mute.className = 'sharpee-secondary';
        mute.textContent = row.muted ? 'Unmute' : 'Mute';
        if (isCoHost && row.tier === 'co_host') mute.disabled = true; // peer-CoHost mute is server-rejected
        mute.addEventListener('click', () => {
          void deps.http.mute(deps.roomId, deps.identity.handle, row.handle, !row.muted).catch(() => undefined);
        });
        actions.appendChild(mute);

        li.appendChild(actions);
      }

      list.appendChild(li);
    }
  }

  render(deps.store.snapshot());
  const unsubscribe = deps.store.subscribe(render);
  return unsubscribe;
}
