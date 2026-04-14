# PRD - Site Edegar Agostinho (Financiamento Coletivo)

## Problem Statement
Site profissional para o comediante Edegar Agostinho vender seus livros via financiamento coletivo. Apenas admin pode postar. Inspirado em fabricadohumor.com.br.

## User Personas
- **Admin (Edegar)**: Cria campanhas, gerencia conteúdo, acompanha arrecadação
- **Visitante/Apoiador**: Navega campanhas, apoia com Pix/cartão, recebe livros

## Core Requirements
- Até 10 campanhas simultâneas ativas
- Admin define valor, data e recompensas por campanha
- TODAS campanhas entregam produto ao comprador mesmo se R$0 arrecadado
- Plataforma cobra 5% do valor final
- Pagamento via Stripe (cartão + Pix)
- Biografia, galeria, newsletter

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI (neo-brutalist design)
- **Backend**: FastAPI + MongoDB
- **Auth**: JWT admin-only
- **Payments**: Stripe via emergentintegrations

## What's Implemented (14 Apr 2026)
- Full backend with campaigns CRUD, auth, payments, newsletter, gallery, bio
- Full frontend with Home, Campaign Detail, Admin Login, Admin Dashboard, Payment flow
- Neo-brutalist design (Outfit + DM Sans fonts, #FFDE00 primary)
- Stripe checkout integration with 5% fee calculation
- Marquee strip, responsive design
- Admin dashboard with stats, campaign management, gallery, bio, newsletter tabs
- 3 book covers integrated (Zumbi, Pohi, Histórias)

## P0 - Done
- [x] Admin auth
- [x] Campaign CRUD (max 10)
- [x] Stripe payment flow
- [x] 5% fee logic
- [x] Homepage with hero, campaigns, bio, gallery, newsletter
- [x] Campaign detail with tiers

## P1 - Backlog
- [ ] Pix QR code generation (currently card-only via Stripe)
- [ ] Email notifications for backers
- [ ] Social sharing buttons
- [ ] Campaign updates/comments

## P2 - Nice to Have
- [ ] PDF receipts
- [ ] Backer dashboard
- [ ] Campaign analytics charts
