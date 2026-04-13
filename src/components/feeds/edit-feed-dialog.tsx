import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { updateFeedFn } from '@/lib/category-service';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { ErrorAlert } from '@/components/ui/error-alert';
import { toErrors } from '@/lib/form-utils';

interface EditFeedDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	feed: { id: string; title: string; categoryId: string | null; url: string };
	userId: string;
	categories: Array<{ id: string; name: string }>;
	onSuccess: () => void;
}

export function EditFeedDialog({
	open,
	onOpenChange,
	feed,
	userId,
	categories,
	onSuccess,
}: EditFeedDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				{open && (
					<EditFeedForm
						key={feed.id}
						feed={feed}
						userId={userId}
						categories={categories}
						onOpenChange={onOpenChange}
						onSuccess={onSuccess}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

interface EditFeedFormProps {
	feed: { id: string; title: string; categoryId: string | null; url: string };
	userId: string;
	categories: Array<{ id: string; name: string }>;
	onOpenChange: (open: boolean) => void;
	onSuccess: () => void;
}

const schema = z.object({
	title: z.string().min(1, 'Display name cannot be empty'),
	categoryId: z.string(),
});

function EditFeedForm({ feed, userId, categories, onOpenChange, onSuccess }: EditFeedFormProps) {
	const mutation = useMutation({
		mutationFn: async (values: z.infer<typeof schema>) => {
			await updateFeedFn({
				data: {
					userId,
					feedId: feed.id,
					customTitle: values.title.trim(),
					categoryId: values.categoryId === '__none__' ? null : values.categoryId,
				},
			});
		},
		onSuccess: () => {
			onOpenChange(false);
			setTimeout(() => onSuccess(), 0);
		},
	});

	const form = useForm({
		defaultValues: {
			title: feed.title,
			categoryId: feed.categoryId ?? '__none__',
		},
		validators: { onSubmit: schema },
		onSubmit: async ({ value }) => {
			await mutation.mutateAsync(value);
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			className="flex flex-col gap-4"
		>
			<DialogHeader>
				<DialogTitle>Edit Feed</DialogTitle>
				<DialogDescription>Update the display name and category for this feed.</DialogDescription>
			</DialogHeader>

			{mutation.error && <ErrorAlert>{mutation.error.message}</ErrorAlert>}

			<FieldGroup>
				<form.Field name="title">
					{(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Display name</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault();
											form.handleSubmit();
										}
									}}
									aria-invalid={isInvalid}
								/>
								{isInvalid && <FieldError errors={toErrors(field.state.meta.errors)} />}
							</Field>
						);
					}}
				</form.Field>

				<form.Field name="categoryId">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>Category</FieldLabel>
							<Select
								name={field.name}
								value={field.state.value}
								onValueChange={field.handleChange}
							>
								<SelectTrigger id={field.name} className="w-full">
									<SelectValue placeholder="No category" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="__none__">No category</SelectItem>
									{categories.map((cat) => (
										<SelectItem key={cat.id} value={cat.id}>
											{cat.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>
					)}
				</form.Field>
			</FieldGroup>

			<div className="flex flex-col gap-1">
				<p className="text-muted-foreground text-xs font-medium">Feed URL</p>
				<p className="text-muted-foreground truncate text-xs" title={feed.url}>
					{feed.url}
				</p>
			</div>

			<DialogFooter>
				<form.Subscribe selector={(s) => s.isSubmitting}>
					{(isSubmitting) => (
						<>
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
								disabled={isSubmitting}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? 'Saving…' : 'Save'}
							</Button>
						</>
					)}
				</form.Subscribe>
			</DialogFooter>
		</form>
	);
}
