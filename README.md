# rudaki_market_project

**RUDAKI MARKET** — мағозаи онлайни озуқаворӣ барои ноҳияи Рӯдакӣ (Тоҷикистон). Аксари мизоҷон аз телефон истифода мебаранд; ҳадаф — то 2 000 000 мол.

## Қисмҳо

| Папка | Технология | Порт (development) |
|---|---|---|
| `backend/` | .NET 10, ASP.NET Core minimal API, EF Core 10, PostgreSQL 18 (Clean Architecture) | http://localhost:5080 |
| `frontend/` | Next.js 16 (App Router), React 19, Tailwind CSS 4 — сайт бо 4 забон (tg/ru/en/uz) | http://localhost:3123 |
| `admin/` | React 19 + Vite + Tailwind — панели админ (молҳо, категорияҳо, фармоишҳо) | http://localhost:5173 |
| `readme/PROGRESS.md` | Дафтари пурраи ҳамаи корҳо (қадам ба қадам) | — |

## Имкониятҳо

- Каталог, ҷустуҷӯ (бе ҳарфҳои махсуси тоҷикӣ ҳам: «чои», «кахва»), тартиб ва филтри нарх, саҳифаи мол
- Даромад бо рақами телефон (SMS), писандида, сабад, фармоиш ба WhatsApp-и мағоза
- Таърихи фармоишҳо, ҳолати фармоиш, «Боз харидан»
- Харитаи ноҳияи Рӯдакӣ: минтақаҳои расонидан, «Ҷои ман», роҳ ва вақт
- Админ: молҳо (коркарди худкори суратҳо), категорияҳо, фармоишҳо бо огоҳии овозӣ

## Сар кардан (development)

```bash
# 1. PostgreSQL 18 (порт 5434) — сар кардашуда
# 2. Сирҳо (паролҳо) — танҳо дар dotnet user-secrets, НЕ дар git:
#    ConnectionStrings:Default, Admin:InitialUsername, Admin:InitialPassword,
#    Auth:OtpSecret, Site:RevalidateSecret, Orders:CallMeBotApiKey
cd backend  && dotnet run --project src/RudakiMarket.Api      # → :5080 (миграцияҳо худкор)
cd admin    && npm install && npm run dev                     # → :5173
cd frontend && npm install && npx next dev -p 3123            # → :3123
```

`frontend/.env.local` (дар git нест): `API_URL`, `NEXT_PUBLIC_API_URL`, `REVALIDATE_SECRET`.

Суратҳои боршуда (`backend/src/RudakiMarket.Api/wwwroot/uploads/`) ва база дар git нестанд — нусхаи эҳтиётии онҳо алоҳида гирифта мешавад.
