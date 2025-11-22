import { createTheme } from '@mantine/core'

export const baseTheme = createTheme({
  primaryColor: 'brand',
  primaryShade: 6,
  defaultRadius: 'md',
  headings: {
    fontWeight: '700',
    sizes: {
      h1: { fontSize: '2.125rem' },
      h2: { fontSize: '1.75rem' },
      h3: { fontSize: '1.375rem' },
    },
  },
  components: {
    Button: {
      styles: () => ({
        root: {
          fontWeight: 600,
          transition: 'transform 120ms ease, box-shadow 120ms ease',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02), 0 1px 1px rgba(0,0,0,0.04)',
          '&:active': { transform: 'scale(0.98)' },
        },
      }),
    },
    Card: {
      defaultProps: { withBorder: true, radius: 'md' },
      styles: (theme: any) => ({
        root: {
          borderColor: theme.colors.gray?.[3] ?? '#dee2e6',
          transition: 'transform 160ms ease, box-shadow 160ms ease',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02), 0 2px 4px rgba(0,0,0,0.03)',
          willChange: 'transform, box-shadow',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 6px 12px rgba(0,0,0,0.06), 0 3px 6px rgba(0,0,0,0.04)',
          },
        },
      }),
    },
    Modal: {
      defaultProps: { radius: 'md', overlayProps: { blur: 2 } },
    },
  },
})