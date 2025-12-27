# Contributing to Drop

We love your input! We want to make contributing to Drop as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Improving documentation

## Code of Conduct

This project adheres to the Contributor Covenant [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to security@ciphera.com.

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm, yarn, or pnpm
- A Supabase project (for testing)
- Git

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Drop.git
   cd Drop
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

4. **Run Database Schema**
   - Execute `supabase/schema.sql` in your Supabase SQL Editor (contains all migrations)

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Run Tests**
   ```bash
   npm test
   ```

## How to Contribute

### We Use [Github Flow](https://guides.github.com/introduction/flow/index.html)

All code changes happen through Pull Requests:

1. Fork the repo and create your branch from `main`
2. Make your changes
3. If you've added code that should be tested, add tests
4. Ensure the test suite passes (`npm test`)
5. Make sure your code lints (`npm run lint`)
6. Issue that pull request!

### Commit Messages

- Use clear and descriptive commit messages
- Start with a verb in the imperative mood (e.g., "Add", "Fix", "Update")
- Reference issues and PRs when relevant

Example:
```
Fix magic word resolution rate limiting

- Add stricter rate limits for resolve endpoint
- Improve error messages for exceeded limits
- Add Slack alerts for potential brute force attempts

Closes #123
```

### Code Style

- Follow the existing code style
- Use TypeScript for all new code
- Write self-documenting code with clear variable names
- Add comments for complex logic using Better Comments style:
  - `// *` for important notes
  - `// !` for warnings
  - `// ?` for questions
  - `// TODO:` for future improvements

### Testing

- Write unit tests for new functionality
- Ensure all tests pass before submitting PR
- Aim for good test coverage of critical paths
- Test security-sensitive code thoroughly

### Security Considerations

- **Never commit secrets or API keys**
- Always use environment variables for sensitive data
- Consider security implications of your changes
- Report security vulnerabilities privately to security@ciphera.com
- Validate and sanitize all user inputs
- Follow the principle of least privilege

### Documentation

- Update README.md if you change functionality
- Add JSDoc/TSDoc comments for public APIs
- Update CHANGELOG.md following [Keep a Changelog](https://keepachangelog.com/)
- Add migration files with clear descriptions

## Reporting Bugs

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md) when creating an issue. Include:

- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details (browser, OS, version)
- Screenshots if applicable

## Suggesting Features

Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md). Consider:

- How does this fit with Drop's privacy-first mission?
- Is this a breaking change?
- What are the security implications?

## Pull Request Process

1. **Update Documentation**: Ensure README, CHANGELOG, and code comments are updated
2. **Test Thoroughly**: All tests must pass
3. **Follow the Template**: Fill out the PR template completely
4. **One Feature Per PR**: Keep PRs focused and atomic
5. **Respond to Feedback**: Be responsive to review comments
6. **Squash Commits**: Clean up your commit history if requested

### PR Checklist

- [ ] Code follows the project style
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new linter warnings
- [ ] Security implications considered
- [ ] No sensitive data exposed
- [ ] Tests added and passing

## Development Tips

### Working with Database Schema

The complete database schema is in `supabase/schema.sql`. If you need to make schema changes:

1. Update `supabase/schema.sql` directly
2. Test your changes in a development Supabase project
3. Document the changes in your PR

### Testing Cleanup Jobs

```bash
curl -X POST http://localhost:3000/api/cleanup \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Debugging Email Notifications

Check your Resend dashboard for email logs and debugging information.

## Questions?

- Check the [FAQ](https://drop.ciphera.net/faq)
- Read the [Security documentation](https://drop.ciphera.net/security)
- Open a [discussion](https://github.com/ciphera-net/Drop/discussions)

## License

By contributing, you agree that your contributions will be licensed under the [GNU General Public License v3.0](LICENSE).

Thank you for contributing to Drop! 🎉

