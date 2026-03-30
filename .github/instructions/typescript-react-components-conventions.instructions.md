---
description: 'TypeScript coding standards for React components'
applyTo: '**/*.tsx, **/*.ts'
---

# TypeScript React Development

Use functional components with TypeScript interfaces for all props.

## Naming Conventions

- Component files: kebab-case (e.g., `user-profile.tsx`)
- Hook files: kebab-case with `use` prefix (e.g., `use-auth.ts`)
- Type files: kebab-case with descriptive names (e.g., `user-types.ts`)

## Component Structure

Always define prop interfaces explicitly:

```typescript
interface UserProfileProps {
	userId: string;
	onUpdate: (user: User) => void;
}

export function UserProfile({ userId, onUpdate }: UserProfileProps) {
	// Implementation
}
```
