export function toErrors(errors: Array<unknown>): Array<{ message?: string }> {
	return errors.map((e) => (typeof e === 'string' ? { message: e } : (e as { message?: string })));
}
