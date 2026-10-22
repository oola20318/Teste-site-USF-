import { useEffect, useRef, type ReactNode } from 'react';
import { X, AlertTriangle, CircleHelp, ShieldCheck, Info, Check } from 'lucide-react';
import { calculate, RISK, type Evaluation, type Risk } from './domain';

export function RiskBadge({ risk, compact = false }: { risk: Risk | null; compact?: boolean }) {
  return (
    <span className={`risk-badge ${risk || 'pending'}`}>
      {risk === 'r3' || risk === 'r2' ? (
        <AlertTriangle size={13} />
      ) : risk ? (
        <ShieldCheck size={13} />
      ) : (
        <CircleHelp size={13} />
      )}
      {risk ? (compact ? RISK[risk].short : RISK[risk].label) : 'Avaliação incompleta'}
    </span>
  );
}
export function Field({
  label,
  children,
  hint,
  className = '',
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={`field ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const keydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current();
      if (e.key === 'Tab') {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]',
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last || document.activeElement === ref.current)
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener('keydown', keydown);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${wide ? 'modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        tabIndex={-1}
        ref={ref}
      >
        <header className="modal-header">
          <div>
            <h2 id="dialog-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" aria-label="Fechar janela" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
export function Guidance() {
  return (
    <div className="guidance">
      <Info size={19} />
      <p>
        A vulnerabilidade familiar apoia o planejamento do cuidado e a equidade.{' '}
        <strong>Não substitui a avaliação clínica nem a classificação de urgência.</strong>
      </p>
    </div>
  );
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <CircleHelp size={26} />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Calculation({ evaluation }: { evaluation: Evaluation }) {
  const result = calculate(evaluation);
  return (
    <>
      <div className={`calculation-summary ${result.risk || 'pending'}`}>
        <div>
          <span>{result.complete ? 'Escore familiar total' : 'Subtotal provisório'}</span>
          <strong>
            {result.subtotal} <small>pontos</small>
          </strong>
        </div>
        <RiskBadge risk={result.risk} />
      </div>
      {!result.complete && (
        <div className="callout warning">
          <AlertTriangle size={18} />
          <div>
            <strong>Avaliação incompleta · sem classificação definitiva</strong>
            <p>Pendências: {result.pending.join('; ')}. O subtotal não define menor prioridade.</p>
          </div>
        </div>
      )}
      <div className="calculation-table">
        <table>
          <caption>Memória de cálculo</caption>
          <thead>
            <tr>
              <th>Sentinela</th>
              <th>Cálculo</th>
              <th>Pontos</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.key}>
                <td>{row.label}</td>
                <td>{row.detail}</td>
                <td>
                  <strong>{row.points ?? '—'}</strong>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan={2}>{result.complete ? 'Total' : 'Subtotal conhecido'}</th>
              <td>
                <strong>{result.subtotal}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}
export function FormActions({
  onClose,
  label = 'Salvar',
  disabled = false,
}: {
  onClose: () => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <div className="form-actions">
      <button type="button" className="button secondary" onClick={onClose}>
        Cancelar
      </button>
      <button type="submit" className="button primary" disabled={disabled}>
        <Check size={17} />
        {label}
      </button>
    </div>
  );
}
