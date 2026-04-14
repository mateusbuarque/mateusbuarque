# PRD - Site Edegar Agostinho (Financiamento Coletivo + Loja)

## Problem Statement
Site profissional para o comediante Edegar Agostinho. Financiamento coletivo + loja online. Apenas admin pode postar.

## User Personas
- **Admin (mateusbpugli@gmail.com)**: Cria campanhas e produtos, gerencia conteudo
- **Comprador/Apoiador**: Cadastra com email+senha+telefone, compra produtos e apoia campanhas

## Architecture
- Frontend: React + Tailwind CSS (neo-brutalist)
- Backend: FastAPI + MongoDB
- Auth: JWT (admin + users)
- Payments: Stripe via emergentintegrations

## Implemented (14 Apr 2026)
### Iteration 1
- Full crowdfunding with campaigns CRUD (max 10), tiers, progress bar
- Admin dashboard, gallery, biography, newsletter
- Neo-brutalist design (Outfit + DM Sans, #FFDE00)
- Stripe checkout + 5% fee

### Iteration 2
- Admin credentials: mateusbpugli@gmail.com / Mateus Buarque 1101
- User registration with email + password + phone
- Products/store section (max 10 active products)
- Login required for buying/supporting
- Store page at /loja
- Support email in footer: mateusbuarquepugli@gmail.com

## Backlog
- [ ] Pix QR code via Stripe
- [ ] Email notifications for buyers
- [ ] Social sharing buttons
- [ ] Order history for users
- [ ] Campaign updates/comments
