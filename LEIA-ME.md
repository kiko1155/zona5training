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
