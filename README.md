# Vulnerabilidade Familiar — Coelho-Savassi

Aplicação responsiva em português brasileiro para experimentar o planejamento do cuidado na Atenção Primária à Saúde com a Escala de Risco Familiar de Coelho-Savassi. Interface independente inspirada na linguagem visual do e-SUS APS PEC, sem vínculo ou integração oficial.

**Esta entrega é uma demonstração funcional, exclusivamente com dados fictícios.** Os registros ficam no `localStorage` deste navegador. Não há autenticação, autorização no servidor, banco de dados remoto ou proteção de prontuários. Não insira dados reais. A ausência de controle de acesso é informada na aplicação.

## Executar

Requisitos: Node.js 24 (validado com 24.19.0) e npm. As versões exatas das dependências estão em `package-lock.json`.

```bash
cd /workspace/Teste-site-USF-
npm ci --cache /workspace/.npm-cache
npm run dev
```

O servidor usa a porta **5173** e escuta em `0.0.0.0`. Em uma instalação local, abra essa porta no seu navegador. A data inicial usa a data local do navegador; os exemplos são gerados na primeira execução. Nenhum segredo, API, CPF ou CNS é necessário.

Para repetir a preparação completa na nuvem, execute `bash scripts/setup-cloud.sh`. Esse script instala com o lockfile, compila e executa os testes de regras e dados.

Fora deste ambiente, use o caminho do seu checkout no comando `cd`. Você pode omitir `--cache` quando a pasta padrão de cache do npm for gravável. A interface e a fonte são servidas pelo próprio projeto, sem chamadas externas para fontes, APIs ou prontuários.

## Compilar e verificar

```bash
npm run build
npm test
npm run test:e2e
```

- `build`: verifica os tipos e gera a distribuição estática em `dist/`.
- `test`: regras de cálculo, fronteiras, contagens, saneamento, adensamento, pendências, ordenação, reuso familiar, histórico e persistência.
- `test:e2e`: Chromium, formulários reais, fluxo de cadastro e consultas, duplicidade, reavaliação, histórico, recarga, exportação, celular e auditoria automatizada de acessibilidade com axe-core.

O ambiente já fornece Chromium em `/usr/bin/chromium`. Em outra máquina, instale Chromium e informe seu executável:

```bash
CHROMIUM_PATH=/caminho/do/chromium npm run test:e2e
```

Ou instale o navegador do Playwright com `npx playwright install chromium` e passe o caminho do executável instalado em `CHROMIUM_PATH`. Em máquinas Linux sem bibliotecas do navegador, a instalação dessas dependências pode exigir privilégios administrativos. Nenhuma instalação adicional do navegador é necessária neste ambiente.

Para conferir o pacote compilado, execute `npm run preview` (porta padrão 4173). Esse comando é apenas uma prévia técnica do build; não fornece infraestrutura segura para dados clínicos.

## Experimentar os fluxos

1. **Agenda do dia:** abre hoje. O calendário, as setas e “Hoje” usam a data da consulta. Os cartões de contagem filtram por categoria. Busca por nome ignora diferenças de acento. As abas separam ativas, concluídas e canceladas.
2. **Pacientes:** cadastre uma pessoa fictícia; o identificador é automático. Selecione uma família ou crie uma no mesmo formulário. O cadastro é independente da consulta. Depois use “Agendar” para registrar uma ou várias datas.
3. **Famílias e avaliações:** cadastre/edite a família e use “Avaliar” ou “Reavaliar”. Todas as respostas de contagem e de saneamento começam desconhecidas. Confirme cada dado, consulte as definições e revise a memória de cálculo. É possível salvar uma avaliação incompleta, que não recebe classificação definitiva.
4. **Reavaliação:** salva outra versão, atualiza as referências das consultas pendentes de todos os pacientes da família e preserva as avaliações anteriores e as referências das consultas concluídas.
5. **Consultas:** nos detalhes, edite/reagende, conclua ou cancele. Reagendar não exclui o histórico; concluir preserva a avaliação usada. Duplicidade no mesmo dia exige confirmação explícita. A ordenação não remarca horários.
6. **Dados da demonstração:** exporte o JSON fictício, consulte o registro local de alterações ou digite `REINICIAR` para recriar os exemplos. A recarga preserva os dados; limpar os dados do site os remove. Não há sincronização entre navegadores. Evite editar a mesma demonstração em abas simultâneas.

Os exemplos incluem famílias em todas as quatro faixas, avaliação incompleta, família ainda não avaliada, consultas concluídas/canceladas e outra consulta do mesmo paciente amanhã. Pacientes da mesma família reutilizam uma única avaliação.

## Metodologia

```text
Escore familiar = Σ (número de pessoas × peso da sentinela)
                 + saneamento (uma vez)
                 + adensamento (uma vez)
```

Uma pessoa pode contribuir para diferentes condições. Cada contagem deve ser inteira, não negativa e não ultrapassar o número de integrantes. Moradores e cômodos devem ser inteiros positivos. A aplicação não diagnostica condições nem preenche desemprego automaticamente por idade ou renda.

| Total     | Classificação                    |
| --------- | -------------------------------- |
| 0–4       | Abaixo do ponto de corte para R1 |
| 5–6       | R1 — Risco menor                 |
| 7–8       | R2 — Risco médio                 |
| 9 ou mais | R3 — Risco máximo                |

Informação essencial desconhecida impede escore/classificação definitivos. O subtotal conhecido é identificado como provisório. Mesmo quando já existe uma condição de saneamento positiva, a ausência de confirmação das demais permanece como pendência; os 3 pontos conhecidos aparecem no subtotal uma única vez.

