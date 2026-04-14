import { Outlet, createFileRoute } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { TooltipProvider } from '@/components/ui/tooltip';

const queryClient = new QueryClient();

export const Route = createFileRoute('/_app')({
	component: AppLayout,
});

function AppLayout() {
	return (
		<QueryClientProvider client={queryClient}>
			<TooltipProvider>
				<Outlet />
			</TooltipProvider>
		</QueryClientProvider>
	);
}
