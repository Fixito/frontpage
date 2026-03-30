---
description: 'React development best practices and patterns'
applyTo: '**/*.jsx, **/*.tsx'
---

# React Development Guidelines

Use functional components with hooks for all new components.

## State Management

- Use `useState` for local component state
- Use `useContext` for shared state across components
- Consider Zustand only for complex global state
- Avoid prop drilling beyond 2-3 levels
