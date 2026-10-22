export const SENTINELS = [
  {
    key: 'bedridden',
    title: 'Restrição ao domicílio',
    question:
      'Quantas pessoas estão acamadas ou restritas ao domicílio por incapacidade de locomoção, conforme a definição da escala?',
    weight: 3,
    help: 'Pessoa restrita ao domicílio por falta de habilidade ou incapacidade de se locomover por si só até uma unidade de saúde. Não se limita a permanecer na cama.',
  },
  {
    key: 'physical',
    title: 'Deficiência física',
    question:
      'Quantas pessoas apresentam deficiência física de longa duração ou permanente que dificulte atividades?',
    weight: 3,
    help: 'Condição física de longa duração ou permanente que dificulta ou impede atividades cotidianas, escolares, de trabalho ou de lazer.',
  },
  {
    key: 'mental',
    title: 'Condição do instrumento original',
    question:
      'Quantas pessoas apresentam a condição denominada “deficiência mental” no instrumento original?',
    weight: 3,
    help: 'Terminologia histórica do instrumento para uma condição mental de longa duração ou permanente que dificulta ou impede atividades cotidianas, escolares, de trabalho ou de lazer. A identificação exige avaliação profissional contextualizada. Não equiparar automaticamente transtornos mentais a esta sentinela.',
  },
  {
    key: 'malnutrition',
    title: 'Desnutrição grave',
    question: 'Quantas pessoas apresentam desnutrição grave conforme avaliação profissional?',
    weight: 3,
    help: 'O anexo descreve percentil menor que 0,1 e peso muito baixo para a idade. Registrar apenas quando identificada em avaliação profissional; uma resposta ou medida isolada não estabelece diagnóstico.',
  },
  {
    key: 'substances',
    title: 'Uso compulsivo de substâncias',
    question:
      'Quantas pessoas apresentam uso compulsivo/dependência de substâncias lícitas ou ilícitas, conforme a sentinela do instrumento?',
    weight: 2,
    help: 'Uso compulsivo de substâncias com potencial de dependência: álcool, tabaco, benzodiazepínicos, barbitúricos e substâncias ilícitas. Evite estigmas e não confunda qualquer uso com dependência.',
  },
  {
    key: 'unemployment',
    title: 'Desemprego',
    question: 'Quantas pessoas estão em situação de desemprego conforme a definição da escala?',
    weight: 2,
    help: 'Pessoa que não exerce nenhuma ocupação. Trabalho doméstico é ocupação, mesmo sem remuneração. Férias, licenças e afastamentos temporários não equivalem a desemprego. Não inferir pela idade nem pela ausência de renda.',
  },
  {
    key: 'literacy',
    title: 'Leitura e escrita',
    question: 'Quantas pessoas em idade escolar ou superior não sabem ler e escrever um bilhete?',
    weight: 1,
    help: 'Pessoa a partir da idade escolar que não sabe ler nem escrever ao menos um bilhete, inclusive quem apenas assina o nome.',
  },
  {
    key: 'infants',
    title: 'Menores de 6 meses',
    question: 'Quantos integrantes têm menos de 6 meses?',
    weight: 1,
    help: 'Lactentes com idade até 5 meses e 29 dias. Confirmar a composição familiar na data da avaliação.',
  },
  {
    key: 'elderly',
    title: '70 anos ou mais',
    question: 'Quantos integrantes têm 70 anos completos ou mais?',
    weight: 1,
    help: 'Adota-se 70 anos completos ou mais, conforme a definição operacional da sistematização dos autores. O anexo utiliza “maior de 70 anos”.',
  },
  {
    key: 'hypertension',
    title: 'Hipertensão arterial',
    question:
      'Quantas pessoas têm hipertensão arterial sistêmica identificada pela equipe de saúde?',
    weight: 1,
    help: 'Registrar hipertensão identificada pela equipe. O anexo cita níveis pressóricos, mas uma medida isolada ou uma resposta ao formulário não permite diagnosticar hipertensão.',
  },
  {
    key: 'diabetes',
    title: 'Diabetes mellitus',
    question: 'Quantas pessoas têm diabetes mellitus identificado pela equipe de saúde?',
    weight: 1,
    help: 'Conjunto de doenças metabólicas com hiperglicemia e possíveis complicações. Registrar condição identificada pela equipe; não diagnosticar a partir de uma resposta ou medida isolada.',
  },
] as const;

