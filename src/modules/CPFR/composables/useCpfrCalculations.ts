// src/modules/CPFR/composables/useCpfrCalculations.ts
// ─────────────────────────────────────────────────────────────────────────────
// DEPRECATED — las calulaciones ahora las realiza el backend (cpfrController.js).
// Este archivo se conserva para no romper imports residuales.
// ─────────────────────────────────────────────────────────────────────────────

export function useCpfrCalculations(
    _skuCriteria: Record<string, number>,
    _storeCriteria: Record<string, number>,
) {
    return {
        calcRow: (_item: unknown) => _item,
        calcMacro: (_skus: unknown[]) => ({}),
        buildGroups: (_items: unknown[]) => [],
    }
}