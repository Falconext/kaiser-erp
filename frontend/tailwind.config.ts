// @ts-nocheck
import forms from "@tailwindcss/forms";

export default {
    darkMode: "class",
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
        './node_modules/@tremor/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                tremor: {
                    brand: {
                        faint: "#eef3f9",
                        muted: "#b9cbe2",
                        subtle: "#3b6aa0",
                        DEFAULT: "#214878",
                        emphasis: "#17335a",
                        inverted: "#ffffff",
                    },
                    background: {
                        muted: "#f3f4f6",
                        subtle: "#e5e7eb",
                        DEFAULT: "#ffffff",
                        emphasis: "#374151",
                    },
                    border: { DEFAULT: "1px solid #E1E3EA;" },
                    ring: { DEFAULT: "1px solid #E1E3EA;" },
                    content: {
                        subtle: "#9ca3af",
                        DEFAULT: "#6b7280",
                        emphasis: "#374151",
                        strong: "#111827",
                        inverted: "#ffffff",
                    },
                },

                "dark-tremor": {
                    brand: {
                        faint: "#0a1424",
                        muted: "#17335a",
                        subtle: "#214878",
                        DEFAULT: "#3b6aa0",
                        emphasis: "#6f9bc9",
                        inverted: "#0a1424",
                    },
                    background: {
                        muted: "#131a2b",
                        subtle: "#1f2937",
                        DEFAULT: "#111827",
                        emphasis: "#d1d5db",
                    },
                    border: { DEFAULT: "#1f2937" },
                    ring: { DEFAULT: "#1f2937" },
                    content: {
                        subtle: "#6b7280",
                        DEFAULT: "#9ca3af",
                        emphasis: "#d1d5db",
                        strong: "#f3f4f6",
                        inverted: "#111827",
                    },
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
                "tremor-small": "0.375rem",
                "tremor-default": "0.5rem",
                "tremor-full": "9999px",
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
                mona: ['"Mona Sans"', 'system-ui', 'sans-serif'],
                jakarta: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
                inter: ['Inter', 'system-ui', 'sans-serif'],
                roboto: ['Roboto', 'system-ui', 'sans-serif'],
                poppins: ['Poppins', 'system-ui', 'sans-serif'],
                opensans: ['"Open Sans"', 'system-ui', 'sans-serif'],
                lato: ['Lato', 'system-ui', 'sans-serif'],
                montserrat: ['Montserrat', 'system-ui', 'sans-serif'],
                raleway: ['Raleway', 'system-ui', 'sans-serif'],
                ubuntu: ['Ubuntu', 'system-ui', 'sans-serif'],
                manrope: ['Manrope', 'system-ui', 'sans-serif'],
                rubik: ['Rubik', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                "tremor-input": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                "tremor-card":
                    "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
            },
            fontSize: {
                "tremor-label": ["0.75rem", { lineHeight: "1rem" }],
                "tremor-default": ["0.875rem", { lineHeight: "1.25rem" }],
                "tremor-title": ["1.125rem", { lineHeight: "1.75rem" }],
                "tremor-metric": ["1.875rem", { lineHeight: "2.25rem" }],
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
                hide: {
                    from: { opacity: "1" },
                    to: { opacity: "0" },
                },
                slideDownAndFade: {
                    from: { opacity: "0", transform: "translateY(-6px)" },
                    to: { opacity: "1", transform: "translateY(0)" },
                },
                slideLeftAndFade: {
                    from: { opacity: "0", transform: "translateX(6px)" },
                    to: { opacity: "1", transform: "translateX(0)" },
                },
                slideUpAndFade: {
                    from: { opacity: "0", transform: "translateY(6px)" },
                    to: { opacity: "1", transform: "translateY(0)" },
                },
                slideRightAndFade: {
                    from: { opacity: "0", transform: "translateX(-6px)" },
                    to: { opacity: "1", transform: "translateX(0)" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                hide: "hide 150ms cubic-bezier(0.16, 1, 0.3, 1)",
                slideDownAndFade: "slideDownAndFade 150ms cubic-bezier(0.16, 1, 0.3, 1)",
                slideLeftAndFade: "slideLeftAndFade 150ms cubic-bezier(0.16, 1, 0.3, 1)",
                slideUpAndFade: "slideUpAndFade 150ms cubic-bezier(0.16, 1, 0.3, 1)",
                slideRightAndFade: "slideRightAndFade 150ms cubic-bezier(0.16, 1, 0.3, 1)",
            },
        },
    },
    safelist: [
        // Si usas colores dinámicos en tus charts (plin, yape, etc.)
        {
            pattern:
                /^(bg|text|border|ring|stroke|fill)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/,
        },
    ],
    plugins: [forms, require("tailwindcss-animate")],
}
