# PRD — Site Edegar Agostinho (Financiamento Coletivo + Loja)

## Problema Original
Criar um site profissional para o comediante Edegar Agostinho vender seus livros, com financiamento coletivo (apenas o admin pode postar), inspirado no fabricadohumor.com.br.

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
- [x] PIX manual com confirmacao pelo admin (Stripe removido)
- [x] Object Storage para imagens/videos
- [x] Live Streaming via WebSocket (camera/tela + OBS Virtual Camera)
- [x] Gravacoes de Lives & VOD
- [x] Sistema de Assinaturas/Planos
- [x] Controle de visibilidade (Publico, Privado, Assinantes)
- [x] Menu lateral dinamico
- [x] CORS dinamico para qualquer dominio
- [x] Deploy readiness (CORS env, APP_NAME env)
- [x] Configuracoes expandidas do site:
  - Identidade (nome, subtitulo, logo, icone, email, dominio)
  - Cores (10 campos de cor)
  - Textos (hero, subtitulo, marquee)
  - Menu de Navegacao (8 itens: home, campanhas, loja, bio, galeria, live, videos, assinatura)
  - Textos dos Botoes (hero principal/secundario, apoiar, pix)
  - Titulos das Secoes (campanhas, produtos, bio, galeria)
  - Rodape
  - Redes Sociais (Instagram, YouTube, TikTok, Twitter/X, Facebook)
- [x] WebSocket routes corrigidos com prefixo /api
- [x] Instrucoes OBS atualizadas (Virtual Camera)

## Backlog
### P1
- Nenhum pendente

### P2
- Melhorias de UX conforme feedback

## Credenciais Admin
- Ver `/app/memory/test_credentials.md`
