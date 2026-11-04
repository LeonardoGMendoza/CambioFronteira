# CambioFronteira

**PT** · Comparador de casas de câmbio da Tríplice Fronteira (Ciudad del Este e Foz do Iguaçu), tipo Trivago: você diz quanto quer trocar e vê, da melhor para a pior, quanto recebe em cada casa. Tem um assistente de IA que responde por voz ("onde troco 2 mil reais por guaranis?") e espaço para anúncios e casas parceiras.
**ES** · Comparador de casas de cambio de la Triple Frontera, estilo Trivago, con asistente de IA por voz y espacio para anuncios y socios.
**EN** · Exchange-house comparison for the Triple Frontier (Trivago-style), with a voice AI assistant and room for ads and partners.

> ⚠️ Os dados de `backend/app/cambio_casas.json` são **de exemplo** (`"exemplo": true`). O app mostra um aviso até você colocar as cotações reais das casas parceiras.

## O que já faz

- Ranking das casas da melhor para a pior, com "você recebe", a taxa e quanto ganha a mais que a pior.
- Real, guarani, dólar e peso argentino, em qualquer direção (⇄ inverte).
- Filtro por cidade: Ciudad del Este / Foz do Iguaçu.
- **Propaganda (as mesmas do UniRideX)**: carrossel de parceiros (Enfermeira Feridas, Serenya Home Care, Doutor Feridas, "Seu negócio aqui") e cartões "Uniformes & Faculdades" (UCP jalecos azuis, UMAX uniformes vermelhos). Edite em `anuncios` no `cambio_casas.json` (tipo `banner` ou `promo`).
- Cartão "Patrocinado" e selo "Parceiro" nas casas parceiras. O ranking não muda por patrocínio: a melhor taxa continua em 1º (é isso que dá confiança ao usuário).
- **Cliques contados** (anúncio, WhatsApp, "como chegar"): é o número que você mostra ao vender a parceria (`GET /api/cliques`).
- **IA**: com as chaves da Oracle no `.env`, a IA explica a tabela em ES/PT/EN usando só os números dela (nunca inventa cotação). Sem IA, responde por regra.
- **Atendente 3D que fala** (a mesma técnica do StudentMedical/VinaCare: TalkingHead, boca sincronizada com a voz do aparelho). Toque em "Toque para conversar" para ela se apresentar; depois ela fala cada resposta.
- Voz: microfone (Chrome/Safari) e resposta falada.
- 3 idiomas: português, espanhol e inglês.

## Estrutura

```
web/                 site (HTML + JS puro, sem build) — funciona no GitHub Pages
  index.html          tela e estilo
  src/app.js          busca, ranking, anúncios, assistente e voz
  src/atendente.js    atendente 3D que fala
  src/talkinghead/    biblioteca TalkingHead (MIT) — igual ao StudentMedical
  avatars/avaturn.glb avatar 3D
  dados-exemplo.json  cópia dos dados para o modo demo (sem servidor)
backend/             API Python FastAPI
  app/cambio.py        ranking, leitura da pergunta, IA, cliques
  app/cambio_casas.json casas, cotações e anúncios (modelo)
  app/ia.py            IA da Oracle (mesma conta do VinaCare/StudentMedical)
  tests/test_cambio.py testes
```

## Rodar no PC

Site (modo demo, sem servidor):
```bash
cd web
python -m http.server 5500
# abra http://localhost:5500/?api=   (o "?api=" vazio força o modo demo)
```

Servidor:
```bash
cd backend
pip install -r requirements.txt
copy .env.example .env      # preencha CF_TOKEN e, se quiser IA, as chaves da Oracle
uvicorn app.main:app --reload --port 8000
# no site: http://localhost:5500/?api=http://localhost:8000
python -m unittest discover tests
```

## Atualizar a cotação de uma casa

```bash
curl -X PUT http://localhost:8000/api/casas/exemplo-cde-1 \
  -H "x-token: SEU_CF_TOKEN" -H "Content-Type: application/json" \
  -d '{"nome":"Nome real da casa","whatsapp":"595981000000","mapa":"https://maps.google.com/?q=...","parceiro":true,"exemplo":false,"cotacoes":{"BRL>PYG":1395,"USD>PYG":7320}}'
```
Taxa `"BRL>PYG": 1395` = 1 real vira 1.395 guaranis. Depois que as casas forem reais, mande `"exemplo": false` para o aviso sumir.

## API

| Método | Rota | O que faz |
| --- | --- | --- |
| GET | `/api/cambio?de=BRL&para=PYG&valor=1000&cidade=` | ranking |
| GET | `/api/casas` | casas, anúncios e se é exemplo |
| POST | `/api/perguntar` `{texto, idioma}` | assistente (IA ou regra) |
| POST | `/api/clique` `{tipo, id}` | conta clique em anúncio/casa |
| PUT | `/api/casas/{id}` (header `x-token`) | cria/atualiza casa e cotações |
| GET | `/api/cliques` (header `x-token`) | cliques para mostrar aos parceiros |

## Próximos passos

- Fechar as primeiras casas parceiras e trocar os dados de exemplo.
- Coletar cotações automaticamente (ideia: estudar o projeto open source [aVolpe/cotizacion](https://github.com/aVolpe/cotizacion), conferindo os termos de uso de cada site antes).
- Botão "ir até a casa" integrado ao UniRideX.
