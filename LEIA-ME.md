# Zone5Training — como pôr online

## 1. Supabase (login + base de dados + fotos)
1. Cria conta em supabase.com → New project (guarda a password da base de dados).
2. **SQL Editor** → New query → cola o conteúdo de `supabase.sql` → Run.
3. **Authentication → Sign In / Providers**: desativa "Allow new users to sign up" (só tu crias contas).
4. **Authentication → Users → Add user → Create new user**: email `ADMIN@zone5.example.com` (troca ADMIN pelo username que queres usar), define uma password forte e marca "Auto Confirm User".
5. **SQL Editor**, corre (com o mesmo username):
   `insert into profiles (id, username, name, role) select id, 'ADMIN', 'Administrador', 'admin' from auth.users where email = 'ADMIN@zone5.example.com';`
6. **Project Settings → API**: copia o *Project URL*, a chave *anon public* e a chave *service_role* (esta é secreta!).

## 2. Configurar o site
Abre `public/config.js` e cola o Project URL e a chave anon. (A anon é pública por desenho; a segurança vem das regras da base de dados.)

## 3. Netlify (alojamento)
1. Cria conta em github.com e um repositório **privado**; faz upload de todos estes ficheiros.
2. Em netlify.com → Add new site → Import from Git → escolhe o repositório. Não precisas de comando de build.
3. **Site configuration → Environment variables**, cria:
   - `SUPABASE_URL` = o Project URL
   - `SUPABASE_SERVICE_KEY` = a chave service_role
   - `ANTHROPIC_API_KEY` = chave de console.anthropic.com (só para a leitura de fotos de comida; tem custo por utilização)
4. Deploys → Trigger deploy. O link `https://nome.netlify.app` já funciona; podes ligar o teu domínio em Domain management.

## 4. Usar
Entra com o username/password de admin → cria clientes → associa PT e ginásio → dá aos alunos o link, username e password.

## Notas
- Nunca partilhes a chave service_role nem a ANTHROPIC_API_KEY, e nunca as coloques em config.js.
- Ao remover um cliente apagam-se a conta e os dados; as fotos ficam no Storage (apaga-as no painel do Supabase se quiseres).
- Esta versão não foi testada contra um projeto Supabase real: faz um teste completo (admin → criar cliente → entrar como cliente → registar tudo) antes de dares acesso aos alunos. Como guardas dados de saúde, consulta as obrigações de RGPD aplicáveis ao teu negócio.

## Registo público (novo)
- Ficheiro novo: `netlify/functions/register.mjs`. Variável opcional no Netlify: `ALLOW_REGISTRATION=false` desliga o registo (por omissão está ligado).
- Mantém "Allow new users to sign up" DESLIGADO no Supabase: o registo passa só pela função, que cria sempre contas `client`.
- Atualiza o repositório: substitui `public/index.html` e adiciona `netlify/functions/register.mjs`; o Netlify volta a publicar sozinho.

## Interface "Forja" (nova)
- `public/index.html` usa agora a interface visual da versão anterior (tema escuro, tipografia Big Shoulders/Instrument Sans/JetBrains Mono, sidebar, cartões, Chart.js, ícones Lucide) sobre o mesmo sistema de sessões/admin.
- Navegação por hash: `#/painel`, `#/treino`, `#/evolucao`, `#/habitos`, `#/nutricao`, `#/suplementos`, `#/peso`. As funções do servidor (`/.netlify/functions/*`), o `supabase.sql` e a lógica de login/sessão não foram alterados.
- Reutilizar o projeto React/TanStack original exigiria reescrever em React a camada de dados e de autenticação (não incluído).

