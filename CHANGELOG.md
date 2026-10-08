# Changelog

All notable changes to this package will be documented in this file.

This project follows semantic versioning.

## 0.3.0 - Unreleased

- Require EmDash `^1.2.0` and align Kumo with the admin's pinned `2.6.0`
  components and stylesheet. Updated development tools and the dependency lockfile.
- Raise the Node.js minimum to `22.18.0` for the upgraded EmDash/Vite+ toolchain.
- Isolate browser-safe value helpers so the admin bundle no longer imports
  server-only EmDash modules through the frontend renderer.
- Add Chromium interaction tests against the built admin entry and the real
  EmDash 1.2 stylesheet, with disposable light/dark screenshots for visual review.
- Run browser tests in CI and before publishing, retaining failure screenshots
  and traces. Check plugin registration against EmDash 1.2 and keep its version
  aligned with the package version.

## 0.2.2 - 2026-06-29

- Fixed layout builder normalization for invalid drafts, singleton rows and
  blocks, null holes, duplicate ids, and focused layout edits.
- Fixed row grid allocation so full-width fractional rows stay on one 12-column
  grid line, including near-one floating point totals.
- Improved fallback locale resolution for Bento admin messages.
- Updated the `@bnomei/emdash-blocks` peer and development dependency range to
  `^0.2.1`.

## 0.2.1 - 2026-06-18

- Updated the `@bnomei/emdash-blocks` peer and development dependency range to
  `^0.2.0`.

## 0.2.0 - 2026-06-18

- Added EmDash-shaped `i18n` options with `locale`, `defaultLocale`,
  `locales`, `fallback`, and `messages` for Bento layout editor copy.
- Added localized layout help text, empty states, add buttons, column labels,
  and layout/column menu tooltips.
- Exported the default Bento i18n catalog, message keys, and resolver helpers.

## 0.1.0 - 2026-06-12

- Initial public package setup for the `@bnomei/emdash-bento` EmDash field
  widget.
- Added the `bento:layouts` JSON field widget.
- Added runtime helpers for preparing visible layout rows and converting
  fractional spans to grid columns.
