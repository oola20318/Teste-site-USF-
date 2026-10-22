import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { type Database, SENTINELS, shiftDay } from '../../src/domain';

const readState = (page: Page): Promise<Database> =>
  page.evaluate(() => JSON.parse(localStorage.getItem('coelho-savassi-demo-v1')!));
const activePanel = (page: Page) =>
  page.locator('section.panel').filter({
    has: page.getByRole('heading', { name: 'Prioridade sugerida por vulnerabilidade' }),
  });
const dialog = (page: Page) => page.getByRole('dialog');
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Agenda do dia', exact: true })).toBeVisible();
});

test('agenda abre hoje, ordena por escore e separa os status e as pendências', async ({ page }) => {
  const localDay = await page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  await expect(page.getByLabel('Data da agenda')).toHaveValue(localDay);
  const rows = activePanel(page).getByTestId('appointment-row');
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(0)).toContainText('Maria Helena Oliveira');
  await expect(rows.nth(1)).toContainText('José Carlos Santos');
  await expect(rows.nth(2)).toContainText('Ana Beatriz Costa');
  await expect(rows.nth(3)).toContainText('Antônio Almeida');
  await expect(page.getByRole('heading', { name: 'Pendentes de avaliação' })).toBeVisible();
  await expect(page.locator('.pending-panel').getByTestId('appointment-row')).toHaveCount(2);
  await page.getByRole('tab', { name: /Concluídas/ }).click();
  await expect(page.getByTestId('appointment-row')).toHaveCount(1);
  await expect(page.getByTestId('appointment-row')).toContainText('Lucas Oliveira');
  await page.getByRole('tab', { name: /Canceladas/ }).click();
  await expect(page.getByTestId('appointment-row')).toContainText('Rosa Maria Santos');
});

test('filtro usa data da consulta; busca ignora acentos e filtros contam categorias', async ({
  page,
}) => {
  await expect(page.locator('.stat-card.r3 strong')).toHaveText('1');
  await page.locator('.stat-card.r3').click();
  await expect(activePanel(page).getByTestId('appointment-row')).toHaveCount(1);
  await page.locator('.stat-card.all').click();
  await page.getByRole('textbox', { name: 'Buscar paciente na agenda' }).fill('antonio');
  await expect(activePanel(page).getByTestId('appointment-row')).toHaveCount(1);
  await expect(activePanel(page).getByTestId('appointment-row')).toContainText('Antônio Almeida');
  await page.getByRole('textbox', { name: 'Buscar paciente na agenda' }).fill('');
  const day = await page.getByLabel('Data da agenda').inputValue();
  await page.getByRole('button', { name: 'Próximo dia', exact: true }).click();
  await expect(page.getByLabel('Data da agenda')).toHaveValue(shiftDay(day, 1));
  await expect(page.getByTestId('appointment-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Hoje', exact: true }).click();
  await expect(page.getByLabel('Data da agenda')).toHaveValue(day);
});

test('cadastra família e paciente, edita, agenda em duas datas e persiste após recarregar', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Pacientes', exact: true }).click();
  await page.getByRole('button', { name: 'Cadastrar paciente', exact: true }).click();
  await dialog(page).getByLabel('Nome completo do paciente').fill('Paciente Fictício de Teste');
  await dialog(page).getByLabel('Família vinculada').selectOption('__new');
  await dialog(page).getByLabel('Nome da nova família').fill('Família Fictícia de Teste');
  await dialog(page).getByRole('button', { name: 'Salvar paciente', exact: true }).click();
  const patientRow = page.getByRole('row').filter({ hasText: 'Paciente Fictício de Teste' });
  await patientRow.getByRole('button', { name: 'Editar', exact: true }).click();
  await dialog(page).getByLabel('Microárea', { exact: true }).fill('09');
  await dialog(page).getByRole('button', { name: 'Salvar paciente', exact: true }).click();
  await patientRow.getByRole('button', { name: 'Agendar', exact: true }).click();
  const day = await dialog(page).getByLabel('Data da consulta').inputValue();
  await dialog(page).getByLabel('Horário da consulta').fill('15:20');
  await dialog(page).getByRole('button', { name: 'Agendar consulta', exact: true }).click();
  await expect(page.locator('.pending-panel')).toContainText('Paciente Fictício de Teste');
  await page.getByRole('button', { name: 'Agendar consulta', exact: true }).click();
  const db = await readState(page);
  const p = db.patients.find((p) => p.name === 'Paciente Fictício de Teste')!;
  await dialog(page).getByLabel('Paciente', { exact: false }).selectOption(p.id);
  await dialog(page).getByLabel('Data da consulta').fill(shiftDay(day, 2));
  await dialog(page).getByRole('button', { name: 'Agendar consulta', exact: true }).click();
  await page.reload();
  const reloaded = await readState(page);
  expect(reloaded.patients.filter((x) => x.id === p.id)).toHaveLength(1);
  expect(reloaded.appointments.filter((x) => x.patientId === p.id)).toHaveLength(2);
  expect(reloaded.patients.find((x) => x.id === p.id)?.microarea).toBe('09');
  expect(reloaded.families.some((x) => x.name === 'Família Fictícia de Teste')).toBe(true);
});

