import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function FormField({
	label,
	name,
	type = 'text',
	autoComplete,
	required,
}: {
	label: string;
	name: string;
	type?: string;
	autoComplete?: string;
	required?: boolean;
}) {
	return (
		<div className="flex flex-col gap-1">
			<Label htmlFor={name}>{label}</Label>
			<Input id={name} name={name} type={type} autoComplete={autoComplete} required={required} />
		</div>
	);
}
