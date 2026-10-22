import { useState, type FormEvent } from 'react';
import { AlertTriangle, Info, Users, Home, ClipboardList } from 'lucide-react';
import {
  type Database,
  type Family,
  type Patient,
  type Appointment,
  type Evaluation,
  SENTINELS,
  SANITATION,
  uid,
  patientCode,
  today,
  emptyEvaluation,
  calculate,
  latestEvaluation,
  duplicateAppointments,
} from './domain';
import { Field, FormActions, Calculation } from './ui';

export function FamilyForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Family;
  onSave: (f: Family) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState<Family>(
    initial ?? { id: uid('family'), name: '', address: '', team: '', microarea: '' },
  );
  const update = (key: keyof Family, value: string) => setF({ ...f, [key]: value });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (f.name.trim()) onSave({ ...f, name: f.name.trim() });
      }}
    >
      <div className="form-body">
        <p className="form-intro">
          Uma família pode reunir vários pacientes e compartilha uma única avaliação vigente.
        </p>
        <Field label="Nome da família *">
          <input
            required
            maxLength={120}
            value={f.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Ex.: Família Souza (fictícia)"
          />
        </Field>
        <Field label="Endereço (opcional)">
          <input
            value={f.address}
            maxLength={240}
            onChange={(e) => update('address', e.target.value)}
          />
        </Field>
        <div className="form-grid">
          <Field label="Equipe / UBS">
            <input
              value={f.team}
              maxLength={120}
              onChange={(e) => update('team', e.target.value)}
            />
          </Field>
          <Field label="Microárea">
            <input
              value={f.microarea}
              maxLength={40}
              onChange={(e) => update('microarea', e.target.value)}
            />
          </Field>
        </div>
      </div>
      <FormActions onClose={onClose} label="Salvar família" />
    </form>
  );
}

export function PatientForm({
  db,
  initial,
  onSave,
  onClose,
}: {
  db: Database;
  initial?: Patient;
  onSave: (p: Patient, family?: Family) => void;
  onClose: () => void;
}) {
  const [p, setP] = useState<Patient>(
    initial ?? {
      id: uid('patient'),
      name: '',
      familyId: '',
      birthDate: '',
      team: '',
      microarea: '',
      professional: '',
      notes: '',
    },
  );
  const [newFamily, setNewFamily] = useState({ name: '', address: '' });
  const update = (key: keyof Patient, value: string) => setP({ ...p, [key]: value });
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!p.name.trim()) return;
    const family =
      p.familyId === '__new'
        ? {
            id: uid('family'),
            name: newFamily.name.trim(),
            address: newFamily.address.trim(),
            team: p.team,
            microarea: p.microarea,
          }
        : undefined;
    if (family && !family.name) return;
    onSave({ ...p, name: p.name.trim(), familyId: family?.id ?? p.familyId }, family);
  }
  return (
    <form onSubmit={submit}>
      <div className="form-body">
        <div className="id-line">
          <span>Identificador interno</span>
          <code>{patientCode(p.id)}</code>
          <small>Gerado automaticamente</small>
        </div>
        <Field label="Nome completo do paciente *">
          <input
            required
            maxLength={160}
            value={p.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Nome completo fictício"
            autoComplete="off"
          />
        </Field>
        <Field
          label="Família vinculada *"
          hint="Pacientes da mesma família utilizam a mesma avaliação, sem duplicar pontos."
        >
          <select required value={p.familyId} onChange={(e) => update('familyId', e.target.value)}>
            <option value="">Selecione uma família</option>
            {db.families.map((f) => (
              <option value={f.id} key={f.id}>
                {f.name}
              </option>
            ))}
            <option value="__new">+ Cadastrar nova família</option>
          </select>
        </Field>
        {p.familyId === '__new' && (
          <div className="inline-panel">
            <Field label="Nome da nova família *">
              <input
                required
                maxLength={120}
                value={newFamily.name}
                onChange={(e) => setNewFamily({ ...newFamily, name: e.target.value })}
              />
            </Field>
            <Field label="Endereço da família">
              <input
                maxLength={240}
                value={newFamily.address}
                onChange={(e) => setNewFamily({ ...newFamily, address: e.target.value })}
              />
            </Field>
          </div>
        )}
        <div className="form-grid">
          <Field label="Data de nascimento">
            <input
              type="date"
              max={today()}
              value={p.birthDate}
              onChange={(e) => update('birthDate', e.target.value)}
            />
          </Field>
          <Field label="Equipe / UBS">
            <input
              maxLength={120}
              value={p.team}
              onChange={(e) => update('team', e.target.value)}
            />
          </Field>
          <Field label="Microárea">
            <input
              maxLength={40}
              value={p.microarea}
              onChange={(e) => update('microarea', e.target.value)}
            />
          </Field>
          <Field label="Profissional responsável">
            <input
              maxLength={120}
              value={p.professional}
              onChange={(e) => update('professional', e.target.value)}
            />
          </Field>
        </div>
        <Field label="Observações">
          <textarea
            rows={3}
            maxLength={2000}
            value={p.notes}
            onChange={(e) => update('notes', e.target.value)}
          />
        </Field>
        <div className="callout">
          <Info size={18} />
          <p>
            Este cadastro não cria uma consulta. Após salvar, use “Agendar consulta” para escolher a
            data. CPF e CNS não são solicitados nesta demonstração.
          </p>
        </div>
      </div>
      <FormActions onClose={onClose} label="Salvar paciente" />
    </form>
  );
}

