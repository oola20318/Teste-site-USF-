import { useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  SlidersHorizontal,
  Users,
  ArrowUpRight,
  Clock3,
  Eye,
  CalendarClock,
  CircleHelp,
  AlertTriangle,
  ArrowDownWideNarrow,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  History,
  BookOpen,
  Info,
  FileText,
} from 'lucide-react';
import {
  type Database,
  type Appointment,
  type Risk,
  RISK,
  calculate,
  appointmentEvaluation,
  latestEvaluation,
  sortedActive,
  today,
  shiftDay,
  formatDate,
  fullDate,
  patientCode,
} from './domain';
import { Empty, Guidance, RiskBadge } from './ui';

export type Dialog =
  | {
      type:
        | 'patient'
        | 'patientDetail'
        | 'family'
        | 'familyDetail'
        | 'evaluation'
        | 'evaluationDetail'
        | 'appointment'
        | 'appointmentDetail';
      id?: string;
      patientId?: string;
    }
  | { type: 'data' };
export type OpenDialog = (dialog: Dialog) => void;
const matches = (name: string, term: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .includes(
      term
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim(),
    );
export function Avatar({ name, index = 0 }: { name: string; index?: number }) {
  return (
    <span className={`avatar avatar-${index % 4}`} aria-hidden="true">
      {name
        .split(' ')
        .filter(Boolean)
        .filter((_, i, arr) => i === 0 || i === arr.length - 1)
        .map((n) => n[0])
        .join('')}
    </span>
  );
}

function AppointmentTable({
  db,
  appointments,
  activeOrder,
  open,
  pending = false,
}: {
  db: Database;
  appointments: Appointment[];
  activeOrder: Appointment[];
  open: OpenDialog;
  pending?: boolean;
}) {
  return (
    <>
      <div className="table-scroll agenda-desktop">
        <table className="agenda-table">
          <thead>
            <tr>
              <th className="position-col" title="Posição por vulnerabilidade">
                Pos.
              </th>
              <th>Paciente</th>
              <th>Família</th>
              <th>Horário</th>
              <th>Escore</th>
              <th>Classificação</th>
              <th>Avaliação</th>
              <th>Status</th>
              <th className="actions-col">Ações</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((a, i) => {
              const p = db.patients.find((p) => p.id === a.patientId)!;
              const evaluation = appointmentEvaluation(db, a);
              const family = db.families.find(
                (f) => f.id === (evaluation?.familyId ?? p.familyId),
              )!;
              const result = calculate(evaluation);
              return (
                <tr key={a.id} data-testid="appointment-row">
                  <td className="position-col">
                    <span className={`position ${result.risk || 'pending'}`}>
                      {a.status === 'scheduled' && result.complete
                        ? String(activeOrder.findIndex((x) => x.id === a.id) + 1).padStart(2, '0')
                        : '—'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="patient-link"
                      onClick={() => open({ type: 'patientDetail', id: p.id })}
                    >
                      <Avatar name={p.name} index={i} />
                      <span>
                        <strong>{p.name}</strong>
                        <small>{patientCode(p.id)}</small>
                      </span>
                    </button>
                  </td>
                  <td>
                    <button
                      className="text-button family-link"
                      onClick={() => open({ type: 'familyDetail', id: family.id })}
                    >
                      {family.name}
                    </button>
                    <small className="cell-sub">
                      Microárea {p.microarea || family.microarea || 'não informada'}
                    </small>
                  </td>
                  <td>
                    <span className="time">
                      <Clock3 size={13} />
                      {a.time || 'Não definido'}
                    </span>
                  </td>
                  <td>
                    <span className={`score ${result.risk || 'pending'}`}>
                      {result.score ?? '—'}
                    </span>
                    <small className="cell-sub">{result.complete ? 'pontos' : 'pendente'}</small>
                  </td>
                  <td>
                    <RiskBadge risk={result.risk} compact />
                  </td>
                  <td>
                    <span className="date-cell">
                      {evaluation ? formatDate(evaluation.date) : 'Não realizada'}
                    </span>
                    {evaluation && (
                      <small className="cell-sub">{evaluation.operator || 'Sem operador'}</small>
                    )}
                  </td>
                  <td>
                    <span className={`status ${a.status}`}>
                      <span />
                      {a.status === 'scheduled'
                        ? 'Agendada'
                        : a.status === 'completed'
                          ? 'Concluída'
                          : 'Cancelada'}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-button"
                        title={`Ver consulta de ${p.name}`}
                        aria-label={`Ver consulta de ${p.name}`}
                        onClick={() => open({ type: 'appointmentDetail', id: a.id })}
                      >
                        <Eye size={17} />
                      </button>
                      {a.status === 'scheduled' && (
                        <button
                          className="icon-button"
                          title={`Editar ou reagendar ${p.name}`}
                          aria-label={`Editar ou reagendar ${p.name}`}
                          onClick={() => open({ type: 'appointment', id: a.id })}
                        >
                          <CalendarClock size={17} />
                        </button>
                      )}
                      {pending && a.status === 'scheduled' && (
                        <button
                          className="text-button"
                          onClick={() => open({ type: 'evaluation', id: family.id })}
                        >
                          Avaliar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="appointment-cards">
        {appointments.map((a, i) => {
          const p = db.patients.find((p) => p.id === a.patientId)!;
          const evaluation = appointmentEvaluation(db, a);
          const family = db.families.find((f) => f.id === (evaluation?.familyId ?? p.familyId))!;
          const result = calculate(evaluation);
          return (
            <li key={a.id}>
              <header>
                <span
                  className={`position ${result.risk || 'pending'}`}
                  aria-label="Posição por vulnerabilidade"
                >
                  {a.status === 'scheduled' && result.complete
                    ? `${activeOrder.findIndex((x) => x.id === a.id) + 1}º`
                    : '—'}
                </span>
                <button
                  className="patient-link"
                  onClick={() => open({ type: 'patientDetail', id: p.id })}
                >
                  <Avatar name={p.name} index={i} />
                  <span>
                    <strong>{p.name}</strong>
                    <small>{patientCode(p.id)}</small>
                  </span>
                </button>
              </header>
              <RiskBadge risk={result.risk} />
              <dl>
                <div>
                  <dt>Família</dt>
                  <dd>
                    <button
                      className="text-button"
                      onClick={() => open({ type: 'familyDetail', id: family.id })}
                    >
                      {family.name}
                    </button>
                  </dd>
                </div>
                <div>
                  <dt>Horário agendado</dt>
                  <dd>
                    <Clock3 size={12} /> {a.time || 'Não definido'}
                  </dd>
                </div>
                <div>
                  <dt>Escore familiar</dt>
                  <dd>
                    {result.score === null ? 'Sem escore definitivo' : `${result.score} pontos`}
                  </dd>
                </div>
                <div>
                  <dt>Data da avaliação</dt>
                  <dd>{evaluation ? formatDate(evaluation.date) : 'Não realizada'}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    {a.status === 'scheduled'
                      ? 'Agendada'
                      : a.status === 'completed'
                        ? 'Concluída'
                        : 'Cancelada'}
                  </dd>
                </div>
                <div>
                  <dt>Microárea</dt>
                  <dd>{p.microarea || family.microarea || 'Não informada'}</dd>
                </div>
              </dl>
              <footer>
                <button
                  className="button secondary small-button"
                  onClick={() => open({ type: 'appointmentDetail', id: a.id })}
                >
                  <Eye size={14} />
                  Detalhes
                </button>
                {a.status === 'scheduled' && (
                  <button
                    className="button secondary small-button"
                    onClick={() => open({ type: 'appointment', id: a.id })}
                  >
                    Reagendar
                  </button>
                )}
                {pending && a.status === 'scheduled' && (
                  <button
                    className="button primary small-button"
                    onClick={() => open({ type: 'evaluation', id: family.id })}
                  >
                    Avaliar família
                  </button>
                )}
              </footer>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function Agenda({
  db,
  date,
  setDate,
  open,
}: {
  db: Database;
  date: string;
  setDate: (date: string) => void;
  open: OpenDialog;
}) {
  const [term, setTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [tab, setTab] = useState<'scheduled' | 'completed' | 'cancelled'>('scheduled');
  const active = sortedActive(db, date);
  const evaluated = active.filter((a) => calculate(appointmentEvaluation(db, a)).complete);
  const pending = active.filter((a) => !calculate(appointmentEvaluation(db, a)).complete);
  const dayAppointments = db.appointments.filter((a) => a.date === date);
  const visible = (a: Appointment) => {
    const p = db.patients.find((p) => p.id === a.patientId)!;
    const result = calculate(appointmentEvaluation(db, a));
    return (
      matches(p.name, term) &&
      (filter === 'all' || (filter === 'pending' ? !result.complete : result.risk === filter))
    );
  };
  const stats: { key: string; label: string; value: number; note: string; icon: typeof Users }[] = [
    {
      key: 'all',
      label: 'Agendados',
      value: active.length,
      note: 'consultas ativas',
      icon: CalendarDays,
    },
    ...(['r3', 'r2', 'r1', 'below'] as Risk[]).map((key) => ({
      key,
      label: RISK[key].short,
      value: active.filter((a) => calculate(appointmentEvaluation(db, a)).risk === key).length,
      note: RISK[key].range,
      icon: key === 'r3' ? AlertTriangle : ShieldCheck,
    })),
    {
      key: 'pending',
      label: 'Pendentes',
      value: pending.length,
      note: 'sem classificação',
      icon: CircleHelp,
    },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">PLANEJAMENTO DO CUIDADO</div>
          <h1>Agenda do dia</h1>
          <p>Organize o cuidado a partir das necessidades de cada família.</p>
        </div>
        <button className="button primary" onClick={() => open({ type: 'appointment' })}>
          <Plus size={19} />
          Agendar consulta
        </button>
      </div>
      <Guidance />
      <div className="stats">
        {stats.map((stat) => (
          <button
            key={stat.key}
            className={`stat-card ${stat.key} ${filter === stat.key ? 'selected' : ''}`}
            onClick={() => {
              setFilter(stat.key);
              setTab('scheduled');
            }}
            aria-pressed={filter === stat.key}
          >
            <div className="stat-label">
              <span>{stat.label}</span>
              <stat.icon size={16} />
            </div>
            <strong>{stat.value}</strong>
            <small>{stat.note}</small>
          </button>
        ))}
      </div>
      <section className="agenda-controls">
        <div className="date-controls">
          <button
            className="icon-button bordered"
            aria-label="Dia anterior"
            onClick={() => setDate(shiftDay(date, -1))}
          >
            <ChevronLeft size={18} />
          </button>
          <label className="date-picker">
            <CalendarDays size={18} />
            <span className="sr-only">Data da agenda</span>
            <input
              aria-label="Data da agenda"
              type="date"
              value={date}
              required
              onChange={(e) => {
                if (e.target.value) setDate(e.target.value);
              }}
            />
          </label>
          <button
            className="icon-button bordered"
            aria-label="Próximo dia"
            onClick={() => setDate(shiftDay(date, 1))}
          >
            <ChevronRight size={18} />
          </button>
          <button className="button secondary small-button" onClick={() => setDate(today())}>
            Hoje
          </button>
        </div>
        <div className="agenda-search">
          <label className="search">
            <Search size={17} />
            <input
              aria-label="Buscar paciente na agenda"
              placeholder="Buscar paciente pelo nome"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </label>
          <label className="filter">
            <SlidersHorizontal size={16} />
            <span className="sr-only">Filtrar classificação</span>
            <select
              aria-label="Filtrar classificação"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">Todas as classificações</option>
              {(['r3', 'r2', 'r1', 'below'] as Risk[]).map((r) => (
                <option key={r} value={r}>
                  {RISK[r].label}
                </option>
              ))}
              <option value="pending">Pendentes de avaliação</option>
            </select>
          </label>
        </div>
      </section>
      <div className="day-heading">
        <h2>{fullDate(date)}</h2>
        <span>
          {dayAppointments.length} consulta{dayAppointments.length !== 1 ? 's' : ''} no dia
        </span>
      </div>
      <div className="tabs" role="tablist" aria-label="Status da consulta">
        {(
          [
            { key: 'scheduled', text: 'Ativas', icon: CalendarDays },
            { key: 'completed', text: 'Concluídas', icon: CheckCircle2 },
            { key: 'cancelled', text: 'Canceladas', icon: XCircle },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={tab === t.key ? 'active' : ''}
            onClick={() => setTab(t.key)}
          >
            <t.icon size={16} />
            {t.text}
            <span>{dayAppointments.filter((a) => a.status === t.key).length}</span>
          </button>
        ))}
      </div>
      {tab === 'scheduled' ? (
        <>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h3>
                  <ArrowDownWideNarrow size={18} />
                  Prioridade sugerida por vulnerabilidade
                </h3>
                <p>Escores familiares em ordem decrescente. Os horários marcados são mantidos.</p>
              </div>
              <span className="count-tag">{evaluated.filter(visible).length} avaliados</span>
            </div>
            {evaluated.filter(visible).length ? (
              <AppointmentTable
                db={db}
                appointments={evaluated.filter(visible)}
                activeOrder={evaluated}
                open={open}
              />
            ) : (
              <Empty
                title={
                  filter === 'pending'
                    ? 'Filtro de avaliações pendentes'
                    : 'Nenhuma consulta avaliada nesta seleção'
                }
              >
                {filter === 'pending'
                  ? 'Consulte a seção de pendências logo abaixo.'
                  : 'Escolha outra data, ajuste os filtros ou agende uma consulta.'}
              </Empty>
            )}
            <div className="table-note">
              <Info size={14} />
              <span>
                Em empate: horário agendado e, depois, ordem de inclusão. Regras operacionais desta
                aplicação. A lista apoia o planejamento e não nega atendimento.
              </span>
            </div>
          </section>
          {(pending.filter(visible).length > 0 || filter === 'pending') && (
            <section className="panel pending-panel">
              <div className="panel-heading">
                <div>
                  <h3>
                    <CircleHelp size={19} />
                    Pendentes de avaliação
                  </h3>
                  <p>
                    Informação ausente ou incompleta. Estes pacientes não são considerados de menor
                    prioridade.
                  </p>
                </div>
                <span className="count-tag">{pending.filter(visible).length} pendentes</span>
              </div>
              {pending.filter(visible).length ? (
                <AppointmentTable
                  db={db}
                  appointments={pending.filter(visible)}
                  activeOrder={evaluated}
                  open={open}
                  pending
                />
              ) : (
                <Empty title="Nenhuma pendência nesta seleção">
                  Ajuste o nome buscado ou a data.
                </Empty>
              )}
            </section>
          )}
        </>
      ) : (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>
                <History size={18} />
                Consultas {tab === 'completed' ? 'concluídas' : 'canceladas'}
              </h3>
              <p>
                Histórico preservado, separado da lista ativa. Consultas concluídas mantêm a
                avaliação utilizada.
              </p>
            </div>
          </div>
          {dayAppointments.filter((a) => a.status === tab && visible(a)).length ? (
            <AppointmentTable
              db={db}
              appointments={dayAppointments.filter((a) => a.status === tab && visible(a))}
              activeOrder={[]}
              open={open}
            />
          ) : (
            <Empty title="Nenhuma consulta nesta seleção">
              As consultas aparecerão aqui quando forem{' '}
              {tab === 'completed' ? 'concluídas' : 'canceladas'}.
            </Empty>
          )}
        </section>
      )}
    </>
  );
}

export function Patients({ db, open }: { db: Database; open: OpenDialog }) {
  const [term, setTerm] = useState('');
  const [family, setFamily] = useState('');
  const patients = db.patients.filter(
    (p) => matches(p.name, term) && (!family || p.familyId === family),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">CADASTRO INDIVIDUAL</div>
          <h1>Pacientes</h1>
          <p>Um cadastro por pessoa. Quantas consultas forem necessárias.</p>
        </div>
        <button className="button primary" onClick={() => open({ type: 'patient' })}>
          <Plus size={18} />
          Cadastrar paciente
        </button>
      </div>
      <Guidance />
      <div className="panel">
        <div className="list-toolbar">
          <label className="search">
            <Search size={18} />
            <input
              aria-label="Buscar paciente"
              placeholder="Buscar paciente pelo nome"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </label>
          <label className="filter">
            <Users size={17} />
            <select
              aria-label="Filtrar por família"
              value={family}
              onChange={(e) => setFamily(e.target.value)}
            >
              <option value="">Todas as famílias</option>
              {db.families.map((f) => (
                <option value={f.id} key={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <span className="muted small">{patients.length} pacientes</span>
        </div>
        {patients.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Paciente / identificador</th>
                  <th>Família</th>
                  <th>Nascimento</th>
                  <th>Equipe / UBS</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p, i) => (
                  <tr key={p.id}>
                    <td>
                      <button
                        className="patient-link"
                        onClick={() => open({ type: 'patientDetail', id: p.id })}
                      >
                        <Avatar name={p.name} index={i} />
                        <span>
                          <strong>{p.name}</strong>
                          <small>{patientCode(p.id)}</small>
                        </span>
                      </button>
                    </td>
                    <td>
                      <button
                        className="text-button"
                        onClick={() => open({ type: 'familyDetail', id: p.familyId })}
                      >
                        {db.families.find((f) => f.id === p.familyId)?.name}
                      </button>
                    </td>
                    <td>{p.birthDate ? formatDate(p.birthDate) : 'Não informada'}</td>
                    <td>{p.team || 'Não informada'}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="text-button"
                          onClick={() => open({ type: 'patient', id: p.id })}
                        >
                          Editar
                        </button>
                        <button
                          className="button secondary small-button"
                          onClick={() => open({ type: 'appointment', patientId: p.id })}
                        >
                          <CalendarDays size={14} />
                          Agendar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Nenhum paciente encontrado"
            action={
              <button className="button primary" onClick={() => open({ type: 'patient' })}>
                Cadastrar paciente
              </button>
            }
          >
            Ajuste os filtros ou cadastre uma pessoa fictícia para começar.
          </Empty>
        )}
      </div>
    </>
  );
}

export function Families({ db, open }: { db: Database; open: OpenDialog }) {
  const [term, setTerm] = useState('');
  const families = db.families.filter((f) => matches(f.name, term));
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">AVALIAÇÃO COMPARTILHADA</div>
          <h1>Famílias e avaliações</h1>
          <p>A vulnerabilidade é da família. O histórico acompanha cada reavaliação.</p>
        </div>
        <button className="button primary" onClick={() => open({ type: 'family' })}>
          <Plus size={18} />
          Cadastrar família
        </button>
      </div>
      <Guidance />
      <div className="families-toolbar">
        <label className="search">
          <Search size={18} />
          <input
            aria-label="Buscar família"
            placeholder="Buscar família pelo nome"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </label>
        <span className="muted small">{families.length} famílias cadastradas</span>
      </div>
      <div className="family-grid">
        {families.map((f) => {
          const ev = latestEvaluation(db, f.id);
          const result = calculate(ev);
          const patients = db.patients.filter((p) => p.familyId === f.id);
          return (
            <article className="family-card" key={f.id}>
              <header>
                <span className="family-icon">
                  <Users size={22} />
                </span>
                <button
                  className="icon-button"
                  aria-label={`Ver histórico da ${f.name}`}
                  onClick={() => open({ type: 'familyDetail', id: f.id })}
                >
                  <ArrowUpRight size={19} />
                </button>
              </header>
              <h2>{f.name}</h2>
              <p className="muted small">
                {patients.length} paciente(s) cadastrado(s)
                {ev?.members ? ` · ${ev.members} moradores avaliados` : ''}
              </p>
              <RiskBadge risk={result.risk} />
              <div className="family-score">
                <strong>{result.score ?? '—'}</strong>
                <span>
                  {result.complete ? 'pontos no escore familiar' : 'sem classificação definitiva'}
                </span>
              </div>
              <div className="family-meta">
                <span>
                  <Clock3 size={14} />
                  {ev ? `Avaliada em ${formatDate(ev.date)}` : 'Ainda sem avaliação'}
                </span>
                <span>
                  <Users size={14} />
                  Microárea {f.microarea || 'não informada'}
                </span>
              </div>
              <footer>
                <button
                  className="button secondary small-button"
                  onClick={() => open({ type: 'familyDetail', id: f.id })}
                >
                  <History size={15} />
                  Histórico
                </button>
                <button
                  className="button primary small-button"
                  onClick={() => open({ type: 'evaluation', id: f.id })}
                >
                  {ev ? 'Reavaliar família' : 'Avaliar família'}
                </button>
              </footer>
            </article>
          );
        })}
      </div>
      {!families.length && (
        <div className="panel">
          <Empty title="Nenhuma família encontrada">
            Ajuste a busca ou cadastre uma nova família.
          </Empty>
        </div>
      )}
    </>
  );
}

export function About() {
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">REFERÊNCIAS E TRANSPARÊNCIA</div>
          <h1>Sobre a escala</h1>
          <p>Escala de Risco Familiar de Coelho-Savassi · critérios desta aplicação.</p>
        </div>
        <span className="about-icon">
          <BookOpen size={28} />
        </span>
      </div>
      <Guidance />
      <div className="about-grid">
        <section className="panel prose">
          <h2>O cuidado começa pela família</h2>
          <p>
            A escala apoia o reconhecimento de necessidades das famílias na Atenção Primária à
            Saúde. Ela reúne sentinelas individuais e características do domicílio para orientar o
            planejamento da equipe e a equidade.
          </p>
          <p>
            Não é instrumento de diagnóstico nem de classificação de urgência. A ordem sugerida não
            altera automaticamente horários marcados, não autoriza negar atendimento e não substitui
            a avaliação clínica.
          </p>
          <div className="formula">
            Escore familiar = Σ (pessoas × peso da sentinela)
            <br />+ saneamento + adensamento
          </div>
          <p>
            Cada pessoa pode contribuir para várias sentinelas. Saneamento e adensamento entram
            apenas uma vez por domicílio. Vários pacientes vinculados à família compartilham a
            avaliação, sem multiplicar o escore familiar.
          </p>
          <h3>Classificação aplicada</h3>
          <div className="risk-guide">
            {(['below', 'r1', 'r2', 'r3'] as Risk[]).map((r) => (
              <div key={r}>
                <RiskBadge risk={r} />
                <strong>{RISK[r].range}</strong>
              </div>
            ))}
          </div>
          <p>
            Uma informação essencial desconhecida resulta em <strong>“Avaliação incompleta”</strong>
            , sem classificação definitiva. O subtotal conhecido não indica baixa prioridade.
          </p>
        </section>
        <aside className="panel prose">
          <h2>Uma ferramenta independente</h2>
          <p>
            A identidade visual se inspira na linguagem de interfaces do e-SUS APS PEC. Esta
            aplicação não tem vínculo, chancela nem integração oficial com o Ministério da Saúde ou
            com o e-SUS.
          </p>
          <div className="callout warning">
            <Info size={20} />
            <div>
              <strong>Demonstração com dados fictícios</strong>
              <p>
                Esta versão armazena dados apenas neste navegador. Não há autenticação, autorização
                no servidor, sincronização entre equipes ou banco de dados remoto. Não insira dados
                reais de pacientes.
              </p>
            </div>
          </div>
          <h3>Antes de usar em um serviço real</h3>
          <p>
            É necessária uma implantação própria com autenticação, autorização de cada operação no
            servidor, banco de dados protegido, HTTPS, registro de alterações protegido contra
            adulteração, política de acesso da equipe, backups e governança conforme a LGPD.
          </p>
          <p>
            O histórico local desta demonstração serve para experimentar o fluxo e não constitui
            trilha de auditoria de produção.
          </p>
        </aside>
      </div>
      <section className="panel prose">
        <h2>Correções metodológicas em relação ao anexo</h2>
        <p>
          O PDF fornecido é a referência principal para as sentinelas e suas definições. As
          correções abaixo seguem os critérios explicitamente solicitados para esta aplicação e as
          referências dos autores indicadas no projeto.
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Critério</th>
                <th>Redação do anexo</th>
                <th>Regra implementada</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Adensamento</td>
                <td>A definição inverte a relação para cômodos ÷ moradores.</td>
                <td>
                  <strong>Moradores ÷ cômodos.</strong> Inteiros positivos; sem arredondar para
                  decidir pontos.
                </td>
              </tr>
              <tr>
                <td>Relação menor que 1</td>
                <td>1 ponto.</td>
                <td>
                  <strong>0 ponto.</strong> Igual a 1: 2 pontos. Maior que 1: 3 pontos.
                </td>
              </tr>
              <tr>
                <td>Limite de R3</td>
                <td>“Acima de 9”.</td>
                <td>
                  <strong>9 ou mais pontos.</strong> Escores 0 a 4: abaixo do ponto de corte para
                  R1.
                </td>
              </tr>
              <tr>
                <td>Sentinela etária</td>
                <td>“Maior 70 anos” e “mais de 70 anos completos”.</td>
                <td>
                  <strong>70 anos completos ou mais</strong>, conforme a definição operacional da
                  sistematização dos autores.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <h3>Definições e cuidados de preenchimento</h3>
        <p>
          Banheiro e cozinha contam como cômodos; corredores, alpendres, varandas abertas, garagens
          e depósitos não contam. Trabalho doméstico é ocupação, mesmo sem remuneração; férias,
          licenças e afastamentos temporários não são desemprego. Idade e renda não marcam
          desemprego automaticamente.
        </p>
        <p>
          A expressão histórica “deficiência mental” é contextualizada no formulário. Não se deve
          equiparar automaticamente transtorno mental a essa sentinela. Hipertensão, diabetes e
          desnutrição exigem identificação profissional: o formulário não diagnostica essas
          condições.
        </p>
        <h3>Regras operacionais da agenda</h3>
        <p>
          Entre avaliações completas, ordenar por escore decrescente; em empate, pelo horário
          marcado (sem horário aparece depois) e depois pela ordem de inclusão. Essas regras de
          desempate são da aplicação. Avaliações incompletas ficam em seção própria. A data filtrada
          é a da consulta, não a do cadastro.
        </p>
        <p>
          Uma reavaliação é adicionada ao histórico e atualiza todas as consultas pendentes da
          família. Consultas concluídas mantêm a referência de avaliação usada. Reagendamentos e
          cancelamentos preservam o registro e seu histórico.
        </p>
        <h3>Fontes</h3>
        <ul className="reference-list">
          <li>
            <a href="/referencias/anexo-coelho-savassi.pdf" target="_blank" rel="noreferrer">
              <FileText size={17} />
              Anexo — Escala de Coelho-Savassi (PDF fornecido)
            </a>
          </li>
          <li>
            <a
              href="https://www.jmphc.com.br/jmphc/article/view/155"
              target="_blank"
              rel="noreferrer"
            >
              Savassi, Lage e Coelho. Sistematização do instrumento. JMPHC, 2012; 3(2):179–185.
            </a>
          </li>
          <li>
            <a href="https://rbmfc.org.br/rbmfc/article/view/104" target="_blank" rel="noreferrer">
              Coelho e Savassi. Aplicação de escala de risco familiar. RBMFC.
            </a>
          </li>
          <li>
            <a
              href="https://sisaps.saude.gov.br/sistemas/esusaps/docs/manual/PEC/"
              target="_blank"
              rel="noreferrer"
            >
              Manual oficial do e-SUS APS PEC — referência visual.
            </a>
          </li>
        </ul>
        <p className="small muted">
          O PDF foi consultado na implementação. A consulta online aos três sites foi bloqueada pela
          rede do ambiente; os links são apresentados para conferência, sem alegar validação do
          conteúdo online nesta entrega.
        </p>
      </section>
    </>
  );
}
