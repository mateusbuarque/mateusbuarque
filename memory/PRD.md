# PRD - Site Edegar Agostinho

## Architecture
- Frontend: React + Tailwind (neo-brutalist)
- Backend: FastAPI + MongoDB
- Auth: JWT (admin + users with phone)
- Payments: Stripe (card)
- Email: Resend (log mode until key added)

## Implemented

### Iteration 1 (14 Apr 2026)
- Crowdfunding with campaigns CRUD (max 10), tiers, progress bar
- Admin dashboard, gallery, biography, newsletter
- Stripe checkout + 5% fee

### Iteration 2
- Admin: mateusbpugli@gmail.com / Mateus Buarque 1101
- User registration with email + password + phone
- Products/store section (max 10)
- Login required for buying/supporting

### Iteration 3
- Purchase history at /meus-pedidos
- Admin full site customization (name, logo, colors, hero text, marquee, support email)
- Email notifications (LOG mode - add RESEND_API_KEY to .env for real emails)
- Dynamic site settings applied across all pages

## Backlog
- [ ] Add RESEND_API_KEY for real email notifications
- [ ] Social sharing buttons
- [ ] Campaign updates/comments
- [ ] PDF receipts
