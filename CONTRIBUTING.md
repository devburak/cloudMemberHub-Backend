# Contributing to CloudMemberHub Backend

We love your input! We want to make contributing to CloudMemberHub Backend as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### Branch Naming Convention

- `main` - Production ready code
- `develop` - Development branch for integration
- `feature/[feature-name]` - New features
- `bugfix/[bug-name]` - Bug fixes
- `hotfix/[fix-name]` - Critical fixes for production
- `docs/[doc-name]` - Documentation updates
- `refactor/[component-name]` - Code refactoring
- `test/[test-name]` - Adding or updating tests

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to our CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files

**Examples:**
```
feat(auth): add JWT refresh token functionality
fix(user): resolve profile update validation error
docs(readme): update installation instructions
style(controller): fix indentation in user controller
refactor(service): extract common validation logic
test(auth): add unit tests for login functionality
```

## Pull Request Process

1. **Fork the repository** and create your branch from `main` or `develop`
2. **Install dependencies**: `npm install`
3. **Make your changes** following our coding standards
4. **Add tests** for any new functionality
5. **Run the test suite**: `npm test`
6. **Run linting**: `npm run lint`
7. **Format your code**: `npm run format`
8. **Update documentation** if needed
9. **Create a pull request** using our PR template

### Pull Request Requirements

- [ ] PR title follows conventional commits format
- [ ] All tests pass (`npm test`)
- [ ] Code follows style guidelines (`npm run lint`)
- [ ] Code is properly formatted (`npm run format`)
- [ ] New functionality includes tests
- [ ] Documentation is updated if necessary
- [ ] PR description is filled out completely
- [ ] Breaking changes are clearly documented

### Code Review Process

1. **Automated checks** must pass (CI/CD pipeline)
2. **At least one review** from a maintainer required
3. **All conversations resolved** before merging
4. **Squash and merge** preferred for feature branches
5. **Linear history** maintained on main branch

## Coding Standards

### JavaScript Style Guide

We use ESLint with Airbnb configuration and Prettier for code formatting.

**Key principles:**
- Use `const` and `let`, avoid `var`
- Use arrow functions where appropriate
- Use template literals for string interpolation
- Use destructuring when it improves readability
- Use meaningful variable and function names
- Write self-documenting code
- Add comments for complex logic

### File Structure

- **Controllers**: Handle HTTP requests and responses
- **Services**: Business logic and data manipulation
- **Models**: Mongoose schemas and model definitions
- **Routes**: API route definitions
- **Middleware**: Custom middleware functions
- **Utils**: Utility functions and helpers
- **Config**: Configuration files
- **Validations**: Input validation schemas

### Error Handling

- Use custom error classes
- Always handle async/await with try/catch
- Return consistent error responses
- Log errors appropriately
- Don't expose internal errors to clients

### Database Guidelines

- Use Mongoose for MongoDB operations
- Define proper schemas with validation
- Use indexes for frequently queried fields
- Handle database errors gracefully
- Use transactions for multi-document operations

### Testing Guidelines

- Write unit tests for all business logic
- Write integration tests for API endpoints
- Use meaningful test descriptions
- Mock external dependencies
- Aim for high test coverage (>80%)
- Use setup and teardown appropriately

### Security Guidelines

- Validate all user inputs
- Use parameterized queries
- Implement proper authentication/authorization
- Sanitize data before database operations
- Use HTTPS in production
- Never commit secrets or keys
- Follow OWASP security guidelines

## Bug Reports

Great Bug Reports tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Feature Requests

We love feature requests! Please provide:

- **Problem Statement**: What problem does this solve?
- **Proposed Solution**: How should we solve it?
- **Alternatives Considered**: What other approaches did you consider?
- **Use Cases**: When would this be used?
- **Implementation Details**: Any technical considerations?

## Development Setup

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Git

### Local Development

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Copy environment file: `cp .env.example .env`
4. Configure your `.env` file
5. Start development server: `npm run dev`
6. Run tests: `npm test`

### Environment Configuration

Required environment variables:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cloudmemberhub
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
```

### Available Scripts

- `npm run dev` - Start development server with nodemon
- `npm test` - Run test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix linting errors
- `npm run format` - Format code with Prettier

## Release Process

1. **Version bumping**: Use semantic versioning (semver)
2. **Changelog**: Update CHANGELOG.md with new changes
3. **Tag release**: Create git tag with version number
4. **Deploy**: Automated deployment after tag creation

## Questions?

Feel free to open an issue for any questions about contributing!

## License

By contributing, you agree that your contributions will be licensed under the MIT License.