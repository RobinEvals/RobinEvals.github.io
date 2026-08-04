export class ThemeManager {
	constructor() {
		this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		this.currentTheme = localStorage.getItem('theme') || 'auto';
		this.onThemeChange = null;
	}
	init() {
		this.applyTheme();
		this.mediaQuery.addEventListener('change', () => {
			if (this.currentTheme === 'auto') this.applyTheme();
		});
	}
	getEffectiveTheme() {
		if (this.currentTheme === 'auto') return this.mediaQuery.matches ? 'dark' : 'light';
		return this.currentTheme;
	}
	applyTheme() {
		const theme = this.getEffectiveTheme();
		document.documentElement.setAttribute('data-theme', theme);
		if (this.onThemeChange) this.onThemeChange(theme);
	}
	toggle() {
		const effective = this.getEffectiveTheme();
		this.currentTheme = effective === 'dark' ? 'light' : 'dark';
		localStorage.setItem('theme', this.currentTheme);
		this.applyTheme();
	}
	setAuto() {
		this.currentTheme = 'auto';
		localStorage.setItem('theme', 'auto');
		this.applyTheme();
	}
}