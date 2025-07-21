# CloudMemberHub Backend

A robust, multi-tenant Node.js REST API backend built with Service-Oriented Architecture (SOA), designed for scalable SaaS applications. Built with Express.js, MongoDB, and Mongoose.

## 🚀 Features

### Core Features
- **REST API**: Complete CRUD operations with tenant isolation
- **Multi-Tenancy**: Support for database, schema, and row-level isolation strategies
- **Service-Oriented Architecture (SOA)**: Clean separation of concerns with domain-driven design
- **MongoDB Integration**: Flexible document-based storage with Mongoose ODM
- **Authentication & Authorization**: JWT-based security with tenant-aware permissions
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Centralized error management
- **Rate Limiting**: API protection with tenant-specific limits
- **CORS Support**: Cross-origin resource sharing
- **Environment Configuration**: Flexible environment management
- **Logging**: Comprehensive request and error logging

### Multi-Tenant Features
- **Tenant Isolation**: Multiple isolation strategies (database, schema, row-level)
- **Tenant Management**: Complete tenant lifecycle management
- **Subscription Management**: Plan-based feature and limit management
- **Usage Tracking**: Monitor and enforce tenant-specific limits
- **Custom Domains**: Support for subdomains and custom domains
- **Tenant-Specific Configuration**: Customizable settings per tenant

### SOA Features
- **Domain-Driven Design**: Clean separation of domain, application, infrastructure layers
- **Dependency Injection**: Service container with automatic dependency resolution
- **Repository Pattern**: Consistent data access layer with tenant awareness
- **Service Layer**: Business logic encapsulation
- **Use Cases**: Application-specific business rules
- **Event-Driven**: Support for domain events and messaging

## 🛠 Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **ODM**: Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi / express-validator
- **Testing**: Jest & Supertest
- **Code Quality**: ESLint & Prettier
- **Process Management**: PM2 (production)

## 📁 Project Structure (SOA + Multi-Tenant)

```
cloudMemeberHub-Backend/
├── src/
│   ├── domain/                    # Domain Layer (Business Logic)
│   │   ├── entities/             # Domain entities and models
│   │   │   ├── BaseEntity.js     # Base entity with multi-tenant support
│   │   │   ├── User.js           # User entity
│   │   │   └── Member.js         # Member entity
│   │   ├── repositories/         # Repository interfaces
│   │   │   ├── TenantRepository.js
│   │   │   ├── UserRepository.js
│   │   │   └── MemberRepository.js
│   │   ├── services/            # Domain services
│   │   │   ├── TenantService.js
│   │   │   ├── UserService.js
│   │   │   └── MemberService.js
│   │   ├── valueObjects/        # Value objects
│   │   └── events/              # Domain events
│   ├── application/             # Application Layer
│   │   ├── useCases/           # Application use cases
│   │   ├── dtos/               # Data Transfer Objects
│   │   ├── interfaces/         # Application interfaces
│   │   └── handlers/           # Command/Query handlers
│   ├── infrastructure/         # Infrastructure Layer
│   │   ├── database/           # Database implementations
│   │   │   └── TenantAwareRepository.js
│   │   ├── external/           # External service integrations
│   │   ├── messaging/          # Message queues, events
│   │   ├── logging/            # Logging implementations
│   │   ├── cache/              # Caching implementations
│   │   └── container/          # Dependency injection setup
│   │       └── serviceRegistration.js
│   ├── presentation/           # Presentation Layer
│   │   ├── controllers/        # HTTP controllers
│   │   ├── middleware/         # HTTP middleware
│   │   └── validators/         # Request validators
│   ├── tenant/                 # Multi-Tenant Components
│   │   ├── context/           # Tenant context management
│   │   │   └── TenantContext.js
│   │   ├── middleware/        # Tenant middleware
│   │   │   └── tenantMiddleware.js
│   │   ├── resolver/          # Tenant resolution logic
│   │   │   └── TenantResolver.js
│   │   └── models/            # Tenant models
│   │       └── Tenant.js
│   ├── shared/                # Shared Components
│   │   ├── constants/         # Application constants
│   │   ├── utils/             # Utility functions
│   │   │   └── logger.js
│   │   ├── interfaces/        # Shared interfaces
│   │   │   ├── IRepository.js
│   │   │   └── IService.js
│   │   ├── types/             # Type definitions
│   │   └── container/         # Service container
│   │       └── ServiceContainer.js
│   ├── config/                # Configuration
│   │   ├── database.js        # Database configuration
│   │   └── environment.js     # Environment configuration
│   ├── routes/                # API routes
│   │   └── index.js
│   └── app.js                 # Express application setup
├── tests/                     # Test files
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── docs/                      # Documentation
├── scripts/                   # Build and deployment scripts
├── .env.example              # Environment variables template
├── .gitignore
├── .eslintrc.json
├── .prettierrc
├── jest.config.js
├── package.json
└── server.js                 # Application entry point
```

