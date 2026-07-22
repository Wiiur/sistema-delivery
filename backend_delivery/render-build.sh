#!/usr/bin/env bash
# exit on error
set -o errexit

npm install

# Instala as dependências necessárias para o Puppeteer (Chrome) rodar no Linux do Render
npx puppeteer browsers install chrome