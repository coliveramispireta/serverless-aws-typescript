/** true si el valor no es undefined ni null (compatible con la regla eqeqeq de ESLint) */
export const hasValue = (v: unknown): boolean => v !== undefined && v !== null;