export type SentinelKey = (typeof SENTINELS)[number]['key'];
export const SANITATION = [
  { key: 'trash', label: 'Lixo a céu aberto' },
  { key: 'water', label: 'Água sem tratamento' },
  { key: 'sewage', label: 'Esgoto a céu aberto' },
] as const;
export type SanitationKey = (typeof SANITATION)[number]['key'];
export type Risk = 'below' | 'r1' | 'r2' | 'r3';
export const RISK: Record<Risk, { label: string; short: string; range: string }> = {
  below: { label: 'Abaixo do ponto de corte para R1', short: 'Abaixo de R1', range: '0–4 pontos' },
  r1: { label: 'R1 — Risco menor', short: 'R1 · Risco menor', range: '5–6 pontos' },
  r2: { label: 'R2 — Risco médio', short: 'R2 · Risco médio', range: '7–8 pontos' },
  r3: { label: 'R3 — Risco máximo', short: 'R3 · Risco máximo', range: '9 pontos ou mais' },
};
export interface Family {
  id: string;
  name: string;
  address: string;
  team: string;
  microarea: string;
}
export interface Patient {
  id: string;
  name: string;
  familyId: string;
  birthDate: string;
  team: string;
  microarea: string;
  professional: string;
  notes: string;
}
export interface Evaluation {
  id: string;
  familyId: string;
  date: string;
  operator: string;
  createdAt: string;
  members: number | null;
  rooms: number | null;
  counts: Record<SentinelKey, number | null>;
  sanitation: Record<SanitationKey, boolean | null>;
}
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';
export interface Change {
  at: string;
  action: string;
  detail: string;
}
export interface Appointment {
  id: string;
  patientId: string;
  date: string;
  time: string;
  professional: string;
  team: string;
  notes: string;
  status: AppointmentStatus;
  evaluationId: string | null;
  createdAt: string;
  history: Change[];
}
export interface Audit extends Change {
  id: string;
  entityId: string;
}
export interface Database {
  version: 1;
  families: Family[];
  patients: Patient[];
  evaluations: Evaluation[];
  appointments: Appointment[];
  audit: Audit[];
}

