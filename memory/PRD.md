# PRD — Site Edegar Agostinho (Financiamento Coletivo + Loja)

## Problema Original
Criar um site profissional para o comediante Edegar Agostinho vender seus livros, com financiamento coletivo (apenas o admin pode postar), inspirado no fabricadohumor.com.br.

## Requisitos Principais
- Pagamento via Pix (direto para o admin) e Cartão de Crédito (Stripe)
- Campanhas de financiamento coletivo com metas, níveis de apoio e barra de progresso
- Loja normal para venda de produtos
- Área de administrador para gerenciar tudo
- Sistema de Live Streaming (OBS Studio) e upload de Vídeos
- Sistema de Assinaturas (Planos) para restringir acesso a conteúdo
- Personalização avançada da UI pelo admin

## Stack Técnica
- **Frontend**: React, Tailwind CSS (Neo-Brutalist), React Router, Shadcn/UI
- **Backend**: FastAPI, Motor (Async MongoDB), WebSockets
- **DB**: MongoDB
- **Integrações**: Stripe (pagamentos), Emergent Object Storage (uploads), Resend (emails)

## O que foi implementado
- [x] Scaffold Full-Stack (FastAPI + React + MongoDB)
- [x] Autenticação Admin & Usuário (JWT + Cookies)
- [x] CRUD Campanhas de Financiamento Coletivo
- [x] Loja de Produtos
- [x] Integração Stripe + PIX manual
- [x] Object Storage para imagens/vídeos
- [x] Live Streaming (OBS Studio compatível)
- [x] Gravações de Lives & VOD
- [x] Sistema de Assinaturas/Planos
- [x] Controle de visibilidade de conteúdo (Público, Privado, Assinantes)
- [x] Menu lateral dinâmico
- [x] Configurações básicas do site (cores, ícone, labels)
- [x] CORS & Secure Cookie fixes para produção
- [x] Deploy readiness fixes (CORS env var, APP_NAME env var)
- [x] DynamicCORSMiddleware para suportar qualquer domínio (produção/preview/customizado)

## Backlog Priorizado
### P0
- [ ] Expandir Configurações do Site (identidade, cores, textos, menu, botões)

### P1
- Nenhum pendente

### P2
- Melhorias de UX conforme feedback do usuário
- Domínio customizado

## Credenciais Admin
- Ver `/app/memory/test_credentials.md`
