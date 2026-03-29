import { Link } from '@tanstack/react-router';
import { LogOut, Rss } from 'lucide-react';
import type { AuthUser } from '@/lib/session';
import { Button } from '@/components/ui/button';

interface DashboardHeaderProps {
	user: AuthUser | null;
	isGuest: boolean;
	onSignOut: () => void;
}

export function DashboardHeader({ user, isGuest, onSignOut }: DashboardHeaderProps) {
	return (
		<header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background px-6">
			<Link to="/" className="flex items-center gap-2 font-bold text-foreground">
				<Rss size={18} aria-hidden />
				Frontpage
			</Link>
			<div className="flex items-center gap-4">
				{isGuest && (
					<p className="text-sm text-muted-foreground">
						Browsing as guest — <Link to="/sign-up">Sign up to save your data</Link>
					</p>
				)}
				{user && <span className="text-sm text-muted-foreground">{user.email}</span>}
				<Button
					variant="outline"
					size="sm"
					onClick={onSignOut}
					title={isGuest ? 'Exit guest mode' : 'Sign out'}
				>
					<LogOut size={14} aria-hidden />
					{isGuest ? 'Exit' : 'Sign out'}
				</Button>
			</div>
		</header>
	);
}