export function AppointmentForm({
  db,
  initial,
  patientId,
  date,
  onSave,
  onClose,
}: {
  db: Database;
  initial?: Appointment;
  patientId?: string;
  date: string;
  onSave: (a: Appointment) => void;
  onClose: () => void;
}) {
  const patient = db.patients.find((p) => p.id === patientId);
  const [a, setA] = useState<Appointment>(
    initial ?? {
      id: uid('appointment'),
      patientId: patientId || '',
      date,
      time: '',
      team: patient?.team ?? '',
      professional: patient?.professional ?? '',
      notes: '',
      status: 'scheduled',
      evaluationId: null,
      createdAt: new Date().toISOString(),
      history: [],
    },
  );
  const [confirmedDuplicate, setConfirmedDuplicate] = useState(false);
  const duplicates = duplicateAppointments(db, a.patientId, a.date, initial?.id);
  const p = db.patients.find((p) => p.id === a.patientId);
  const f = db.families.find((f) => f.id === p?.familyId);
  const ev = f && latestEvaluation(db, f.id);
  function update(key: keyof Appointment, value: string) {
    setA({ ...a, [key]: value });
    if (key === 'date' || key === 'patientId') setConfirmedDuplicate(false);
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!p || !a.date || (duplicates.length && !confirmedDuplicate)) return;
    onSave({
      ...a,
      evaluationId: ev?.id ?? null,
      history: [
        ...a.history,
        {
          at: new Date().toISOString(),
          action: initial ? 'Consulta editada / reagendada' : 'Consulta agendada',
          detail: initial
            ? `${initial.date} ${initial.time || 'sem horário'} → ${a.date} ${a.time || 'sem horário'}; dados complementares atualizados.`
            : `${a.date} ${a.time || 'sem horário'}`,
        },
      ],
    });
  }
  return (
    <form onSubmit={submit}>
      <div className="form-body">
        <Field label="Paciente *">
          <select
            required
            value={a.patientId}
            onChange={(e) => {
              const p = db.patients.find((p) => p.id === e.target.value);
              setA({
                ...a,
                patientId: e.target.value,
                team: p?.team ?? '',
                professional: p?.professional ?? '',
              });
              setConfirmedDuplicate(false);
            }}
          >
            <option value="">Selecione um paciente cadastrado</option>
            {db.patients.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name} · {patientCode(p.id)}
              </option>
            ))}
          </select>
        </Field>
        {f && (
          <div className="inline-family">
            <Users size={18} />
            <div>
              <strong>{f.name}</strong>
              <small>
                {ev && calculate(ev).complete
                  ? `Escore familiar: ${calculate(ev).score} pontos`
                  : 'Avaliação pendente · não presume baixo risco'}
              </small>
            </div>
          </div>
        )}
        <div className="form-grid">
          <Field label="Data da consulta *">
            <input
              required
              type="date"
              value={a.date}
              onChange={(e) => update('date', e.target.value)}
            />
          </Field>
          <Field label="Horário da consulta">
            <input type="time" value={a.time} onChange={(e) => update('time', e.target.value)} />
          </Field>
          <Field label="Equipe / UBS">
            <input
              maxLength={120}
              value={a.team}
              onChange={(e) => update('team', e.target.value)}
            />
          </Field>
          <Field label="Profissional responsável">
            <input
              maxLength={120}
              value={a.professional}
              onChange={(e) => update('professional', e.target.value)}
            />
          </Field>
        </div>
        <Field label="Observações do agendamento">
          <textarea
            rows={3}
            maxLength={2000}
            value={a.notes}
            onChange={(e) => update('notes', e.target.value)}
          />
        </Field>
        {duplicates.length > 0 && (
          <div className="callout warning">
            <AlertTriangle size={20} />
            <div>
              <strong>Possível agendamento duplicado</strong>
              <p>
                Este paciente já tem {duplicates.length} consulta(s) nesta data (
                {duplicates.map((d) => d.time || 'sem horário').join(', ')}).
              </p>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={confirmedDuplicate}
                  onChange={(e) => setConfirmedDuplicate(e.target.checked)}
                />
                Verifiquei e desejo manter outro agendamento neste dia.
              </label>
            </div>
          </div>
        )}
        <p className="form-note">
          A ordenação por vulnerabilidade não altera o horário marcado. A avaliação familiar vigente
          será vinculada à consulta.
        </p>
      </div>
      <FormActions
        onClose={onClose}
        label={initial ? 'Salvar alterações' : 'Agendar consulta'}
        disabled={!!duplicates.length && !confirmedDuplicate}
      />
    </form>
  );
}