test('detecta duplicidade e exige confirmação explícita para manter outra consulta', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Agendar consulta', exact: true }).click();
  await dialog(page).getByLabel('Paciente', { exact: false }).selectOption('PAC-0001');
  await expect(
    dialog(page).getByText('Possível agendamento duplicado', { exact: true }),
  ).toBeVisible();
  await expect(
    dialog(page).getByRole('button', { name: 'Agendar consulta', exact: true }),
  ).toBeDisabled();
  await dialog(page).getByRole('checkbox').check();
  await dialog(page).getByRole('button', { name: 'Agendar consulta', exact: true }).click();
  expect(
    (await readState(page)).appointments.filter((a) => a.patientId === 'PAC-0001'),
  ).toHaveLength(3);
});

test('reagenda, conclui e cancela preservando histórico', async ({ page }) => {
  await page
    .getByRole('button', { name: 'Editar ou reagendar Maria Helena Oliveira', exact: true })
    .click();
  const day = await dialog(page).getByLabel('Data da consulta').inputValue();
  await dialog(page).getByLabel('Data da consulta').fill(shiftDay(day, 2));
  await dialog(page).getByLabel('Horário da consulta').fill('16:45');
  await dialog(page).getByRole('button', { name: 'Salvar alterações', exact: true }).click();
  await page
    .getByRole('button', { name: 'Ver consulta de Maria Helena Oliveira', exact: true })
    .click();
  await expect(dialog(page)).toContainText('Consulta editada / reagendada');
  await dialog(page).getByRole('button', { name: 'Concluir consulta', exact: true }).click();
  await dialog(page).getByRole('button', { name: 'Confirmar conclusão', exact: true }).click();
  await page.getByRole('tab', { name: /Concluídas/ }).click();
  await expect(page.getByTestId('appointment-row')).toContainText('Maria Helena Oliveira');
  await page.getByRole('button', { name: 'Hoje', exact: true }).click();
  await page.getByRole('tab', { name: /Ativas/ }).click();
  await page
    .getByRole('button', { name: 'Ver consulta de José Carlos Santos', exact: true })
    .click();
  await dialog(page).getByRole('button', { name: 'Cancelar consulta', exact: true }).click();
  await dialog(page).getByRole('button', { name: 'Confirmar cancelamento', exact: true }).click();
  const db = await readState(page);
  expect(db.appointments.find((a) => a.id === 'apt-1')?.status).toBe('completed');
  expect(db.appointments.find((a) => a.id === 'apt-2')?.status).toBe('cancelled');
  expect(db.appointments.find((a) => a.id === 'apt-1')?.history.map((h) => h.action)).toContain(
    'Consulta editada / reagendada',
  );
  expect(db.appointments.find((a) => a.id === 'apt-2')?.history.map((h) => h.action)).toContain(
    'Consulta cancelada',
  );
});

test('questionário sem respostas presumidas, divisão por zero bloqueada e salvamento incompleto', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Famílias e avaliações', exact: true }).click();
  const family = page.locator('.family-card').filter({ hasText: 'Família Lima' });
  await family.getByRole('button', { name: 'Avaliar família', exact: true }).click();
  await expect(dialog(page).getByLabel('Quantas pessoas moram no domicílio?')).toHaveValue('');
  await expect(dialog(page).getByLabel('Quantas pessoas têm hipertensão')).toHaveValue('');
  await expect(dialog(page).getByLabel('Lixo a céu aberto')).toHaveValue('');
  await dialog(page).getByLabel('Operador responsável').fill('Operador fictício');
  await dialog(page).getByLabel('Quantas pessoas moram no domicílio?').fill('2');
  await dialog(page).getByLabel('Quantos cômodos existem').fill('0');
  await dialog(page).getByRole('button', { name: 'Revisar resultado' }).click();
  await expect(dialog(page).getByRole('button', { name: 'Revisar resultado' })).toBeVisible();
  await dialog(page).getByLabel('Quantos cômodos existem').fill('4');
  await dialog(page).getByRole('button', { name: 'Revisar resultado' }).click();
  await expect(dialog(page)).toContainText('Avaliação incompleta · sem classificação definitiva');
  await dialog(page)
    .getByRole('button', { name: 'Salvar avaliação e vincular ao agendamento' })
    .click();
  await expect(dialog(page)).toContainText('Avaliação incompleta');
  const db = await readState(page);
  const latest = db.evaluations.at(-1)!;
  expect(latest.familyId).toBe('fam-6');
  expect(latest.counts.hypertension).toBeNull();
  expect(db.appointments.find((a) => a.patientId === 'PAC-0006')?.evaluationId).toBe(latest.id);
});

