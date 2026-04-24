# PRD — Site Edegar Agostinho (Financiamento Coletivo + Loja)

## Problema Original
Criar um site profissional para o comediante Edegar Agostinho vender seus livros, com financiamento coletivo (apenas o admin pode postar), inspirado no fabricadohumor.com.br.

## Requisitos Principais
- Pagamento via Pix manual com confirmacao pelo admin
- Campanhas de financiamento coletivo com metas, niveis de apoio e barra de progresso
- Loja normal para venda de produtos
- Area de administrador para gerenciar tudo
- Sistema de Live Streaming (OBS Studio) e upload de Videos
- Sistema de Assinaturas (Planos) para restringir acesso a conteudo
- Personalizacao avancada da UI pelo admin

## Stack Tecnica
- **Frontend**: React, Tailwind CSS (Neo-Brutalist), React Router
- **Backend**: FastAPI, Motor (Async MongoDB), WebSockets
- **DB**: MongoDB
- **Integracoes**: Emergent Object Storage (uploads), Resend (emails)

## O que foi implementado
- [x] Scaffold Full-Stack (FastAPI + React + MongoDB)
- [x] Autenticacao Admin & Usuario (JWT + Cookies)
- [x] CRUD Campanhas de Financiamento Coletivo
- [x] Loja de Produtos
- [x] PIX manual com confirmacao pelo admin
- [x] Object Storage para imagens/videos
- [x] Live Streaming (OBS Studio compativel)
- [x] Gravacoes de Lives & VOD
- [x] Sistema de Assinaturas/Planos
- [x] Controle de visibilidade de conteudo (Publico, Privado, Assinantes)
- [x] Menu lateral dinamico
- [x] Configuracoes basicas do site (cores, icone, labels)
- [x] CORS & Secure Cookie fixes para producao
- [x] Deploy readiness fixes (CORS env var, APP_NAME env var)
- [x] DynamicCORSMiddleware para suportar qualquer dominio
- [x] Remocao completa do Stripe - pagamento 100% PIX manual
- [x] Fluxo de comprovante por email (mateuabuarquepugli@gmail.com)
- [x] Status de pedido: "Aguardando confirmacao" / "Pagamento confirmado"
- [x] Admin confirma pagamentos manualmente no painel

## Backlog Priorizado
### P0
- [ ] Expandir Configuracoes do Site (identidade, cores, textos, menu, botoes)

### P1
- Nenhum pendente

### P2
- Melhorias de UX conforme feedback do usuario

## Credenciais Admin
- Ver `/app/memory/test_credentials.md`