## Versão 2 (melhorias)
Ficheiros novos em `public/`: `sw.js` (service worker), `manifest.webmanifest`, `icon*.png/svg`. `netlify.toml` ganhou cabeçalhos para o `sw.js`.
- **Mobile:** menu lateral oculto abaixo de 1024 px; barra inferior (Painel, Treino, Evolução, Nutrição) + "Mais" (Hábitos, Suplementação, Peso & Fotos, notificações, Sair).
- **Painel:** check rápido de hábitos e suplementos; água +250/+500 ml (meta editável em Hábitos).
- **Treino:** calculadora 1RM/RIR ao vivo; RPE por série com 1RM e RIR em tempo real; referência do treino anterior por exercício e por série.
- **Nutrição:** metas de kcal/proteína/hidratos/gordura para dia de treino e de descanso (automático pelo plano/sessão do dia, com escolha manual).
- **Lembretes:** hora por suplemento; lembretes periódicos por hábito (de X em X horas, entre duas horas do dia). Disparam com a app aberta ou em segundo plano; app totalmente fechada não é garantido (exigiria Web Push com servidor).
- **Offline:** a app abre sem rede e mostra, só para leitura, o plano de treino e o plano alimentar do último acesso. É preciso ter aberto a app online pelo menos uma vez. O cache local é apagado ao terminar sessão.
- Alterações mínimas à lógica existente (todas aditivas): `boot` e `openC` (fallback offline), `save` (guarda cópia local), `mut` (bloqueia edição offline), `logout` (limpa cache) e `saveSess` (guarda o RPE de cada série). Funções do Netlify e `supabase.sql` inalterados.
- Dados novos vão dentro do JSON já existente (sem alterar o `supabase.sql`).


## Versão 3: fotos, admin, hidratação e push (LER ANTES DE ATUALIZAR)
**Não substituas o teu `public/config.js`** (já tem o teu URL e chave do Supabase). O zip traz só `config.example.js`.

### Passos para atualizar (por esta ordem)
1. **Supabase → SQL Editor:** corre `supabase-v3.sql` (cria as tabelas de push e as permissões de admin; o último `select` mostra os teus perfis, confirma que o teu admin tem `role = admin`).
2. **Chaves VAPID:** abre `tools/gerar-chaves-vapid.html` no computador, clica "Gerar chaves".
3. **Netlify → Site configuration → Environment variables**, acrescenta: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (mailto:o-teu-email). Já deves ter `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` e `ANTHROPIC_API_KEY`.
4. **GitHub:** carrega todos os ficheiros do zip (menos `config.js`). O novo `package.json` faz o Netlify instalar a biblioteca `web-push`. O Netlify publica sozinho.
5. **Netlify → Functions:** confirma que `push-cron` aparece como função agendada. Se o teu plano não aceitar execução a cada minuto, muda `schedule` em `push-cron.mjs` para `*/5 * * * *`.
6. Em cada telemóvel: abre a app, vai a Hábitos ou Suplementação e carrega "Ativar notificações". No iPhone, instala primeiro a app no ecrã principal.

### O que mudou
- **Fotos de refeições:** pré-visualização imediata, spinner, análise por `analyze-food` (Base64 → Claude Vision) e painel de revisão editável antes de guardar. Modelo por omissão: `claude-haiku-5-5` (variável opcional `ANTHROPIC_MODEL`); limite de tempo `ANALYZE_TIMEOUT_MS` (8500 ms).
- **Admin:** novo middleware `lib/auth.mjs` (sessão + papel lido na base de dados). `admin.mjs`: `ping`, `create`, `password`, `delete` (apaga primeiro as fotos no Storage, que bloqueavam a remoção), `assign-plan`. Painel com apagar conta, nova password (com sugestão), plano de treino por cliente, modelos de plano e indicador "Permissões".
- **Plano semanal** (`#/plano`): editor dos 7 dias; o admin edita na conta de qualquer cliente.
- **Hidratação:** de hora em hora, 07:00–21:00, até a meta (ou o botão "Meta concluída") fechar o dia; retoma às 07:00 seguintes.
- **Hábitos:** cada hábito novo vem com lembrete a cada 1 h (07:00–21:00) por omissão, configurável; só avisa enquanto não estiver feito.
- **Push:** `push.mjs` (subscrições), `push-cron.mjs` (envio a cada minuto, deduplicado) e `sw.js` (receção). O servidor lê o estado guardado, por isso um item concluído deixa de ser enviado no ciclo seguinte e as notificações já mostradas são fechadas no telemóvel.
