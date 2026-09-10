# Hlongwane Enterprise Backend

Backend API for the Hlongwane Enterprise device commerce platform.

## Stack

- Node.js
- TypeScript
- Koa
- Apollo GraphQL
- Prisma
- PostgreSQL / Supabase
- Supabase Auth
- Yarn

## Setup

```bash
cp .env.example .env
yarn install
yarn prisma:generate
yarn prisma:migrate --name init
yarn dev
```

API: `http://localhost:4000`

GraphQL: `http://localhost:4000/graphql`

Health: `http://localhost:4000/health`