## ⚙️ Installation & Setup

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### 1. Clone the repository

```bash
git clone <repository-url>
cd cloudMemeberHub-Backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Setup

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Configure your `.env` file:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
API_VERSION=v1

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/cloudmemberhub
MONGODB_TEST_URI=mongodb://localhost:27017/cloudmemberhub_test

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=30d

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log
```

### 4. Start the server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## 🧪 Testing

Run all tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Run tests with coverage:
```bash
npm run test:coverage
```

## 📋 Available Scripts

- `npm start` - Start the server in production mode
- `npm run dev` - Start the server in development mode with nodemon
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm run format` - Format code with Prettier
- `npm run build` - Build the application (if using TypeScript)

## 🌐 API Documentation

### Base URL
```
http://localhost:5000/api/v1
```

### Multi-Tenant API Usage

#### Tenant Resolution Strategies

**1. Header-based (Default)**
```bash
curl -H "X-Tenant-ID: tenant1" \
     -H "Authorization: Bearer <token>" \
     http://localhost:5000/api/v1/users
```

**2. Subdomain-based**
```bash
curl -H "Authorization: Bearer <token>" \
     http://tenant1.localhost:5000/api/v1/users
```

**3. Path-based**
```bash
curl -H "Authorization: Bearer <token>" \
     http://localhost:5000/api/tenant1/v1/users
```

#### Tenant Management
```bash
# Create a new tenant
POST /api/v1/tenants
{
  "tenantId": "company123",
  "tenantName": "Company 123",
  "domain": {
    "subdomain": "company123"
  },
  "contact": {
    "primaryContact": {
      "name": "John Doe",
      "email": "john@company123.com"
    }
  },
  "subscription": {
    "plan": "standard"
  }
}

# Get tenant information
GET /api/v1/tenants/company123

# Update tenant
PUT /api/v1/tenants/company123

# Get tenant usage statistics
GET /api/v1/tenants/company123/usage
```

### Authentication
All protected routes require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

For multi-tenant requests, also include tenant identification:
```
X-Tenant-ID: <tenant-id>
Authorization: Bearer <your-jwt-token>
```

### Endpoints

#### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/logout` - User logout
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password

#### Users
- `GET /users` - Get all users (Admin only)
- `GET /users/profile` - Get current user profile
- `PUT /users/profile` - Update current user profile
- `DELETE /users/profile` - Delete current user account

#### Members
- `GET /members` - Get all members
- `POST /members` - Create a new member
- `GET /members/:id` - Get member by ID
- `PUT /members/:id` - Update member by ID
- `DELETE /members/:id` - Delete member by ID

### Response Format

All API responses follow this format:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Error responses:
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error information",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🔧 Development Guidelines

### Code Style
- Use ESLint and Prettier for consistent code formatting
- Follow camelCase naming convention for variables and functions
- Use PascalCase for class names and constructors
- Write descriptive commit messages

### Git Workflow
1. Create feature branches from `main`
2. Write meaningful commit messages
3. Create pull requests for code review
4. Ensure all tests pass before merging

### Commit Message Format
```
type(scope): description

Examples:
feat(auth): add JWT authentication
fix(user): resolve profile update issue
docs(readme): update installation guide
```

## 📝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Pull Request Guidelines
- Ensure your code follows the project's coding standards
- Write clear, descriptive pull request titles and descriptions
- Include tests for new features
- Update documentation as needed
- Ensure all CI checks pass

## 🚨 Error Handling

The application uses centralized error handling with custom error classes:

- `ValidationError` - Input validation errors (400)
- `UnauthorizedError` - Authentication errors (401)
- `ForbiddenError` - Authorization errors (403)
- `NotFoundError` - Resource not found (404)
- `ConflictError` - Resource conflicts (409)
- `InternalServerError` - Server errors (500)

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting to prevent abuse
- Input validation and sanitization
- CORS configuration
- Security headers with helmet
- Environment variable protection

## 📊 Monitoring & Logging

- Request/response logging with Morgan
- Error logging with Winston
- Health check endpoint: `GET /health`
- Performance monitoring capabilities

## 🐳 Docker Support

Build and run with Docker:

```bash
# Build image
docker build -t cloudmemberhub-backend .

# Run container
docker run -p 5000:5000 --env-file .env cloudmemberhub-backend
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Support

For support, email support@cloudmemberhub.com or create an issue in the repository.

## 📈 Roadmap

- [ ] GraphQL API support
- [ ] Real-time features with Socket.io
- [ ] Microservices architecture
- [ ] API versioning strategy
- [ ] Comprehensive API documentation with Swagger
- [ ] Performance optimization
- [ ] Advanced caching strategies