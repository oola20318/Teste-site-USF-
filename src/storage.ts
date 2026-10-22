import { type Database, SENTINELS, SANITATION } from './domain';
export const STORAGE_KEY = 'coelho-savassi-demo-v1';
// Deliberadamente sem autenticação: esta distribuição é uma demonstração local.
const strings = (value: Record<string, unknown>, keys: string[]) =>
  keys.every((k) => typeof value[k] === 'string');
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const numberOrNull = (v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v));
const change = (v: unknown) => object(v) && strings(v, ['at', 'action', 'detail']);
function validDatabase(value: unknown): value is Database {
  if (!object(value) || value.version !== 1) return false;
  const { families, patients, appointments, evaluations, audit } = value;
  if (![families, patients, appointments, evaluations, audit].every(Array.isArray)) return false;
  const arrays = [families, patients, appointments, evaluations, audit] as unknown[][];
  if (
    !arrays.every(
      (arr) =>
        arr.every((x) => object(x) && typeof x.id === 'string') &&
        new Set(arr.map((x) => (x as { id: string }).id)).size === arr.length,
    )
  )
    return false;
  const familyList = families as Record<string, unknown>[];
  const patientList = patients as Record<string, unknown>[];
  const evaluationList = evaluations as Record<string, unknown>[];
  const appointmentList = appointments as Record<string, unknown>[];
  const familyIds = new Set(familyList.map((f) => f.id));
  const patientIds = new Set(patientList.map((p) => p.id));
  const evaluationIds = new Set(evaluationList.map((e) => e.id));
  return (
    familyList.every((f) => strings(f, ['id', 'name', 'address', 'team', 'microarea'])) &&
    patientList.every(
      (p) =>
        strings(p, [
          'id',
          'name',
          'familyId',
          'birthDate',
          'team',
          'microarea',
          'professional',
          'notes',
        ]) && familyIds.has(p.familyId),
    ) &&
    evaluationList.every(
      (e) =>
        strings(e, ['id', 'familyId', 'date', 'operator', 'createdAt']) &&
        familyIds.has(e.familyId) &&
        numberOrNull(e.members) &&
        numberOrNull(e.rooms) &&
        object(e.counts) &&
        SENTINELS.every((s) => numberOrNull((e.counts as Record<string, unknown>)[s.key])) &&
        object(e.sanitation) &&
        SANITATION.every((s) => {
          const v = (e.sanitation as Record<string, unknown>)[s.key];
          return v === null || typeof v === 'boolean';
        }),
    ) &&
    appointmentList.every(
      (a) =>
        strings(a, [
          'id',
          'patientId',
          'date',
          'time',
          'team',
          'professional',
          'notes',
          'createdAt',
        ]) &&
        patientIds.has(a.patientId) &&
        ['scheduled', 'completed', 'cancelled'].includes(a.status as string) &&
        (a.evaluationId === null || evaluationIds.has(a.evaluationId)) &&
        Array.isArray(a.history) &&
        a.history.every(change),
    ) &&
    (audit as unknown[]).every((a) => change(a) && object(a) && strings(a, ['id', 'entityId']))
  );
}
export function readDatabase(storage: Pick<Storage, 'getItem'>): Database | null {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (!validDatabase(parsed)) throw new Error('Dados locais incompatíveis ou corrompidos.');
  return parsed as Database;
}
export function writeDatabase(storage: Pick<Storage, 'setItem'>, db: Database) {
  storage.setItem(STORAGE_KEY, JSON.stringify(db));
}