export function EvaluationForm({
  family,
  onSave,
  onClose,
}: {
  family: Family;
  onSave: (evaluation: Evaluation) => void;
  onClose: () => void;
}) {
  const [evaluation, setEvaluation] = useState(() => emptyEvaluation(family.id));
  const [step, setStep] = useState<'form' | 'review'>('form');
  const result = calculate(evaluation);
  const numberValue = (value: string) => (value === '' ? null : Number(value));
  function submit(e: FormEvent) {
    e.preventDefault();
    setStep('review');
    document.querySelector('.modal')?.scrollTo({ top: 0 });
  }
  if (step === 'review')
    return (
      <div>
        <div className="form-body">
          <div className="section-caption">REVISÃO DA AVALIAÇÃO</div>
          <h3>{family.name}</h3>
          <p className="muted">
            {evaluation.date.split('-').reverse().join('/')} · {evaluation.operator}
          </p>
          <Calculation evaluation={evaluation} />
          <p className="form-note">
            Ao salvar, todos os agendamentos pendentes desta família passam a referenciar esta
            avaliação, inclusive se estiver incompleta. Consultas concluídas e avaliações anteriores
            são preservadas.
          </p>
        </div>
        <div className="form-actions">
          <button className="button secondary" onClick={() => setStep('form')}>
            Voltar ao questionário
          </button>
          <button className="button primary" onClick={() => onSave(evaluation)}>
            Salvar avaliação e vincular ao agendamento
          </button>
        </div>
      </div>
    );
  return (
    <form onSubmit={submit}>
      <div className="form-body evaluation-form">
        <div className="callout">
          <Info size={20} />
          <div>
            <strong>A avaliação é da família, não de um único paciente.</strong>
            <p>
              Uma pessoa pode ter várias condições. Conte cada condição aplicável; não repita a
              avaliação para cada integrante.
            </p>
          </div>
        </div>
        <div className="form-grid">
          <Field label="Data da avaliação *">
            <input
              required
              type="date"
              max={today()}
              value={evaluation.date}
              onChange={(e) => setEvaluation({ ...evaluation, date: e.target.value })}
            />
          </Field>
          <Field label="Operador responsável *">
            <input
              required
              maxLength={120}
              value={evaluation.operator}
              onChange={(e) => setEvaluation({ ...evaluation, operator: e.target.value })}
              placeholder="Nome do profissional (fictício)"
            />
          </Field>
        </div>
        <h3 className="form-section">
          <Home size={19} />
          Composição e adensamento domiciliar
        </h3>
        <div className="form-grid">
          <Field
            label="Quantas pessoas moram no domicílio?"
            hint="Inteiro maior que zero. Em branco: não informado."
          >
            <input
              type="number"
              min={1}
              step={1}
              value={evaluation.members ?? ''}
              placeholder="Não informado"
              onChange={(e) =>
                setEvaluation({ ...evaluation, members: numberValue(e.target.value) })
              }
            />
          </Field>
          <Field
            label="Quantos cômodos existem no domicílio?"
            hint="Inteiro maior que zero. Em branco: não informado."
          >
            <input
              type="number"
              min={1}
              step={1}
              value={evaluation.rooms ?? ''}
              placeholder="Não informado"
              onChange={(e) => setEvaluation({ ...evaluation, rooms: numberValue(e.target.value) })}
            />
          </Field>
        </div>
        <p className="help-text">
          Conte os compartimentos separados por paredes que integram o domicílio. Inclua banheiro,
          cozinha e compartimentos externos que integrem o domicílio. Exclua corredores, alpendres,
          varandas abertas, garagens e depósitos. A relação é <strong>moradores ÷ cômodos</strong>:
          maior que 1 = 3 pontos; igual a 1 = 2; menor que 1 = 0. A pontuação usa a relação sem
          arredondamento.
        </p>
        <h3 className="form-section">
          <Users size={19} />
          Sentinelas individuais
        </h3>
        <p className="muted small">
          Quantas pessoas desta família apresentam esta condição? Confirme cada resposta. Em branco
          significa “Não informado”. As contagens não podem ultrapassar o número de integrantes.
        </p>
        {SENTINELS.map((s, index) => (
          <div className="sentinel" key={s.key}>
            <div>
              <label htmlFor={`sentinel-${s.key}`}>
                <span className="question-number">{String(index + 1).padStart(2, '0')}</span>
                {s.question}
              </label>
              <details className="context-help">
                <summary>Definição e orientação</summary>
                <p>{s.help}</p>
              </details>
            </div>
            <div className="sentinel-input">
              <span>
                {s.weight} ponto{s.weight > 1 ? 's' : ''} / pessoa
              </span>
              <input
                id={`sentinel-${s.key}`}
                type="number"
                min={0}
                step={1}
                max={evaluation.members ?? undefined}
                disabled={evaluation.members === null || evaluation.members < 1}
                placeholder="Não informado"
                value={evaluation.counts[s.key] ?? ''}
                onChange={(e) =>
                  setEvaluation({
                    ...evaluation,
                    counts: { ...evaluation.counts, [s.key]: numberValue(e.target.value) },
                  })
                }
              />
              <small>
                {evaluation.members === null
                  ? 'Informe os integrantes'
                  : evaluation.counts[s.key] === null
                    ? 'Não informado'
                    : `${evaluation.counts[s.key]! * s.weight} ponto(s)`}
              </small>
            </div>
          </div>
        ))}
        <h3 className="form-section">
          <Home size={19} />
          Saneamento do domicílio
        </h3>
        <p>
          <strong>Há baixas condições de saneamento no domicílio?</strong>
        </p>
        <p className="muted small">
          Confirme as três condições. Uma ou mais respostas “Sim” somam 3 pontos, uma única vez por
          domicílio.
        </p>
        {SANITATION.map((s) => (
          <Field key={s.key} label={s.label}>
            <select
              value={
                evaluation.sanitation[s.key] === null ? '' : String(evaluation.sanitation[s.key])
              }
              onChange={(e) =>
                setEvaluation({
                  ...evaluation,
                  sanitation: {
                    ...evaluation.sanitation,
                    [s.key]: e.target.value === '' ? null : e.target.value === 'true',
                  },
                })
              }
            >
              <option value="">Não informado</option>
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </select>
          </Field>
        ))}
        <div className="provisional" aria-live="polite">
          <ClipboardList size={22} />
          <div>
            <strong>Subtotal provisório: {result.subtotal} pontos</strong>
            <p>
              {result.complete
                ? 'Todas as informações foram preenchidas. Revise para concluir.'
                : `${result.pending.length} pendência(s). A avaliação pode ser salva incompleta, sem classificação definitiva.`}
            </p>
            {!result.complete && (
              <details>
                <summary>Ver pendências</summary>
                <ul>
                  {result.pending.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>
      </div>
      <FormActions onClose={onClose} label="Revisar resultado" />
    </form>
  );
}
