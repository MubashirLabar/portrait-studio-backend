# Portrait Studio Backend

A Node.js backend API built with Express, PostgreSQL, and Prisma ORM.

## Features

- 🚀 Express.js web framework
- 🗄️ PostgreSQL database
- 🔷 Prisma ORM for database management
- 🔒 JWT authentication middleware
- 🛡️ Security middleware (Helmet, CORS)
- 📝 Request logging (Morgan)
- ✅ Input validation (Express Validator)
- 🏗️ Well-structured folder architecture

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. Clone the repository and navigate to the project directory

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Update the `.env` file with your database credentials:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/portrait_studio?schema=public"
```

5. Generate Prisma Client:
```bash
npm run prisma:generate
```

6. Run database migrations:
```bash
npm run prisma:migrate
```

## Project Structure

```
portrait-studio-backend/
├── prisma/
│   └── schema.prisma          # Prisma schema file
├── src/
│   ├── config/
│   │   └── database.js        # Database configuration
│   ├── controllers/           # Route controllers
│   │   └── example.controller.js
│   ├── middleware/            # Custom middleware
│   │   ├── auth.js           # Authentication middleware
│   │   └── errorHandler.js   # Error handling middleware
│   ├── routes/               # API routes
│   │   └── index.js          # Main routes file
│   ├── utils/                # Utility functions
│   │   └── response.js       # Response helpers
│   └── server.js             # Main server file
├── .env.example              # Environment variables template
├── .gitignore               # Git ignore file
├── package.json             # Project dependencies
└── README.md               # Project documentation
```

## Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with nodemon
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run prisma:seed` - Seed the database (if seed file exists)

## API Endpoints

### Health Check
- `GET /health` - Check server status

### API Base
- `GET /api` - API information

## Development

1. Start the development server:
```bash
npm run dev
```

2. The server will start on `http://localhost:3000` (or the PORT specified in `.env`)

3. Access Prisma Studio to manage your database:
```bash
npm run prisma:studio
```

## Database Management

### Creating a new migration
```bash
npm run prisma:migrate
```

### Viewing database in Prisma Studio
```bash
npm run prisma:studio
```

### Updating Prisma schema
1. Edit `prisma/schema.prisma`
2. Run `npm run prisma:migrate`
3. Prisma Client will be regenerated automatically

## Environment Variables

Make sure to set the following variables in your `.env` file:

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRES_IN` - JWT token expiration time

## Security

- Always change the `JWT_SECRET` in production
- Never commit `.env` files
- Use environment variables for sensitive data
- Keep dependencies updated

## License

ISC

# portrait-studio-backend
