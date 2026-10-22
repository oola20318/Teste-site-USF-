import { useEffect, useState } from 'react';
import {
  Activity,
  CalendarDays,
  Users,
  House,
  BookOpen,
  Menu,
  ChevronRight,
  ShieldCheck,
  Database as DatabaseIcon,
  FlaskConical,
  X,
  Plus,
  CheckCircle2,
  AlertTriangle,
  History,
  Download,
  RotateCcw,
  Pencil,
  CalendarClock,
  Info,
} from 'lucide-react';
import {
  type Database,
  type Patient,
  type Family,
  type Appointment,
  type Evaluation,
  type AppointmentStatus,
  calculate,
  saveEvaluation,
  withAudit,
  latestEvaluation,
  appointmentEvaluation,
  patientCode,
  today,
  formatDate,
} from './domain';
import { readDatabase, writeDatabase, STORAGE_KEY } from './storage';
import { makeDemo } from './seed';
import { Agenda, Patients, Families, About, type Dialog, Avatar } from './pages';
import { AppointmentForm, PatientForm, FamilyForm, EvaluationForm } from './forms';
import { Modal, RiskBadge, Calculation } from './ui';

const NAV = [
  { key: 'agenda', label: 'Agenda do dia', icon: CalendarDays },
  { key: 'patients', label: 'Pacientes', icon: Users },
  { key: 'families', label: 'Famílias e avaliações', icon: House },
  { key: 'about', label: 'Sobre a escala', icon: BookOpen },
] as const;
type Page = (typeof NAV)[number]['key'];
function download(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function App() {
  const [initial] = useState(() => {
    try {
      return { db: readDatabase(localStorage) ?? makeDemo(), error: '' };
    } catch {
      return {
        db: makeDemo(),
        error:
          'Não foi possível ler os registros locais. Os dados anteriores não foram sobrescritos. Use “Dados da demonstração” para exportar o arquivo original e reiniciar.',
      };
    }
  });
  const [db, setDb] = useState<Database>(initial.db);
  const [storageIssue, setStorageIssue] = useState(initial.error);
  const [page, setPage] = useState<Page>('agenda');
  const [date, setDate] = useState(today);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 760px)');
    const update = () => setIsMobile(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!mobileMenu) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenu(false);
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [mobileMenu]);
  const [toast, setToast] = useState('');
  const [pendingStatus, setPendingStatus] = useState<{
    appointment: Appointment;
    status: AppointmentStatus;
  } | null>(null);
  useEffect(() => {
    if (!initial.error) {
      try {
        writeDatabase(localStorage, initial.db);
      } catch {
        setStorageIssue(
          'O navegador bloqueou o armazenamento local ou o espaço está esgotado. As alterações não podem ser salvas.',
        );
      }
    }
  }, [initial]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 6000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  function commit(next: Database, message: string) {
    if (storageIssue) {
      setToast('Não foi possível salvar. Resolva o aviso de armazenamento para continuar.');
      return false;
    }
    try {
      writeDatabase(localStorage, next);
      setDb(next);
      setToast(message);
      return true;
    } catch {
      setToast(
        'Falha ao salvar: armazenamento indisponível ou cheio. Os dados anteriores foram preservados. Exporte os dados na área de demonstração.',
      );
      return false;
    }
  }
  function open(d: Dialog) {
    setDialog(d);
    setMobileMenu(false);
  }
  const close = () => setDialog(null);
  function savePatient(p: Patient, family?: Family) {
    const old = db.patients.find((x) => x.id === p.id);
    const families = family ? [...db.families, family] : db.families;
    const evaluationId = latestEvaluation(db, p.familyId)?.id ?? null;
    const changedFamily = old && old.familyId !== p.familyId;
    const next = {
      ...db,
      families,
      patients: old ? db.patients.map((x) => (x.id === p.id ? p : x)) : [...db.patients, p],
      appointments: changedFamily
        ? db.appointments.map((a) =>
            a.patientId === p.id && a.status === 'scheduled'
              ? {
                  ...a,
                  evaluationId,
                  history: [
                    ...a.history,
                    {
                      at: new Date().toISOString(),
                      action: 'Vínculo familiar atualizado',
                      detail: `Nova família: ${p.familyId}`,
                    },
                  ],
                }
              : a,
          )
        : db.appointments,
    };
    if (
      commit(
        withAudit(
          next,
          p.id,
          old ? 'Paciente editado' : 'Paciente cadastrado',
          `${p.name} · família ${p.familyId}`,
        ),
        'Paciente salvo. O agendamento pode ser feito separadamente.',
      )
    )
      close();
  }
  function saveFamily(f: Family) {
    const exists = db.families.some((x) => x.id === f.id);
    const next = {
      ...db,
      families: exists ? db.families.map((x) => (x.id === f.id ? f : x)) : [...db.families, f],
    };
    if (
      commit(
        withAudit(next, f.id, exists ? 'Família editada' : 'Família cadastrada', f.name),
        'Família salva.',
      )
    )
      close();
  }
  function saveAppointment(a: Appointment) {
    const exists = db.appointments.some((x) => x.id === a.id);
    const next = {
      ...db,
      appointments: exists
        ? db.appointments.map((x) => (x.id === a.id ? a : x))
        : [...db.appointments, a],
    };
    if (
      commit(
        withAudit(
          next,
          a.id,
          exists ? 'Consulta editada / reagendada' : 'Consulta agendada',
          `${a.patientId} · ${a.date} ${a.time}`,
        ),
        exists ? 'Consulta atualizada. O histórico foi preservado.' : 'Consulta agendada.',
      )
    ) {
      setDate(a.date);
      setPage('agenda');
      close();
    }
  }
  function saveFamilyEvaluation(e: Evaluation) {
    if (
      commit(
        saveEvaluation(db, e),
        'Avaliação salva e vinculada às consultas pendentes da família.',
      )
    )
      setDialog({ type: 'evaluationDetail', id: e.id });
  }
  function changeStatus() {
    if (!pendingStatus) return;
    const { appointment, status } = pendingStatus;
    const action = status === 'completed' ? 'Consulta concluída' : 'Consulta cancelada';
    const next = {
      ...db,
      appointments: db.appointments.map((a) =>
        a.id === appointment.id
          ? {
              ...a,
              status,
              history: [
                ...a.history,
                { at: new Date().toISOString(), action, detail: 'Registro mantido no histórico.' },
              ],
            }
          : a,
      ),
    };
    if (
      commit(
        withAudit(next, appointment.id, action, `${appointment.patientId} · ${appointment.date}`),
        `${action}. Histórico preservado.`,
      )
    ) {
      setPendingStatus(null);
      close();
    }
  }
  function resetDemo() {
    const next = makeDemo();
    try {
      writeDatabase(localStorage, next);
      setDb(next);
      setStorageIssue('');
      close();
      setToast('Demonstração reiniciada com novos exemplos fictícios.');
    } catch {
      setToast('O navegador não permite salvar os dados. Habilite o armazenamento local.');
    }
  }
  const currentNav = NAV.find((n) => n.key === page)!;
  const selectedPatient =
    dialog && 'id' in dialog ? db.patients.find((p) => p.id === dialog.id) : undefined;
  const selectedFamily =
    dialog && 'id' in dialog ? db.families.find((f) => f.id === dialog.id) : undefined;
  const selectedAppointment =
    dialog && 'id' in dialog ? db.appointments.find((a) => a.id === dialog.id) : undefined;
  const selectedEvaluation =
    dialog && 'id' in dialog ? db.evaluations.find((e) => e.id === dialog.id) : undefined;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Pular para o conteúdo
      </a>
      {mobileMenu && <div className="sidebar-scrim" onClick={() => setMobileMenu(false)} />}
      <aside
        className={`sidebar ${mobileMenu ? 'is-open' : ''}`}
        aria-label="Navegação principal"
        inert={isMobile && !mobileMenu}
      >
        <div className="brand">
          <div className="brand-symbol">
            <Activity size={27} strokeWidth={2.1} />
          </div>
          <div>
            <strong>
              Vulnerabilidade
              <br />
              Familiar
            </strong>
            <span>Coelho-Savassi</span>
          </div>
          <button
            className="icon-button mobile-close"
            aria-label="Fechar menu"
            onClick={() => setMobileMenu(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="sidebar-label">ESPAÇO DE TRABALHO</div>
        <nav>
          {NAV.map((n) => (
            <button
              key={n.key}
              onClick={() => {
                setPage(n.key);
                setMobileMenu(false);
                window.scrollTo(0, 0);
              }}
              className={`nav-link ${page === n.key ? 'active' : ''}`}
              aria-current={page === n.key ? 'page' : undefined}
            >
              <n.icon size={20} />
              <span>{n.label}</span>
              {page === n.key && <ChevronRight size={15} />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <div className="help-icon">
              <ShieldCheck size={23} />
            </div>
            <strong>Cuidado com equidade</strong>
            <p>
              Um olhar para a família.
              <br />
              Um cuidado para cada pessoa.
            </p>
            <button
              onClick={() => {
                setPage('about');
                setMobileMenu(false);
              }}
            >
              Conheça a escala <ArrowIcon />
            </button>
          </div>
          <button className="demo-settings" onClick={() => open({ type: 'data' })}>
            <DatabaseIcon size={17} />
            <span>Dados da demonstração</span>
            <ChevronRight size={14} />
          </button>
          <p className="independent">
            Ferramenta independente
            <br />
            Sem vínculo oficial com o e-SUS APS
          </p>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-toggle"
              aria-label="Abrir menu"
              onClick={() => setMobileMenu(true)}
            >
              <Menu size={22} />
            </button>
            <span className="breadcrumb-root">Atenção Primária à Saúde</span>
            <ChevronRight size={14} />
            <strong>{currentNav.label}</strong>
          </div>
          <div className="topbar-right">
            <span className="local-status">
              <span />
              Dados neste navegador
            </span>
            <button className="demo-pill" onClick={() => open({ type: 'data' })}>
              <FlaskConical size={14} />
              Demonstração
            </button>
            <span className="operator-avatar" title="Ambiente de demonstração">
              DE
            </span>
          </div>
        </header>
        <div className="demo-banner">
          <FlaskConical size={15} />
          <span>
            <strong>Modo de demonstração</strong> · Exemplos fictícios. Não insira dados reais de
            pacientes. Armazenamento local, sem controle de acesso.
          </span>
        </div>
        <main id="main" tabIndex={-1}>
          {storageIssue && (
            <div className="callout warning storage-error" role="alert">
              <AlertTriangle size={20} />
              <div>
                <strong>Armazenamento requer atenção</strong>
                <p>{storageIssue}</p>
                <button className="text-button" onClick={() => open({ type: 'data' })}>
                  Abrir dados da demonstração
                </button>
              </div>
            </div>
          )}
          {page === 'agenda' && <Agenda db={db} date={date} setDate={setDate} open={open} />}
          {page === 'patients' && <Patients db={db} open={open} />}
          {page === 'families' && <Families db={db} open={open} />}
          {page === 'about' && <About />}
          <footer className="page-footer">
            <span>Vulnerabilidade Familiar — Coelho-Savassi</span>
            <span>Planejar o cuidado. Acolher cada família.</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={20} />
          <span>{toast}</span>
          <button aria-label="Fechar aviso" onClick={() => setToast('')}>
            <X size={17} />
          </button>
        </div>
      )}
      {pendingStatus ? (
        <Modal
          title={pendingStatus.status === 'completed' ? 'Concluir consulta?' : 'Cancelar consulta?'}
          onClose={() => setPendingStatus(null)}
        >
          <div className="form-body">
            <p>
              <strong>
                {db.patients.find((p) => p.id === pendingStatus.appointment.patientId)?.name}
              </strong>{' '}
              · {formatDate(pendingStatus.appointment.date)} ·{' '}
              {pendingStatus.appointment.time || 'Sem horário'}
            </p>
            <p>
              {pendingStatus.status === 'completed'
                ? 'A consulta sairá da lista ativa. A avaliação familiar utilizada ficará preservada, mesmo após reavaliações.'
                : 'O registro e seu histórico serão mantidos na seção de consultas canceladas.'}
            </p>
          </div>
          <div className="form-actions">
            <button className="button secondary" onClick={() => setPendingStatus(null)}>
              Voltar
            </button>
            <button
              className={`button ${pendingStatus.status === 'completed' ? 'primary' : 'danger'}`}
              onClick={changeStatus}
            >
              Confirmar {pendingStatus.status === 'completed' ? 'conclusão' : 'cancelamento'}
            </button>
          </div>
        </Modal>
      ) : (
        <>
          {dialog?.type === 'patient' && (
            <Modal
              title={selectedPatient ? 'Editar paciente' : 'Cadastrar paciente'}
              subtitle="Use somente dados fictícios nesta demonstração."
              onClose={close}
            >
              <PatientForm db={db} initial={selectedPatient} onSave={savePatient} onClose={close} />
            </Modal>
          )}
          {dialog?.type === 'family' && (
            <Modal title={selectedFamily ? 'Editar família' : 'Cadastrar família'} onClose={close}>
              <FamilyForm initial={selectedFamily} onSave={saveFamily} onClose={close} />
            </Modal>
          )}
          {dialog?.type === 'appointment' && (
            <Modal
              title={selectedAppointment ? 'Editar ou reagendar consulta' : 'Agendar consulta'}
              subtitle="Escolha um paciente já cadastrado e a data de atendimento."
              onClose={close}
            >
              <AppointmentForm
                db={db}
                initial={selectedAppointment}
                patientId={dialog.patientId}
                date={date}
                onSave={saveAppointment}
                onClose={close}
              />
            </Modal>
          )}
          {dialog?.type === 'evaluation' && selectedFamily && (
            <Modal
              title={
                latestEvaluation(db, selectedFamily.id) ? 'Reavaliar família' : 'Avaliar família'
              }
              subtitle={`${selectedFamily.name} · confirme todas as respostas.`}
              onClose={close}
              wide
            >
              <EvaluationForm
                family={selectedFamily}
                onSave={saveFamilyEvaluation}
                onClose={close}
              />
            </Modal>
          )}
          {dialog?.type === 'evaluationDetail' && selectedEvaluation && (
            <Modal
              title="Resultado da avaliação familiar"
              subtitle={db.families.find((f) => f.id === selectedEvaluation.familyId)?.name}
              onClose={close}
              wide
            >
              <div className="form-body">
                <div className="evaluation-meta">
                  <span>
                    <CalendarDays size={16} />
                    {formatDate(selectedEvaluation.date)}
                  </span>
                  <span>
                    <Users size={16} />
                    {selectedEvaluation.operator || 'Operador não informado'}
                  </span>
                </div>
                <Calculation evaluation={selectedEvaluation} />
                <p className="form-note">
                  Avaliação preservada no histórico. Uma nova avaliação não altera este registro.
                </p>
              </div>
              <div className="form-actions">
                <button
                  className="button secondary"
                  onClick={() => open({ type: 'familyDetail', id: selectedEvaluation.familyId })}
                >
                  <History size={16} />
                  Histórico da família
                </button>
                <button className="button primary" onClick={close}>
                  Fechar resultado
                </button>
              </div>
            </Modal>
          )}
          {dialog?.type === 'patientDetail' && selectedPatient && (
            <Modal
              title="Dados do paciente"
              subtitle="Cadastro fictício de demonstração"
              onClose={close}
              wide
            >
              <div className="form-body">
                <div className="detail-person">
                  <Avatar name={selectedPatient.name} />
                  <div>
                    <h3>{selectedPatient.name}</h3>
                    <code>{patientCode(selectedPatient.id)}</code>
                  </div>
                </div>
                <dl className="detail-grid">
                  <div>
                    <dt>Família</dt>
                    <dd>
                      <button
                        className="text-button"
                        onClick={() => open({ type: 'familyDetail', id: selectedPatient.familyId })}
                      >
                        {db.families.find((f) => f.id === selectedPatient.familyId)?.name}
                      </button>
                    </dd>
                  </div>
                  <div>
                    <dt>Nascimento</dt>
                    <dd>
                      {selectedPatient.birthDate
                        ? formatDate(selectedPatient.birthDate)
                        : 'Não informado'}
                    </dd>
                  </div>
                  <div>
                    <dt>Equipe / UBS</dt>
                    <dd>{selectedPatient.team || 'Não informada'}</dd>
                  </div>
                  <div>
                    <dt>Microárea</dt>
                    <dd>{selectedPatient.microarea || 'Não informada'}</dd>
                  </div>
                  <div>
                    <dt>Profissional responsável</dt>
                    <dd>{selectedPatient.professional || 'Não informado'}</dd>
                  </div>
                  <div>
                    <dt>Observações</dt>
                    <dd>{selectedPatient.notes || 'Sem observações'}</dd>
                  </div>
                </dl>
                <h3 className="form-section">
                  <History size={18} />
                  Histórico de consultas
                </h3>
                <div className="history-list">
                  {db.appointments
                    .filter((a) => a.patientId === selectedPatient.id)
                    .sort(
                      (a, b) =>
                        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
                    )
                    .map((a) => (
                      <button
                        className="history-item"
                        key={a.id}
                        onClick={() => open({ type: 'appointmentDetail', id: a.id })}
                      >
                        <CalendarDays size={18} />
                        <div>
                          <strong>
                            {formatDate(a.date)} · {a.time || 'Sem horário'}
                          </strong>
                          <small>
                            {a.status === 'scheduled'
                              ? 'Agendada'
                              : a.status === 'completed'
                                ? 'Concluída'
                                : 'Cancelada'}
                          </small>
                        </div>
                        <ChevronRight size={17} />
                      </button>
                    ))}
                  {!db.appointments.some((a) => a.patientId === selectedPatient.id) && (
                    <p className="muted">Nenhuma consulta agendada.</p>
                  )}
                </div>
              </div>
              <div className="form-actions">
                <button
                  className="button secondary"
                  onClick={() => open({ type: 'patient', id: selectedPatient.id })}
                >
                  <Pencil size={16} />
                  Editar cadastro
                </button>
                <button
                  className="button primary"
                  onClick={() => open({ type: 'appointment', patientId: selectedPatient.id })}
                >
                  <Plus size={17} />
                  Agendar consulta
                </button>
              </div>
            </Modal>
          )}
          {dialog?.type === 'familyDetail' && selectedFamily && (
            <Modal
              title={selectedFamily.name}
              subtitle="Avaliações compartilhadas por todos os pacientes vinculados."
              onClose={close}
              wide
            >
              <div className="form-body">
                <dl className="detail-grid">
                  <div>
                    <dt>Equipe / UBS</dt>
                    <dd>{selectedFamily.team || 'Não informada'}</dd>
                  </div>
                  <div>
                    <dt>Microárea</dt>
                    <dd>{selectedFamily.microarea || 'Não informada'}</dd>
                  </div>
                  <div>
                    <dt>Endereço</dt>
                    <dd>{selectedFamily.address || 'Não informado'}</dd>
                  </div>
                  <div>
                    <dt>Pacientes vinculados</dt>
                    <dd>
                      {db.patients
                        .filter((p) => p.familyId === selectedFamily.id)
                        .map((p) => (
                          <button
                            className="text-button linked-patient"
                            key={p.id}
                            onClick={() => open({ type: 'patientDetail', id: p.id })}
                          >
                            {p.name}
                          </button>
                        ))}
                      {!db.patients.some((p) => p.familyId === selectedFamily.id) &&
                        'Nenhum paciente cadastrado'}
                    </dd>
                  </div>
                </dl>
                <h3 className="form-section">
                  <History size={18} />
                  Histórico de avaliações
                </h3>
                <p className="small muted">
                  A avaliação mais recentemente salva é a referência vigente, mesmo se incompleta.
                  Cada versão anterior permanece disponível.
                </p>
                <div className="history-list">
                  {db.evaluations
                    .filter((e) => e.familyId === selectedFamily.id)
                    .reverse()
                    .map((e, i) => (
                      <button
                        className="history-item evaluation-history"
                        key={e.id}
                        onClick={() => open({ type: 'evaluationDetail', id: e.id })}
                      >
                        <History size={18} />
                        <div>
                          <strong>
                            {formatDate(e.date)}
                            {i === 0 && <span className="current-tag">Vigente</span>}
                          </strong>
                          <small>
                            {e.operator || 'Operador não informado'} ·{' '}
                            {calculate(e).score === null
                              ? 'Sem escore definitivo'
                              : `${calculate(e).score} pontos`}
                          </small>
                        </div>
                        <RiskBadge risk={calculate(e).risk} compact />
                        <ChevronRight size={17} />
                      </button>
                    ))}
                  {!db.evaluations.some((e) => e.familyId === selectedFamily.id) && (
                    <p className="muted">Esta família ainda não foi avaliada.</p>
                  )}
                </div>
              </div>
              <div className="form-actions">
                <button
                  className="button secondary"
                  onClick={() => open({ type: 'family', id: selectedFamily.id })}
                >
                  <Pencil size={16} />
                  Editar família
                </button>
                <button
                  className="button primary"
                  onClick={() => open({ type: 'evaluation', id: selectedFamily.id })}
                >
                  Nova avaliação
                </button>
              </div>
            </Modal>
          )}
          {dialog?.type === 'appointmentDetail' && selectedAppointment && (
            <Modal
              title="Detalhes da consulta"
              subtitle={db.patients.find((p) => p.id === selectedAppointment.patientId)?.name}
              onClose={close}
              wide
            >
              <div className="form-body">
                <dl className="detail-grid">
                  <div>
                    <dt>Data e horário</dt>
                    <dd>
                      {formatDate(selectedAppointment.date)} ·{' '}
                      {selectedAppointment.time || 'Sem horário'}
                    </dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>
                      {selectedAppointment.status === 'scheduled'
                        ? 'Agendada'
                        : selectedAppointment.status === 'completed'
                          ? 'Concluída'
                          : 'Cancelada'}
                    </dd>
                  </div>
                  <div>
                    <dt>Equipe / UBS</dt>
                    <dd>{selectedAppointment.team || 'Não informada'}</dd>
                  </div>
                  <div>
                    <dt>Profissional</dt>
                    <dd>{selectedAppointment.professional || 'Não informado'}</dd>
                  </div>
                  <div>
                    <dt>Observações</dt>
                    <dd>{selectedAppointment.notes || 'Sem observações'}</dd>
                  </div>
                  <div>
                    <dt>Avaliação vinculada</dt>
                    <dd>
                      <RiskBadge
                        risk={calculate(appointmentEvaluation(db, selectedAppointment)).risk}
                        compact
                      />
                      {selectedAppointment.evaluationId && (
                        <button
                          className="text-button block-link"
                          onClick={() =>
                            open({
                              type: 'evaluationDetail',
                              id: selectedAppointment.evaluationId!,
                            })
                          }
                        >
                          Ver memória de cálculo
                        </button>
                      )}
                    </dd>
                  </div>
                </dl>
                <h3 className="form-section">
                  <History size={18} />
                  Histórico de alterações
                </h3>
                <ol className="timeline">
                  {selectedAppointment.history.map((h, i) => (
                    <li key={i}>
                      <strong>{h.action}</strong>
                      <small>{new Date(h.at).toLocaleString('pt-BR')}</small>
                      <p>{h.detail}</p>
                    </li>
                  ))}
                </ol>
                <p className="form-note">
                  Registro local de demonstração. Sem trilha de auditoria protegida ou autenticação.
                </p>
              </div>
              <div className="form-actions wrap-actions">
                {selectedAppointment.status === 'scheduled' ? (
                  <>
                    <button
                      className="button danger-outline"
                      onClick={() =>
                        setPendingStatus({ appointment: selectedAppointment, status: 'cancelled' })
                      }
                    >
                      Cancelar consulta
                    </button>
                    <button
                      className="button secondary"
                      onClick={() => open({ type: 'appointment', id: selectedAppointment.id })}
                    >
                      <CalendarClock size={16} />
                      Editar / reagendar
                    </button>
                    <button
                      className="button primary"
                      onClick={() =>
                        setPendingStatus({ appointment: selectedAppointment, status: 'completed' })
                      }
                    >
                      <CheckCircle2 size={16} />
                      Concluir consulta
                    </button>
                  </>
                ) : (
                  <button className="button primary" onClick={close}>
                    Fechar consulta
                  </button>
                )}
              </div>
            </Modal>
          )}
          {dialog?.type === 'data' && (
            <Modal
              title="Dados da demonstração"
              subtitle="Somente dados fictícios. Este navegador não é um prontuário."
              onClose={close}
              wide
            >
              <DemoData db={db} reset={resetDemo} storageIssue={storageIssue} />
            </Modal>
          )}
        </>
      )}
    </div>
  );
}
function ArrowIcon() {
  return <ChevronRight size={14} />;
}
function DemoData({
  db,
  reset,
  storageIssue,
}: {
  db: Database;
  reset: () => void;
  storageIssue: string;
}) {
  const [confirmation, setConfirmation] = useState('');
  return (
    <div className="form-body">
      <div className="callout warning">
        <Info size={20} />
        <div>
          <strong>Sem controle de acesso nesta demonstração</strong>
          <p>
            Qualquer pessoa com acesso a este navegador pode ver os registros. Não há conta, senha,
            servidor, banco remoto, criptografia de prontuário ou autorização. Use exclusivamente
            exemplos fictícios.
          </p>
        </div>
      </div>
      <p>
        Registros são persistidos no armazenamento local deste navegador. Atualizar a página mantém
        os dados; limpar os dados do site ou usar outro navegador não os mantém. A exportação abaixo
        contém todos os dados da demonstração.
      </p>
      <div className="data-actions">
        <button
          className="button secondary"
          onClick={() =>
            download(JSON.stringify(db, null, 2), `coelho-savassi-demo-${today()}.json`)
          }
        >
          <Download size={17} />
          Exportar dados fictícios
        </button>
        {storageIssue && (
          <button
            className="button secondary"
            onClick={() => {
              try {
                download(
                  localStorage.getItem(STORAGE_KEY) ?? '',
                  `coelho-savassi-original-${today()}.json`,
                );
              } catch {
                /* O navegador não permitiu ler o armazenamento. */
              }
            }}
          >
            Exportar arquivo original
          </button>
        )}
      </div>
      <h3 className="form-section">
        <History size={18} />
        Registro local de alterações
      </h3>
      <p className="small muted">
        Alterações feitas nesta demonstração, no dispositivo atual. Não substitui auditoria
        protegida no servidor.
      </p>
      <div className="audit-list">
        {db.audit.length ? (
          db.audit.map((a) => (
            <div className="audit-item" key={a.id}>
              <strong>{a.action}</strong>
              <small>{new Date(a.at).toLocaleString('pt-BR')}</small>
              <p>{a.detail}</p>
            </div>
          ))
        ) : (
          <p className="muted">Nenhuma alteração registrada. Os exemplos iniciais são fictícios.</p>
        )}
      </div>
      <div className="reset-panel">
        <h3>Reiniciar exemplos</h3>
        <p>
          Apaga os registros deste navegador e recria os exemplos fictícios com a data de hoje.
          Exporte antes se quiser guardá-los.
        </p>
        <label className="field">
          <span className="field-label">Digite REINICIAR para confirmar</span>
          <input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="off"
          />
        </label>
        <button
          className="button danger-outline"
          disabled={confirmation !== 'REINICIAR'}
          onClick={reset}
        >
          <RotateCcw size={16} />
          Reiniciar demonstração
        </button>
      </div>
    </div>
  );
}