Correções explícitas em relação ao PDF:

- **Moradores ÷ cômodos**, corrigindo a inversão presente na definição do anexo.
- Relação maior que 1: 3 pontos; igual a 1: 2; menor que 1: **0**, em vez de 1. A decisão compara os inteiros sem arredondar; apenas a exibição da relação pode ser aproximada.
- **R3 a partir de 9**, em vez de “acima de 9”.
- **70 anos completos ou mais**, em vez de “mais de 70 anos”.

No desempate da agenda, horário marcado vem primeiro (sem horário fica depois), seguido da ordem de inclusão. São regras operacionais da aplicação. Avaliações incompletas têm uma seção própria e não são presumidas de menor prioridade. Canceladas e concluídas ficam separadas.

O formulário contextualiza a terminologia histórica “deficiência mental”, sem equipará-la automaticamente a transtorno mental. Trabalho doméstico conta como ocupação, mesmo não remunerado; férias, licenças e afastamentos temporários não equivalem a desemprego. Hipertensão, diabetes e desnutrição dependem de identificação profissional.

> A vulnerabilidade familiar apoia o planejamento do cuidado e a equidade. Não substitui a avaliação clínica nem a classificação de urgência.

## Fontes

- [PDF fornecido — Anexo da Escala de Coelho-Savassi](public/referencias/anexo-coelho-savassi.pdf), lido na implementação e disponível na tela “Sobre a escala”.
- [Savassi, Lage e Coelho — Sistematização do instrumento, JMPHC](https://www.jmphc.com.br/jmphc/article/view/155).
- [Coelho e Savassi — Aplicação de escala de risco familiar, RBMFC](https://rbmfc.org.br/rbmfc/article/view/104).
- [Manual oficial e-SUS APS PEC — referência visual](https://sisaps.saude.gov.br/sistemas/esusaps/docs/manual/PEC/).

As consultas online aos três sites retornaram bloqueio `403` da rede deste ambiente. O conteúdo dessas páginas não foi verificado nesta execução. Os critérios implementados seguem o PDF e as correções metodológicas explícitas do pedido.

## Organização do projeto

- `src/domain.ts`: cálculo puro, classificação, vínculo de avaliações e ordenação.
- `src/storage.ts`: persistência versionada e verificação estrutural/referencial. Um arquivo local incompatível não é sobrescrito automaticamente; a interface oferece exportação do original e reinício explícito.
- `src/seed.ts`: exemplos fictícios gerados na data da primeira execução.
- `src/App.tsx`: estado da demonstração, navegação, ações e históricos.
- `src/pages.tsx`, `src/forms.tsx`, `src/ui.tsx`: telas, formulários e componentes acessíveis; tabela no computador e cartões na agenda do celular.
- `src/styles.css`: identidade visual, adaptação a telas menores, foco, contraste, movimento reduzido e impressão.
- `tests/`: verificações unitárias e fluxos no Chromium.

## Limite para uso real

Esta distribuição não é um prontuário pronto para produção. O histórico local é alterável por quem controla o navegador. Hospedar os arquivos estáticos com HTTPS, por si só, não adiciona autenticação, autorização ou proteção dos registros.

Uma versão para dados reais exige backend, banco de dados com migrações e backups, autenticação individual (preferencialmente provedor institucional), autorização por equipe verificada **no servidor a cada operação**, sessões protegidas, HTTPS, validação dos dados no servidor, trilha de auditoria protegida, política de retenção e governança de proteção de dados conforme a LGPD. As credenciais devem permanecer no servidor. A migração desse modo de demonstração requer implementação e validação próprias; não basta adicionar uma senha visual.

A verificação desta entrega confirma explicitamente o modo fictício e a ausência de controle de acesso; não alega testes de autenticação ou de autorização de um backend inexistente.

## Ambiente na nuvem

Use o checkout existente. Cada tarefa já é isolada; não crie worktrees para iniciar o projeto. Dependências e arquivos podem ser preservados pelo snapshot do ambiente; processos precisam ser iniciados novamente. O script de instalação e as instruções de inicialização são salvos separadamente na configuração do ambiente.

Revise os arquivos e publique o ambiente pelo fluxo do produto quando desejar preservar essa configuração para novas tarefas. A publicação do ambiente na nuvem é separada da hospedagem do site. A restauração em outra tarefa ainda não foi validada.

## Publicar a demonstração no GitHub Pages

O código-fonte usa a branch `main`. A distribuição estática usa `gh-pages`. Ela incorpora os assets no HTML e mantém o link do PDF relativo, para funcionar no subdiretório do repositório.

```bash
npm run deploy:pages
```

Esse comando compila, gera `pages/` e envia apenas os arquivos da demonstração para `gh-pages`, preservando a branch e o índice de trabalho. Usa a autenticação Git já configurada. Não usa force push. Execute somente quando quiser publicar as alterações; arquivos enviados ficarão disponíveis no site após o processamento do GitHub.

Na primeira publicação, ative o GitHub Pages em **Settings → Pages → Build and deployment → Deploy from a branch**, escolhendo **gh-pages** e **/ (root)**, e salve. O endereço esperado é `https://oola20318.github.io/Teste-site-USF-/`. A presença da branch por si só não confirma a ativação ou a disponibilidade do site.

O site público continua sendo uma demonstração com dados fictícios. Cada visitante tem seu próprio armazenamento no navegador; os registros não são enviados ao GitHub nem compartilhados entre visitantes. Não use dados reais.