export const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function shiftDay(date: string, delta: number) {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const formatDate = (date: string) =>
  date ? new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR') : 'Não informada';
export const fullDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
export const patientCode = (id: string) =>
  id.startsWith('PAC-')
    ? id
    : `PAC-${id
        .replace(/^patient-/, '')
        .slice(0, 8)
        .toUpperCase()}`;
export function classify(score: number): Risk {
  if (!Number.isSafeInteger(score) || score < 0) throw new Error('Escore inválido.');
  return score >= 9 ? 'r3' : score >= 7 ? 'r2' : score >= 5 ? 'r1' : 'below';
}
export function emptyEvaluation(familyId: string): Evaluation {
  return {
    id: uid('evaluation'),
    familyId,
    date: today(),
    operator: '',
    createdAt: new Date().toISOString(),
    members: null,
    rooms: null,
    counts: Object.fromEntries(SENTINELS.map((s) => [s.key, null])) as Evaluation['counts'],
    sanitation: { trash: null, water: null, sewage: null },
  };
}
export function calculate(e?: Evaluation | null) {
  const pending: string[] = [];
  const rows: { key: string; label: string; detail: string; points: number | null }[] = [];
  if (!e)
    return {
      complete: false,
      score: null,
      subtotal: 0,
      risk: null,
      pending: ['Família sem avaliação'],
      rows,
      ratio: null,
    };
  const validMembers = e.members !== null && Number.isSafeInteger(e.members) && e.members > 0;
  const validRooms = e.rooms !== null && Number.isSafeInteger(e.rooms) && e.rooms > 0;
  if (!validMembers) pending.push('Número de integrantes');
  if (!validRooms) pending.push('Número de cômodos');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) pending.push('Data da avaliação');
  if (!e.operator.trim()) pending.push('Operador responsável');
  for (const s of SENTINELS) {
    const n = e.counts[s.key];
    const valid =
      n !== null && Number.isSafeInteger(n) && n >= 0 && validMembers && n <= e.members!;
    if (!valid) pending.push(s.title);
    rows.push({
      key: s.key,
      label: s.title,
      detail: valid ? `${n} pessoa(s) × ${s.weight}` : 'Não informado ou inválido',
      points: valid ? n! * s.weight : null,
    });
  }
  const sanitationKnown = SANITATION.every((s) => typeof e.sanitation[s.key] === 'boolean');
  const anySanitation = SANITATION.some((s) => e.sanitation[s.key] === true);
  if (!sanitationKnown) pending.push('Condições de saneamento');
  rows.push({
    key: 'sanitation',
    label: 'Baixas condições de saneamento',
    detail: anySanitation
      ? 'Uma ou mais condições · uma vez por domicílio'
      : sanitationKnown
        ? 'Nenhuma das três condições'
        : 'Confirmação pendente',
    points: sanitationKnown || anySanitation ? (anySanitation ? 3 : 0) : null,
  });
  const ratio = validMembers && validRooms ? e.members! / e.rooms! : null;
  const density =
    ratio === null ? null : e.members! > e.rooms! ? 3 : e.members! === e.rooms! ? 2 : 0;
  rows.push({
    key: 'density',
    label: 'Adensamento domiciliar',
    detail:
      ratio === null
        ? 'Moradores e cômodos necessários'
        : `${e.members} moradores ÷ ${e.rooms} cômodos = ${ratio.toLocaleString('pt-BR', { maximumFractionDigits: 4 })} (exibição aproximada)`,
    points: density,
  });
  const subtotal = rows.reduce((sum, row) => sum + (row.points ?? 0), 0);
  if (!Number.isSafeInteger(subtotal)) pending.push('Escore fora do limite numérico suportado');
  return {
    complete: pending.length === 0,
    score: pending.length ? null : subtotal,
    subtotal,
    risk: pending.length ? null : classify(subtotal),
    pending,
    rows,
    ratio,
  };
}
export function latestEvaluation(db: Database, familyId: string) {
  return [...db.evaluations].reverse().find((e) => e.familyId === familyId);
}
export function appointmentEvaluation(db: Database, appointment: Appointment) {
  return db.evaluations.find((e) => e.id === appointment.evaluationId);
}
export function withAudit(
  db: Database,
  entityId: string,
  action: string,
  detail: string,
): Database {
  return {
    ...db,
    audit: [
      { id: uid('audit'), entityId, action, detail, at: new Date().toISOString() },
      ...db.audit,
    ],
  };
}
export function saveEvaluation(db: Database, evaluation: Evaluation): Database {
  if (db.evaluations.some((e) => e.id === evaluation.id))
    throw new Error('Uma avaliação salva é imutável. Crie uma reavaliação.');
  const patientIds = new Set(
    db.patients.filter((p) => p.familyId === evaluation.familyId).map((p) => p.id),
  );
  const at = new Date().toISOString();
  const next = {
    ...db,
    evaluations: [...db.evaluations, evaluation],
    appointments: db.appointments.map((a) =>
      a.status === 'scheduled' && patientIds.has(a.patientId)
        ? {
            ...a,
            evaluationId: evaluation.id,
            history: [
              ...a.history,
              {
                at,
                action: 'Avaliação atualizada',
                detail: `Referência familiar: ${evaluation.id}`,
              },
            ],
          }
        : a,
    ),
  };
  return withAudit(
    next,
    evaluation.familyId,
    'Avaliação familiar salva',
    `${evaluation.operator || 'Operador não informado'} · ${calculate(evaluation).complete ? 'Completa' : 'Incompleta'}`,
  );
}
export function duplicateAppointments(
  db: Database,
  patientId: string,
  date: string,
  excludeId?: string,
) {
  return db.appointments.filter(
    (a) =>
      a.patientId === patientId &&
      a.date === date &&
      a.status !== 'cancelled' &&
      a.id !== excludeId,
  );
}
export function sortedActive(db: Database, date: string) {
  return db.appointments
    .filter((a) => a.date === date && a.status === 'scheduled')
    .sort((a, b) => {
      const sa = calculate(appointmentEvaluation(db, a)).score;
      const sb = calculate(appointmentEvaluation(db, b)).score;
      if (sa === null && sb !== null) return 1;
      if (sb === null && sa !== null) return -1;
      return (
        (sb ?? -1) - (sa ?? -1) ||
        (a.time || '99:99').localeCompare(b.time || '99:99') ||
        a.createdAt.localeCompare(b.createdAt) ||
        db.appointments.indexOf(a) - db.appointments.indexOf(b)
      );
    });
}
