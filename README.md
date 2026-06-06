# Autobody Quote App

A Node.js + Express app for generating autobody repair quotations from damage photos and selected repair items.

## Setup

1. Open `C:\Users\Aceson\autobody-quote-app` in VS Code.
2. Run `npm install`.
3. Run `npm start`.
4. Open `http://localhost:3000` in your browser.

## Features

- Upload a damage photo and preview it immediately.
- Select multiple damage items and assign a severity level for each.
- Get a quote breakdown with subtotal, labor cost, and total estimate.
- Save recent quotes in browser storage so you can review them later.

## Notes

- The quote is calculated on the server using regional factors and severity adjustments.
- The app is designed for Secunda-area dealerships and surrounding used-car repairs.
- Use `npm run dev` to launch the server with `nodemon` for active development.
