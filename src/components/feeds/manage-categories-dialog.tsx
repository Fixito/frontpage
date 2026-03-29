import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Pencil, Trash2, X } from 'lucide-react';
import {
	createCategoryFn,
	deleteCategoryFn,
	reorderCategoriesFn,
	updateCategoryFn,
} from '@/lib/category-service';
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

interface ManageCategoriesDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	userId: string;
	categories: Array<{ id: string; name: string }>;
	onSuccess: () => void;
}

interface LocalCategory {
	id: string;
	name: string;
}

export function ManageCategoriesDialog({
	open,
	onOpenChange,
	userId,
	categories,
	onSuccess,
}: ManageCategoriesDialogProps) {
	const [localCats, setLocalCats] = useState<Array<LocalCategory>>([]);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editingName, setEditingName] = useState('');
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [newName, setNewName] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const editInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (open) {
			setLocalCats(categories.map((c) => ({ id: c.id, name: c.name })));
			setEditingId(null);
			setEditingName('');
			setDeletingId(null);
			setNewName('');
			setError(null);
		}
	}, [open, categories]);

	// Focus the edit input whenever editingId changes
	useEffect(() => {
		if (editingId) {
			editInputRef.current?.focus();
		}
	}, [editingId]);

	async function handleAdd() {
		const name = newName.trim();
		if (!name) return;
		setLoading(true);
		setError(null);
		try {
			const id = await createCategoryFn({ data: { userId, name } });
			setLocalCats((prev) => [...prev, { id, name }]);
			setNewName('');
			onSuccess();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to add category');
		} finally {
			setLoading(false);
		}
	}

	async function handleSaveEdit(id: string) {
		const name = editingName.trim();
		if (!name) {
			cancelEdit();
			return;
		}
		setLoading(true);
		setError(null);
		try {
			await updateCategoryFn({ data: { userId, id, name } });
			setLocalCats((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
			cancelEdit();
			onSuccess();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to update category');
		} finally {
			setLoading(false);
		}
	}

	async function handleDelete(id: string) {
		setLoading(true);
		setError(null);
		try {
			await deleteCategoryFn({ data: { userId, id } });
			setLocalCats((prev) => prev.filter((c) => c.id !== id));
			setDeletingId(null);
			onSuccess();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to delete category');
		} finally {
			setLoading(false);
		}
	}

	async function handleMove(index: number, direction: 'up' | 'down') {
		const targetIndex = direction === 'up' ? index - 1 : index + 1;
		if (targetIndex < 0 || targetIndex >= localCats.length) return;

		const prevCats = [...localCats];
		const newOrder = [...localCats];
		const temp = newOrder[targetIndex];
		newOrder[targetIndex] = newOrder[index]!;
		newOrder[index] = temp;

		setLocalCats(newOrder);
		setLoading(true);
		setError(null);
		try {
			await reorderCategoriesFn({
				data: { userId, orderedIds: newOrder.map((c) => c.id) },
			});
			onSuccess();
		} catch (err) {
			setLocalCats(prevCats);
			setError(err instanceof Error ? err.message : 'Failed to reorder categories');
		} finally {
			setLoading(false);
		}
	}

	function startEdit(cat: LocalCategory) {
		setEditingId(cat.id);
		setEditingName(cat.name);
		setDeletingId(null);
	}

	function cancelEdit() {
		setEditingId(null);
		setEditingName('');
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Manage Categories</DialogTitle>
					<DialogDescription>
						Add, rename, reorder, or delete your feed categories.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-1">
					{localCats.length === 0 && (
						<p className="text-muted-foreground py-2 text-center text-sm">
							No categories yet. Add one below.
						</p>
					)}

					{localCats.map((cat, index) => (
						<div key={cat.id} className="flex min-h-9 items-center gap-1.5 rounded-md px-1 py-0.5">
							{editingId === cat.id ? (
								<>
									<Input
										ref={editInputRef}
										value={editingName}
										onChange={(e) => setEditingName(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === 'Enter') handleSaveEdit(cat.id);
											if (e.key === 'Escape') cancelEdit();
										}}
										className="h-7 flex-1"
										disabled={loading}
									/>
									<Button
										size="icon"
										variant="ghost"
										className="h-7 w-7 shrink-0"
										onClick={() => handleSaveEdit(cat.id)}
										disabled={loading || !editingName.trim()}
										aria-label="Save name"
									>
										<Check size={13} aria-hidden />
									</Button>
									<Button
										size="icon"
										variant="ghost"
										className="h-7 w-7 shrink-0"
										onClick={cancelEdit}
										disabled={loading}
										aria-label="Cancel edit"
									>
										<X size={13} aria-hidden />
									</Button>
								</>
							) : deletingId === cat.id ? (
								<>
									<span className="text-muted-foreground min-w-0 flex-1 truncate text-sm">
										Delete &ldquo;{cat.name}&rdquo;?
									</span>
									<Button
										size="sm"
										variant="destructive"
										className="h-7 shrink-0 text-xs"
										onClick={() => handleDelete(cat.id)}
										disabled={loading}
									>
										{loading ? 'Deleting…' : 'Delete'}
									</Button>
									<Button
										size="sm"
										variant="ghost"
										className="h-7 shrink-0 text-xs"
										onClick={() => setDeletingId(null)}
										disabled={loading}
									>
										Cancel
									</Button>
								</>
							) : (
								<>
									<span className="min-w-0 flex-1 truncate text-sm">{cat.name}</span>
									<Button
										size="icon"
										variant="ghost"
										className="h-7 w-7 shrink-0"
										onClick={() => handleMove(index, 'up')}
										disabled={loading || index === 0}
										aria-label={`Move ${cat.name} up`}
									>
										<ChevronUp size={13} aria-hidden />
									</Button>
									<Button
										size="icon"
										variant="ghost"
										className="h-7 w-7 shrink-0"
										onClick={() => handleMove(index, 'down')}
										disabled={loading || index === localCats.length - 1}
										aria-label={`Move ${cat.name} down`}
									>
										<ChevronDown size={13} aria-hidden />
									</Button>
									<Button
										size="icon"
										variant="ghost"
										className="h-7 w-7 shrink-0"
										onClick={() => startEdit(cat)}
										disabled={loading}
										aria-label={`Rename ${cat.name}`}
									>
										<Pencil size={13} aria-hidden />
									</Button>
									<Button
										size="icon"
										variant="ghost"
										className="text-destructive hover:text-destructive h-7 w-7 shrink-0"
										onClick={() => {
											setDeletingId(cat.id);
											cancelEdit();
										}}
										disabled={loading}
										aria-label={`Delete ${cat.name}`}
									>
										<Trash2 size={13} aria-hidden />
									</Button>
								</>
							)}
						</div>
					))}
				</div>

				{error && (
					<p role="alert" className="text-destructive text-sm">
						{error}
					</p>
				)}

				{/* Add new category */}
				<div className="border-border flex gap-2 border-t pt-3">
					<Input
						placeholder="New category name"
						value={newName}
						onChange={(e) => setNewName(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && !loading) handleAdd();
						}}
						disabled={loading}
						aria-label="New category name"
					/>
					<Button
						variant="outline"
						onClick={handleAdd}
						disabled={loading || !newName.trim()}
						className="shrink-0"
					>
						Add
					</Button>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Done
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
