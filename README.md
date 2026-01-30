# TradeCore - Enterprise E-Commerce API

🚀 **Live Demo:** https://tradecore-api.onrender.com  
📚 **API Documentation:** https://tradecore-api.onrender.com/api/docs

Enterprise-grade headless e-commerce API built with NestJS, PostgreSQL, and Prisma.

## 🌐 Deployment

- **Backend:** Render.com
- **Database:** Supabase (PostgreSQL)
- **Region:** Europe (Frankfurt)

## 🔗 Quick Links

- [Live API](https://tradecore-api.onrender.com)
- [Swagger Docs](https://tradecore-api.onrender.com/api/docs)
- [Supabase Dashboard](https://supabase.com/dashboard)

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)

Modern, scalable, and secure headless e-commerce API platform built with production-ready architecture.

## 🚀 Features

- ✅ **Authentication System** - JWT-based auth with role management
- ✅ **Database Management** - PostgreSQL with Prisma ORM
- ✅ **API Documentation** - Auto-generated Swagger docs
- ✅ **Validation** - DTO-based request validation
- ✅ **Security** - Password hashing, JWT guards, CORS
- 🔄 **Product Management** (Coming Soon)
- 🔄 **Order System** (Coming Soon)
- 🔄 **Admin Panel** (Coming Soon)

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| NestJS | Backend framework |
| TypeScript | Programming language |
| PostgreSQL | Database |
| Prisma | ORM |
| Passport.js | Authentication |
| JWT | Token management |
| Swagger | API documentation |
| Docker | Containerization |

## 📦 Installation

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- npm or yarn

### Setup
```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/tradecore-ecommerce-api.git
cd tradecore-ecommerce-api/backend

# Install dependencies
npm install

# Start PostgreSQL
docker-compose up -d

# Run migrations
npx prisma migrate dev

# Start development server
npm run start:dev
```

## 🔑 Environment Variables

Create `.env` file:
```env
DATABASE_URL="postgresql://tradecore:tradecore123@localhost:5432/tradecore_db"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="15m"
```

## 📚 API Documentation

After starting the server, visit:
```
http://localhost:3000/api/docs
```

## 🧪 Testing Endpoints

### Register User
```bash
POST /auth/register
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Login
```bash
POST /auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

### Get Profile (Protected)
```bash
GET /auth/profile
Headers: Authorization: Bearer <your_token>
```
