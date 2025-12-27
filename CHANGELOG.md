# Changelog

All notable changes to Drop will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial open source release
- End-to-end encryption with AES-256-GCM
- Magic word file sharing system
- Password-protected uploads
- Download limits and expiration times
- User verification system
- File request feature for receiving files securely
- Email notifications with PGP encryption support
- SimpleLogin integration for privacy-focused email aliases
- User dashboard for managing uploads and requests
- Session management
- Rate limiting for abuse prevention
- Performance optimizations with database indexing

### Security
- Implemented secure storage policies with RLS
- Added rate limiting to prevent brute force attacks
- User verification required for critical actions
- Secure burn-after-download functionality

### Infrastructure
- Automated cleanup jobs for expired files
- Storage monitoring and alerts
- Database migrations consolidated into single schema file

## [0.1.0] - 2024-XX-XX

### Added
- Initial release of Drop file sharing service

---

<!-- 
## Template for Future Releases

## [X.Y.Z] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes in existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security improvements
-->
