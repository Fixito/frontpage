import { Link } from '@tanstack/react-router';
import { LogOut, Rss } from 'lucide-react';
import type { AuthUser, GuestSession } from '@/lib/session';
import { Button } from '@/components/ui/button';

interface DashboardHeaderProps {
	user: AuthUser | null;
	guest: GuestSession | null;
	onSignOut: () => void;
}

export function DashboardHeader({ user, guest, onSignOut }: DashboardHeaderProps) {
	return (
		<header className="border-border bg-background sticky top-0 z-50 flex h-14 items-center justify-between border-b px-6">
			<Link to="/" className="text-foreground flex items-center gap-2 font-bold">
				<Rss size={18} aria-hidden />
				Frontpage
			</Link>
			<div className="flex items-center gap-4">
				{guest && (
					<p className="text-muted-foreground text-sm">
						Browsing as guest — <Link to="/sign-up">Sign up to save your data</Link>
					</p>
				)}
				{user && <span className="text-muted-foreground text-sm">{user.email}</span>}
				<Button
					variant="outline"
					size="sm"
					onClick={onSignOut}
					title={guest ? 'Exit guest mode' : 'Sign out'}
				>
					<LogOut size={14} aria-hidden />
					{guest ? 'Exit' : 'Sign out'}
				</Button>
			</div>
		</header>
	);
}
