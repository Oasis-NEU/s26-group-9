# Oasis - Productivity Task Management Application

A modern, full-stack web application for task management, productivity tracking, and social collaboration. Built with React, Vite, and Supabase.

**🚀 Live Site**: [https://productivi-tea.netlify.app/](https://productivi-tea.netlify.app/)

## Features

### Core Functionality
- **Task Management**: Create, track, and organize tasks with due dates and priorities
- **Dashboard**: Centralized hub with task overview, focus tracking, and activity summary
- **Deadline Reminders**: Automatic notifications for tasks due within 24 hours, with persistent state
- **Activity Panel**: Real-time tracking of task sessions and productivity metrics
- **Inbox**: Unified notification center for task reminders, nudges, and friend requests

### Social Features
- **Friend System**: Connect with other users, send/receive friend requests with toggle functionality
- **Friend Sidebar**: Browse friend activity, view friend profiles and sessions
- **Activity Tracking**: Share work sessions and see friend activity in real-time

### User Profile
- **Settings Management**: Customize notification preferences with persistent localStorage + Supabase synchronization
- **Session Tracking**: Monitor productivity sessions and time spent on tasks
- **Status Indicator**: Set online status (working, on break, idle, offline)

## Tech Stack

### Frontend
- **Framework**: React 19.2.0 with React Router 7.13.1
- **Build Tool**: Vite with rolldown-vite 7.2.5
- **Styling**: MUI 7.3.8, Emotion CSS-in-JS
- **UI Components**: FontAwesome icons, Lucide React icons
- **Data Visualization**: Recharts 3.8.1
- **Linting**: ESLint 9.39.1

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime subscriptions

### Performance
- **Bundle Optimization**: Manual Vite chunk splitting (react-vendor, charts-vendor, supabase-vendor, ui-vendor)
- **Code Splitting**: Lazy-loaded Dashboard component
- **Caching**: Optimized vendor chunks for browser cache reuse

## Installation

### Prerequisites
- Node.js 18+ and npm 9+
- Supabase account with configured PostgreSQL database

### Setup
1. Clone the repository:
```bash
git clone <repository-url>
cd react-appp
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env.local` file with:
```
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

4. Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## 🚀 Development

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build optimized production bundle |
| `npm run lint` | Run ESLint to check code quality (0 errors/warnings) |
| `npm run test` | Run lint as deployment gate |
| `npm run preview` | Preview production build locally |

### Development Notes
- HMR (Hot Module Replacement) enabled for instant feedback
- Strict ESLint rules configured for code quality
- All linting checks pass with zero errors/warnings
- Async-wrapped effect calls to prevent setState-in-effect issues

## 📁 Project Structure

```
src/
├── pages/              # Route-level components
│   ├── dashboard.jsx        # Main app hub (task mgmt, reminders, nudges)
│   ├── inbox.jsx           # Unified notification center
│   ├── settings.jsx        # User preferences & profile
│   ├── FriendSidebar.jsx   # Friend discovery & management
│   ├── overview.jsx        # Stats, focus tracking, time breakdown
│   ├── activitypanel.jsx   # Session and activity tracking
│   ├── log-in.jsx          # Authentication
│   ├── signup.jsx          # Account creation
│   └── ...                 # Additional pages
├── hooks/
│   └── useAppData.js       # Shared data fetching hook
├── lib/
│   └── supabase.js         # Supabase client configuration
├── App.jsx                 # Main app component
├── main.jsx                # React entry point
└── assets/                 # Images, fonts, static files
```

## 🔑 Key Architecture Decisions

### State Management
- **localStorage + Supabase**: Notification preferences persist locally for instant feedback, synced to Supabase
- **React Context + Props**: Simple, predictable state flow through component hierarchy
- **useAppData Hook**: Centralized async data fetching with schema-safe fallbacks

### Database Resilience
- **Query Fallbacks**: Graceful degradation when schema columns missing (e.g., due_time field)
- **Periodic Polling**: 60-second refresh intervals for inbox notifications
- **Dual-layer Persistence**: localStorage immediate sync + Supabase best-effort background sync

### UI/UX
- **CSS Pseudo-elements**: Unread notification indicators using ::before accent stripes
- **Modal Dialogs**: Deadline reminders as non-blocking popups with "Mark as Read" and "Open Inbox" actions
- **Friend Toggle**: Same button for request/unrequest with intelligent state detection

### Performance
- **Vendor Chunk Splitting**: 5 isolated vendor chunks reduce entry bundle to ~24 kB, dashboard to ~112 kB
- **Lazy Loading**: Dashboard component loaded on demand
- **Route-based Code Splitting**: Separate bundles for auth pages vs. app pages

## ✅ Deployment Readiness

This application has been thoroughly audited and optimized for production:

- ✅ All ESLint checks pass (0 errors, 0 warnings)
- ✅ Production build validated and optimized
- ✅ Notification system fully functional (persistent, scheduled, modal alerts)
- ✅ Friend system toggleable and reliable
- ✅ Bundle performance optimized with vendor chunk splitting
- ✅ Database queries include schema-safe fallbacks
- ✅ All runtime functions defined and tested
- ✅ localStorage + Supabase persistence working

### Deployment Checklist
- [ ] Configure production Supabase environment variables
- [ ] Run `npm run test` to verify lint gate passes
- [ ] Run `npm run build` to generate optimized bundle
- [ ] Deploy build output to hosting platform (Vercel, Netlify, etc.)
- [ ] Verify deadline reminders pop up within 24 hours of task due date
- [ ] Test friend request toggle functionality
- [ ] Confirm notification preference persistence across page reloads

## 🐛 Known Patterns & Troubleshooting

### Deadline Reminders Not Displaying
- Check that task `due_time` is set and within 24 hours
- Verify localStorage key: `${username}_taskReminderRead`
- Confirm inbox refresh is running (60-second intervals)

### Notification Settings Not Persisting
- Ensure localStorage is enabled in browser
- Verify Supabase `notification_settings` table exists
- Check username-prefixed localStorage keys are readable

### Friend Request Issues
- Confirm friendships table relationships (user_id → friend_id directionality)
- Friend unrequest uses same button as request (checks existing friendship status)
- Outgoing friend requests can be canceled by pressing request button again

## 📄 Database Schema Notes

Key tables referenced by this application:
- `tasks`: Task definitions with due dates
- `sessions`: Work session tracking
- `friendships`: User relationships (with status: pending, accepted)
- `notification_settings`: User notification preferences
- `task_reminders`: Deadline reminder tracking

## 🤝 Contributing

When making changes:
1. Run `npm run lint` before committing to ensure code quality
2. Test all notification features work as expected
3. Verify friend system toggles correctly
4. Check localStorage persistence for settings

## 📝 License

[Add license information here]

## 📧 Support

For issues or questions, please contact the development team or create an issue in the repository.
