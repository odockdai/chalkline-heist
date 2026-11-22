// The alarm meter: what raises it, how it settles back, the tiers it climbs through, and the
// lockdown at 100 when the police are on their way and the van is the only way out.
import { ALARM } from './config.js';

export const TIERS = [
  { name: 'CALM', from: 0, note: 'Nobody knows you are here' },
  { name: 'ALERT', from: ALARM.floors[1], note: 'Guards walk faster, torches reach further' },
  { name: 'HUNT', from: ALARM.floors[2], note: 'Every guard is looking for you' },
];
export const LOCKDOWN_SECONDS = 30;

export function tierOf(level) {
  let tier = 0;
  for (let index = 0; index < TIERS.length; index += 1) if (level >= TIERS[index].from) tier = index;
  return tier;
}

export function raiseAlarm(run, amount, reason) {
  if (run.phase === 'escaped' || run.phase === 'caught') return;
  const before = tierOf(run.alarm);
  run.alarm = Math.min(ALARM.lockdown, run.alarm + amount);
  const after = tierOf(run.alarm);
  if (after > before) {
    run.events.push('tier');
    run.banner = { text: `ALARM: ${TIERS[after].name}`, sub: TIERS[after].note, color: after === 2 ? 'danger' : 'suspect', t: 2.6 };
  }
  if (reason) run.lastAlarmReason = reason;
  if (run.alarm >= ALARM.lockdown && run.lockdown === null) startLockdown(run);
}

function startLockdown(run) {
  run.lockdown = LOCKDOWN_SECONDS;
  run.events.push('lockdown');
  run.banner = { text: 'LOCKDOWN', sub: `Police in ${LOCKDOWN_SECONDS} seconds. Get to the van.`, color: 'danger', t: 3.5 };
}

/** Let the meter settle toward its tier's floor while nobody sees the thief; count the police in. */
export function stepAlarm(run, dt, seen) {
  if (!seen && run.lockdown === null) {
    const floor = TIERS[tierOf(run.alarm)].from;
    run.alarm = Math.max(floor, run.alarm - ALARM.decay * dt);
  }
  if (run.lockdown !== null && run.phase !== 'escaped' && run.phase !== 'caught') {
    run.lockdown -= dt;
    if (run.lockdown <= 0) {
      run.lockdown = 0;
      run.phase = 'caught';
      run.caughtBy = 'the police';
      run.events.push('caught');
    }
  }
}
