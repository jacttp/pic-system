/** @type {import('tailwindcss').Config} */
export default {
	darkMode: ["class"],
	content: [
		"./index.html",
		"./src/**/*.{vue,js,ts,jsx,tsx}",
	],
	theme: {
		extend: {
			colors: {
				brand: {
					'50': '#fff1f2',
					'100': '#ffe4e6',
					'200': '#fecdd3',
					'300': '#fda4af',
					'400': '#fb7185',
					'500': '#d91f26', // Rojo Corona principal
					'600': '#c0171f',
					'700': '#a11219',
					'800': '#86131a',
					'900': '#70141a',
					'950': '#3d080b'
				},
				pic: {
					brand: 'hsl(var(--pic-brand))',
					'brand-soft': 'hsl(var(--pic-brand-soft))',
					'brand-border': 'hsl(var(--pic-brand-border))',
					module: 'hsl(var(--pic-module))',
					'module-soft': 'hsl(var(--pic-module-soft))',
					surface: 'hsl(var(--pic-surface))',
					background: 'hsl(var(--pic-background))',
					'muted-surface': 'hsl(var(--pic-muted-surface))',
					'text-main': 'hsl(var(--pic-text-main))',
					'text-muted': 'hsl(var(--pic-text-muted))',
					border: 'hsl(var(--pic-border))',
					nav: 'hsl(var(--pic-nav))',
					'nav-muted': 'hsl(var(--pic-nav-muted))',
					'nav-text': 'hsl(var(--pic-nav-text))',
					'nav-text-muted': 'hsl(var(--pic-nav-text-muted))',
					success: 'hsl(var(--pic-success))',
					warning: 'hsl(var(--pic-warning))',
					danger: 'hsl(var(--pic-danger))',
					info: 'hsl(var(--pic-info))',
					accent: {
						orange: 'hsl(var(--pic-accent-orange))',
						'orange-soft': 'hsl(var(--pic-accent-orange-soft))',
						blue: 'hsl(var(--pic-accent-blue))',
						'blue-soft': 'hsl(var(--pic-accent-blue-soft))',
						purple: 'hsl(var(--pic-accent-purple))',
						'purple-soft': 'hsl(var(--pic-accent-purple-soft))',
						teal: 'hsl(var(--pic-accent-teal))',
						'teal-soft': 'hsl(var(--pic-accent-teal-soft))',
						yellow: 'hsl(var(--pic-accent-yellow))',
						'yellow-soft': 'hsl(var(--pic-accent-yellow-soft))'
					},
					chart: {
						'1': 'hsl(var(--pic-chart-1))',
						'2': 'hsl(var(--pic-chart-2))',
						'3': 'hsl(var(--pic-chart-3))',
						'4': 'hsl(var(--pic-chart-4))',
						'5': 'hsl(var(--pic-chart-5))'
					}
				},
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				chart: {
					'1': 'hsl(var(--chart-1))',
					'2': 'hsl(var(--chart-2))',
					'3': 'hsl(var(--chart-3))',
					'4': 'hsl(var(--chart-4))',
					'5': 'hsl(var(--chart-5))'
				}
			},
			fontFamily: {
				sans: [
					'Inter',
					'system-ui',
					'sans-serif'
				]
			},
			containers: {
				'2xs': '16rem',
				'3xl': '48rem',
				split: '850px'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			}
		}
	},
	plugins: [
		require('@tailwindcss/container-queries'),
		require('@tailwindcss/typography'),
		require("tailwindcss-animate")
	],
}
