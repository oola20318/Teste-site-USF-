import { describe, it, expect } from 'vitest';
import {
  calculate,
  classify,
  emptyEvaluation,
  SENTINELS,
  saveEvaluation,
  sortedActive,
  duplicateAppointments,
  latestEvaluation,
  appointmentEvaluation,
  type Evaluation,
} from '../src/domain';
import { makeDemo } from '../src/seed';
import { readDatabase, writeDatabase, STORAGE_KEY } from '../src/storage';

function complete(): Evaluation {
  return {
    ...emptyEvaluation('family-test'),
    operator: 'Operador fictício',
    members: 4,
    rooms: 8,
    counts: Object.fromEntries(SENTINELS.map((s) => [s.key, 0])) as Evaluation['counts'],
    sanitation: { trash: false, water: false, sewage: false },
  };
}
describe('classificação clínica solicitada', () => {
  it.each([
    [4, 'below'],
    [5, 'r1'],
    [6, 'r1'],
    [7, 'r2'],
    [8, 'r2'],
    [9, 'r3'],
    [10, 'r3'],
  ] as const)('classifica escore %i como %s', (score, risk) => expect(classify(score)).toBe(risk));
  it('também calcula as fronteiras a partir de respostas reais', () => {
    for (const score of [4, 5, 6, 7, 8, 9, 10]) {
      const e = complete();
      e.counts.hypertension = 4;
      e.counts.diabetes = Math.min(score - 4, 4);
      if (score > 8) e.counts.elderly = score - 8;
      expect(calculate(e).score).toBe(score);
      expect(calculate(e).risk).toBe(
        score >= 9 ? 'r3' : score >= 7 ? 'r2' : score >= 5 ? 'r1' : 'below',
      );
    }
  });
  it('dois integrantes hipertensos contribuem com dois pontos', () => {
    const e = complete();
    e.counts.hypertension = 2;
    expect(calculate(e).score).toBe(2);
  });
  it('acumula várias condições de uma mesma pessoa', () => {
    const e = complete();
    e.members = 1;
    e.counts.bedridden = 1;
    e.counts.physical = 1;
    e.counts.hypertension = 1;
    e.counts.diabetes = 1;
    expect(calculate(e).score).toBe(8);
  });
  it('saneamento contribui uma vez, mesmo com três condições', () => {
    const e = complete();
    e.sanitation = { trash: true, water: true, sewage: true };
    expect(calculate(e).score).toBe(3);
  });
  it.each([
    [4, 2, 3],
    [4, 4, 2],
    [2, 4, 0],
    [10001, 10000, 3],
  ])('%i moradores / %i cômodos = %i pontos de adensamento', (members, rooms, points) => {
    const e = complete();
    e.members = members;
    e.rooms = rooms;
    expect(calculate(e).score).toBe(points);
  });
  it('bloqueia divisão por zero e mantém a avaliação incompleta', () => {
    const e = complete();
    e.rooms = 0;
    const r = calculate(e);
    expect(r.ratio).toBeNull();
    expect(r.complete).toBe(false);
    expect(r.score).toBeNull();
    expect(r.risk).toBeNull();
  });
  it('nenhuma resposta nasce como zero ou não', () => {
    const e = emptyEvaluation('f');
    expect(Object.values(e.counts).every((n) => n === null)).toBe(true);
    expect(Object.values(e.sanitation).every((n) => n === null)).toBe(true);
    expect(e.members).toBeNull();
    expect(e.rooms).toBeNull();
  });
  it('informação desconhecida não recebe classificação definitiva', () => {
    const e = complete();
    e.counts.diabetes = null;
    const r = calculate(e);
    expect(r.score).toBeNull();
    expect(r.risk).toBeNull();
    expect(r.pending).toContain('Diabetes mellitus');
    expect(r.subtotal).toBe(0);
  });
  it('saneamento parcialmente desconhecido também impede classificação', () => {
    const e = complete();
    e.sanitation = { trash: true, water: null, sewage: false };
    expect(calculate(e).subtotal).toBe(3);
    expect(calculate(e).risk).toBeNull();
  });
  it.each([-1, 1.5, 5, NaN])('rejeita contagens inválidas: %s', (count) => {
    const e = complete();
    e.counts.hypertension = count;
    expect(calculate(e).complete).toBe(false);
  });
  it('exige operador e data para uma avaliação completa', () => {
    const e = complete();
    e.operator = '';
    e.date = '';
    expect(calculate(e).pending).toEqual(
      expect.arrayContaining(['Operador responsável', 'Data da avaliação']),
    );
  });
});

