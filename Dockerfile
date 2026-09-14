FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache \
    openssl \
    libc6-compat

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY prisma ./prisma

RUN yarn prisma generate

COPY . .

ENV NODE_ENV=production

EXPOSE 1337

CMD ["yarn", "start"]