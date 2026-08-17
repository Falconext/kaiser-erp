
import { valueFormatter } from "./useFinanceDashboardViewModel";

describe("Finance Dashboard ViewModel", () => {
    describe("valueFormatter", () => {
        it("should format numbers to Peruvian currency correctly", () => {
            const formatted = valueFormatter(1500.5);
            // Replace standard spaces with non-breaking spaces if toLocaleString outputs them
            const normalizedResult = formatted.replace(/\u00A0/g, ' ').replace(/,/g, '');
            expect(normalizedResult.includes("1500.50")).toBe(true);
            expect(normalizedResult.startsWith("S/")).toBe(true);
        });

        it("should handle zero and falsy values", () => {
            const formatted = valueFormatter(0);
            expect(formatted.replace(/\u00A0/g, ' ')).toContain("0.00");
        });
    });
});
