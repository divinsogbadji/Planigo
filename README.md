# 🗓️ Planigo — Planificateur de tâches intelligent

Planigo est une application web de gestion de tâches assistée par intelligence artificielle. Elle permet de créer, organiser et planifier ses tâches avec une interface moderne en mode sombre, le glisser-déposer sur un calendrier hebdomadaire, et un assistant IA capable de décomposer un objectif en sous-tâches.

## ✨ Fonctionnalités

- **Authentification** — Inscription / connexion sécurisée via Supabase Auth
- **Gestion de tâches** — Créer, modifier, supprimer avec validation complète des formulaires
- **Colonnes de statut** — À faire · En cours · Terminé
- **Calendrier hebdomadaire** — Navigation semaine par semaine avec glisser-déposer pour replanifier
- **Assistant IA** — Décrivez un objectif → l'IA génère un plan de tâches (GPT-4o-mini)
- **Filtres** — Par catégorie (Personnel, Travail, Études) et par période (Aujourd'hui, Semaine, Tout)
- **Notifications Toast** — Retour visuel pour chaque action (succès / erreur)
- **Design glassmorphism** — Mode sombre avec effets 3D, dégradés et micro-animations

## 🛠️ Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Turbopack) |
| UI | [shadcn/ui](https://ui.shadcn.com) + [Tailwind CSS 4](https://tailwindcss.com) |
| Base de données | [Supabase](https://supabase.com) (PostgreSQL + Auth + RLS) |
| IA | [OpenAI GPT-4o-mini](https://platform.openai.com) |
| Langage | TypeScript |
| Déploiement | [Vercel](https://vercel.com) |

## 📁 Structure du projet

```
Planigo/
├── app/
│   ├── (auth)/          # Pages login / signup + actions serveur
│   ├── api/ai/          # Route API pour l'assistant IA
│   ├── auth/callback/   # Callback de confirmation email Supabase
│   ├── globals.css      # Styles globaux + utilitaires glassmorphism
│   ├── layout.tsx       # Layout racine (ThemeProvider + ToastProvider)
│   └── page.tsx         # Page principale (dashboard)
├── components/
│   ├── ui/              # Composants shadcn/ui
│   ├── Layout_Principal.tsx  # Orchestrateur principal (état + CRUD)
│   ├── CalendarView.tsx      # Calendrier hebdomadaire + drag & drop
│   ├── TaskForm.tsx          # Formulaire création/édition avec validation
│   ├── AISuggestDialog.tsx   # Dialog assistant IA
│   ├── Sidebar.tsx           # Navigation latérale
│   ├── Toast.tsx             # Système de notifications
│   └── ...
├── lib/supabase/        # Clients Supabase (client + serveur + middleware)
├── types/task.ts        # Types partagés (Task, TaskInsert, AISuggestedTask)
└── .env.example         # Variables d'environnement requises
```

## 🚀 Installation

### Prérequis

- [Node.js](https://nodejs.org) ≥ 18
- Un projet [Supabase](https://supabase.com) avec une table `tasks`
- Une clé API [OpenAI](https://platform.openai.com)

### Étapes

```bash
# 1. Cloner le dépôt
git clone https://github.com/divinsogbadji/Planigo.git
cd Planigo/Planigo

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env.local
# Remplir les valeurs dans .env.local

# 4. Lancer en développement
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000).

### Table Supabase `tasks`

```sql
create table tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  category text not null default 'personal',
  status text not null default 'todo',
  priority text not null default 'medium',
  due_date timestamptz,
  duration text,
  created_at timestamptz default now()
);

-- Activer RLS
alter table tasks enable row level security;

-- Politique : chaque utilisateur ne voit que ses propres tâches
create policy "Users manage own tasks" on tasks
  for all using (auth.uid() = user_id);
```

## ⚙️ Variables d'environnement

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_APP_ENV` | `development` ou `production` — en dev, le signup peut sauter la confirmation email |
| `NEXT_PUBLIC_SUPABASE_URL` | URL de votre projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique (anon) Supabase |
| `OPENAI_API_KEY` | Clé API OpenAI (côté serveur uniquement) |

> **💡 Mode développement :** Mettez `NEXT_PUBLIC_APP_ENV=development` et désactivez la confirmation email dans le dashboard Supabase (`Authentication > Settings`) pour tester l'inscription sans email.

## 📜 Scripts

```bash
npm run dev        # Serveur de développement (Turbopack)
npm run build      # Build de production
npm run start      # Serveur de production
npm run lint       # Linting ESLint
npm run typecheck  # Vérification TypeScript
```

## 🚢 Déploiement sur Vercel

1. Connectez votre dépôt GitHub à [Vercel](https://vercel.com)
2. Configurez les variables d'environnement dans les paramètres du projet :
   - `NEXT_PUBLIC_APP_ENV=production`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
3. Le répertoire racine du projet est `Planigo` (à configurer dans les settings Vercel)
4. Chaque push sur `main` déclenche un déploiement automatique

## 📄 Licence

Ce projet est sous licence [MIT](./LICENSE).

---

Développé par [Divin Sogbadji](https://github.com/divinsogbadji)
