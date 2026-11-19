import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './data/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        base: '#0F0F0F',
        card: '#1A1A1A',
        cardBorder: '#2A2A2A',
        rebound: '#00C853',
        skip: '#FF3B30',
        wait: '#FFB300',
      },
    },
  },
  plugins: [],
};

export default config;