describe('agenda, reuso e histórico', () => {
  it('filtra a data da consulta, não a data do cadastro', () => {
    const db = makeDemo();
    const a = db.appointments[0];
    expect(sortedActive(db, a.date).some((x) => x.id === a.id)).toBe(true);
    expect(sortedActive(db, a.createdAt.slice(0, 10)).some((x) => x.id === a.id)).toBe(false);
  });
  it('ordena por escore decrescente, mantendo horários', () => {
    const db = makeDemo();
    const originalTimes = db.appointments.map((a) => a.time);
    const list = sortedActive(db, db.appointments[0].date);
    expect(list.slice(0, 4).map((a) => calculate(appointmentEvaluation(db, a)).score)).toEqual([
      12, 7, 6, 2,
    ]);
    expect(db.appointments.map((a) => a.time)).toEqual(originalTimes);
    expect(list.slice(4).every((a) => calculate(appointmentEvaluation(db, a)).risk === null)).toBe(
      true,
    );
  });
  it('usa horário e ordem de inclusão em empates; sem horário fica depois', () => {
    const db = makeDemo();
    const base = db.appointments[0];
    db.appointments = [
      { ...base, id: 'later', time: '10:00', createdAt: '2026-01-01T01:00:00Z' },
      { ...base, id: 'tie-second', time: '08:00', createdAt: '2026-01-01T02:00:00Z' },
      { ...base, id: 'tie-first', time: '08:00', createdAt: '2026-01-01T01:00:00Z' },
      { ...base, id: 'no-time', time: '', createdAt: '2026-01-01T00:00:00Z' },
    ];
    expect(sortedActive(db, base.date).map((a) => a.id)).toEqual([
      'tie-first',
      'tie-second',
      'later',
      'no-time',
    ]);
  });
  it('não inclui canceladas nem concluídas na lista ativa', () => {
    const db = makeDemo();
    expect(sortedActive(db, db.appointments[0].date).every((a) => a.status === 'scheduled')).toBe(
      true,
    );
  });
  it('compartilha a avaliação sem duplicar pontuação entre familiares', () => {
    const db = makeDemo();
    const sameFamily = db.appointments.filter((a) =>
      ['PAC-0001', 'PAC-0007'].includes(a.patientId),
    );
    expect(new Set(sameFamily.map((a) => a.evaluationId)).size).toBe(1);
    expect(sameFamily.map((a) => calculate(appointmentEvaluation(db, a)).score)).toEqual([
      12, 12, 12,
    ]);
  });
  it('reavaliação atualiza os pendentes de toda a família e preserva concluídos e o passado', () => {
    const db = makeDemo();
    const snapshot = JSON.stringify(db);
    const old = db.evaluations[0];
    const evaluation = { ...complete(), familyId: 'fam-1', id: 'new' };
    const next = saveEvaluation(db, evaluation);
    expect(JSON.stringify(db)).toBe(snapshot);
    expect(next.evaluations.find((e) => e.id === old.id)).toEqual(old);
    expect(next.evaluations.length).toBe(db.evaluations.length + 1);
    expect(
      next.appointments
        .filter((a) => a.status === 'scheduled' && a.patientId === 'PAC-0001')
        .every((a) => a.evaluationId === 'new'),
    ).toBe(true);
    expect(next.appointments.find((a) => a.patientId === 'PAC-0007')?.evaluationId).toBe(old.id);
    expect(latestEvaluation(next, 'fam-1')?.id).toBe('new');
    expect(next.audit[0].action).toBe('Avaliação familiar salva');
  });
  it('uma reavaliação incompleta não mantém escore antigo como definitivo', () => {
    const db = makeDemo();
    const e = emptyEvaluation('fam-1');
    e.operator = 'Operador';
    const next = saveEvaluation(db, e);
    expect(calculate(appointmentEvaluation(next, next.appointments[0])).risk).toBeNull();
    expect(calculate(appointmentEvaluation(next, next.appointments[6])).risk).toBe('r3');
  });
  it('avaliações anteriores são imutáveis', () => {
    const db = makeDemo();
    expect(() => saveEvaluation(db, db.evaluations[0])).toThrow('imutável');
  });
  it('alerta duplicidade por paciente e dia, excluindo o próprio registro', () => {
    const db = makeDemo();
    const a = db.appointments[0];
    expect(duplicateAppointments(db, a.patientId, a.date)).toHaveLength(1);
    expect(duplicateAppointments(db, a.patientId, a.date, a.id)).toHaveLength(0);
    expect(duplicateAppointments(db, 'PAC-0008', a.date)).toHaveLength(0);
  });
});

describe('persistência de demonstração', () => {
  it('valores numéricos extremos não causam classificação incorreta nem falha de execução', () => {
    const e = complete();
    e.members = 1e308;
    e.counts.hypertension = 1e308;
    expect(calculate(e).risk).toBeNull();
    e.members = Number.MAX_SAFE_INTEGER;
    e.counts.bedridden = Number.MAX_SAFE_INTEGER;
    e.counts.hypertension = 0;
    expect(calculate(e).risk).toBeNull();
    expect(calculate(e).pending).toContain('Escore fora do limite numérico suportado');
  });
  it('preserva referências, histórico e dados após salvar e recarregar', () => {
    const map = new Map<string, string>();
    const storage = {
      setItem: (key: string, value: string) => {
        map.set(key, value);
      },
      getItem: (key: string) => map.get(key) ?? null,
    };
    const db = makeDemo();
    writeDatabase(storage, db);
    const reloaded = readDatabase(storage)!;
    expect(reloaded).toEqual(db);
    expect(calculate(appointmentEvaluation(reloaded, reloaded.appointments[0])).score).toBe(12);
  });
  it('não aceita armazenamento corrompido silenciosamente', () => {
    expect(() => readDatabase({ getItem: () => '{bad-json' })).toThrow();
    expect(() => readDatabase({ getItem: () => JSON.stringify({ version: 5 }) })).toThrow();
  });
  it('rejeita referências quebradas e registros com estrutura incompleta', () => {
    const db = makeDemo();
    db.patients[0].familyId = 'missing-family';
    expect(() => readDatabase({ getItem: () => JSON.stringify(db) })).toThrow();
    expect(() =>
      readDatabase({ getItem: () => JSON.stringify({ ...makeDemo(), evaluations: [{}] }) }),
    ).toThrow();
  });
  it('usa uma chave própria; ausência de dados permite iniciar a demonstração', () => {
    expect(STORAGE_KEY).toBe('coelho-savassi-demo-v1');
    expect(readDatabase({ getItem: () => null })).toBeNull();
  });
});
