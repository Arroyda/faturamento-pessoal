# Fat Finance — Sistema de Gestão Financeira

Aplicação **100% client-side** (sem servidor, sem banco de dados) para gestão financeira pessoal e empresarial. Os dados ficam no `localStorage` do browser e podem ser **exportados/importados** como JSON para backup ou para usar em outro dispositivo. Pronto para deploy estático no **Netlify**.

## Stack

- **React 18 + Vite + TypeScript**
- **TailwindCSS** + **Recharts** + **Lucide Icons**
- **Web Crypto API** (PBKDF2-SHA256) para hash de senha
- **localStorage** para persistência

## Funcionalidades

- Cadastro e login local (senha hasheada com PBKDF2-SHA256, 200k iterações)
- Multi-usuário no mesmo browser (cada um com seus próprios dados isolados)
- Transações (receitas/despesas) separadas em **pessoal** ou **empresa**
- Categorias customizáveis com cores (17 categorias padrão criadas automaticamente)
- Pagamentos com vencimento, status, recorrência
- Investimentos com retorno calculado
- Contas (bancos, carteiras, cartões)
- Metas com progresso
- Dashboard com KPIs:
  - Patrimônio estimado, saldo do mês, taxa de poupança
  - Saldo pessoal × empresarial
  - Performance dos investimentos
  - Pagamentos pendentes/vencidos
  - Gráficos: fluxo mensal (6 meses), despesas por categoria, investimentos por tipo
  - Próximos pagamentos (30 dias) e progresso das metas
- **Export/Import JSON** completo (Configurações)
- Alteração de senha autenticada
- Zerar todos os dados (mantém a conta)

## 🚀 Deploy no Netlify (1 minuto)

### Opção 1 — Drag & Drop

```bash
cd frontend
npm install
npm run build
```

Arraste a pasta `frontend/dist/` para https://app.netlify.com/drop. Pronto.

### Opção 2 — GitHub (CI/CD)

1. Suba este repositório para o GitHub
2. Em https://app.netlify.com → **Add new site → Import from Git**
3. Selecione o repositório. O Netlify lê o `netlify.toml` automaticamente:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/dist`
4. Clique em **Deploy**

A cada `git push`, novo deploy automático.

### Opção 3 — CLI

```bash
npm install -g netlify-cli
netlify login
netlify init        # vincula ao site
netlify deploy --prod
```

## Rodar localmente

```bash
cd frontend
npm install
npm run dev
```

App em http://localhost:5173. O primeiro usuário cadastrado vira admin automaticamente.

## Estrutura

```
Fat/
├── frontend/
│   ├── public/
│   │   ├── _redirects        # SPA fallback para Netlify
│   │   └── robots.txt
│   ├── src/
│   │   ├── store/            # 💾 storage local
│   │   │   ├── localdb.ts    # wrapper de localStorage
│   │   │   ├── crypto.ts     # PBKDF2 + UUID
│   │   │   ├── auth.ts       # register/login/changePassword
│   │   │   ├── repo.ts       # CRUD genérico
│   │   │   ├── dashboard.ts  # cálculo dos KPIs
│   │   │   ├── seed.ts       # categorias padrão
│   │   │   └── router.ts     # roteamento "API"-like local
│   │   ├── services/
│   │   │   └── api.ts        # facade axios-like → router
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx
│   │   ├── components/
│   │   │   ├── layout/       # Sidebar, Header, AppLayout
│   │   │   ├── charts/       # MonthlyChart, CategoryPie
│   │   │   └── ui/           # Modal, KpiCard, EmptyState
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── TransactionsPage.tsx
│   │   │   ├── InvestmentsPage.tsx
│   │   │   ├── PaymentsPage.tsx
│   │   │   ├── CategoriesPage.tsx
│   │   │   ├── AccountsPage.tsx
│   │   │   ├── GoalsPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   ├── hooks/useApi.ts
│   │   ├── lib/utils.ts
│   │   ├── types/index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── .nvmrc
├── netlify.toml              # config de deploy
└── README.md
```

## Como os dados ficam no browser

```
localStorage:
  fat:users          -> { users: [{ uid, email, password_hash, ... }] }
  fat:session        -> { uid }                       (quem está logado)
  fat:data:<uid>     -> { transactions, categories, ... }
```

⚠️ **Limpar o navegador apaga tudo.** Sempre exporte um backup. Para sincronizar entre dispositivos: exporte em um, importe no outro.

## Export / Import

Vá em **Configurações** → seção "Backup":

- **Exportar JSON:** baixa um arquivo `fat-finance-<email>-<data>.json` com tudo.
- **Importar JSON:** substitui completamente seus dados pelo conteúdo do arquivo.

Formato:

```json
{
  "schema_version": 1,
  "exported_at": "2026-05-13T14:30:00",
  "user": { "uid": "...", "email": "...", "display_name": "..." },
  "transactions": [ ... ],
  "categories":   [ ... ],
  "investments":  [ ... ],
  "payments":     [ ... ],
  "accounts":     [ ... ],
  "goals":        [ ... ]
}
```

## Segurança e limites

- **Senhas:** PBKDF2-SHA256, 200k iterações, salt aleatório de 16 bytes. Salvos no localStorage como `pbkdf2$<iter>$<salt>$<hash>`.
- **Sessão:** flag de uid no localStorage. Sem servidor, "login" protege o acesso à UI nesta máquina — quem tiver acesso direto ao localStorage do browser consegue ler os dados. Para uso pessoal local, é suficiente.
- **Privacidade:** nada sai do browser. Nenhuma chamada de rede para servir o app além do CDN do Netlify entregando os arquivos estáticos.
- **Multi-dispositivo:** não há sincronização automática. Use Export/Import.

## Personalização

- Cores: edite `tailwind.config.js` (`theme.extend.colors.brand`)
- Categorias padrão: edite `frontend/src/store/seed.ts`
- Headers de segurança no Netlify: `netlify.toml`

## Próximos passos sugeridos

- PWA / instalável (manifest + service worker)
- Sincronização opcional via WebDAV/Dropbox/Google Drive (mantendo cliente-only)
- Importação de extratos CSV/OFX
- Modo escuro
- App mobile (Capacitor)