test('reavaliação calcula corretamente e preserva referência em consulta concluída', async ({
  page,
}) => {
  const original = await readState(page);
  await page.getByRole('button', { name: 'Famílias e avaliações', exact: true }).click();
  await page
    .locator('.family-card')
    .filter({ hasText: 'Família Oliveira' })
    .getByRole('button', { name: 'Reavaliar família', exact: true })
    .click();
  await dialog(page).getByLabel('Operador responsável').fill('Enfermeira fictícia');
  await dialog(page).getByLabel('Quantas pessoas moram no domicílio?').fill('4');
  await dialog(page).getByLabel('Quantos cômodos existem').fill('2');
  for (const s of SENTINELS)
    await dialog(page)
      .locator(`#sentinel-${s.key}`)
      .fill(s.key === 'hypertension' ? '2' : s.key === 'bedridden' ? '1' : '0');
  for (const label of ['Lixo a céu aberto', 'Água sem tratamento', 'Esgoto a céu aberto'])
    await dialog(page).getByLabel(label).selectOption('true');
  await dialog(page).getByRole('button', { name: 'Revisar resultado' }).click();
  await expect(dialog(page).locator('.calculation-summary')).toContainText('11');
  await expect(dialog(page).locator('.calculation-summary')).toContainText('R3 — Risco máximo');
  await dialog(page)
    .getByRole('button', { name: 'Salvar avaliação e vincular ao agendamento' })
    .click();
  const db = await readState(page);
  const latest = db.evaluations.at(-1)!;
  expect(db.evaluations).toHaveLength(original.evaluations.length + 1);
  expect(
    db.appointments
      .filter((a) => a.patientId === 'PAC-0001')
      .every((a) => a.evaluationId === latest.id),
  ).toBe(true);
  expect(db.appointments.find((a) => a.patientId === 'PAC-0007')?.evaluationId).toBe('eval-1');
  await dialog(page).getByRole('button', { name: 'Histórico da família', exact: true }).click();
  await expect(dialog(page).locator('.evaluation-history')).toHaveCount(2);
  await page.reload();
  expect((await readState(page)).evaluations.at(-1)?.id).toBe(latest.id);
});

test('documenta limites de proteção e mantém controles de exportação e reinício', async ({
  page,
}) => {
  await expect(page.locator('.demo-banner')).toContainText('sem controle de acesso');
  await page.getByRole('button', { name: 'Sobre a escala', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Correções metodológicas em relação ao anexo' }),
  ).toBeVisible();
  await expect(page.getByText('70 anos completos ou mais', { exact: true })).toBeVisible();
  const pdf = await page.request.get('/referencias/anexo-coelho-savassi.pdf');
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()['content-type']).toContain('application/pdf');
  await page.getByRole('button', { name: 'Dados da demonstração', exact: true }).click();
  await expect(dialog(page)).toContainText('Sem controle de acesso nesta demonstração');
  const downloadPromise = page.waitForEvent('download');
  await dialog(page).getByRole('button', { name: 'Exportar dados fictícios' }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/coelho-savassi-demo/);
  await expect(dialog(page).getByRole('button', { name: 'Reiniciar demonstração' })).toBeDisabled();
  await dialog(page).getByLabel('Digite REINICIAR para confirmar').fill('REINICIAR');
  await dialog(page).getByRole('button', { name: 'Reiniciar demonstração' }).click();
  await expect(dialog(page)).toHaveCount(0);
  expect((await readState(page)).audit).toHaveLength(0);
});

test('armazenamento corrompido não é sobrescrito silenciosamente', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('coelho-savassi-demo-v1', '{dados inválidos'));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('não foram sobrescritos');
  expect(await page.evaluate(() => localStorage.getItem('coelho-savassi-demo-v1'))).toBe(
    '{dados inválidos',
  );
});

test('navegação e formulários funcionam em celular sem transbordamento da página', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Abrir menu', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await expect(page.locator('.appointment-cards').first()).toBeVisible();
  await expect(page.locator('.agenda-desktop').first()).toBeHidden();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileAccessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(mobileAccessibility.violations.map((v) => v.id)).toEqual([]);
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
  await page.getByRole('button', { name: 'Pacientes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pacientes', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cadastrar paciente', exact: true }).click();
  await expect(dialog(page).getByLabel('Nome completo do paciente')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: '/tmp/coelho-mobile-pacientes.png', fullPage: true });
});

test('sem erros de execução e com estrutura acessível nas quatro telas', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const name of ['Agenda do dia', 'Pacientes', 'Famílias e avaliações', 'Sobre a escala']) {
    await page.getByRole('button', { name, exact: true }).click();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        help: v.help,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
  expect(errors).toEqual([]);
});
