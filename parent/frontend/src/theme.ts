import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'blue',
  primaryShade: 6,
  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial',
  headings: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial',
    fontWeight: '700',
    sizes: {
      h1: { fontSize: '2.125rem' },
      h2: { fontSize: '1.75rem' },
      h3: { fontSize: '1.375rem' },
    },
  },
  defaultRadius: 'md',
  colors: {
    blue: [
      '#e7f5ff',
      '#d0ebff',
      '#a5d8ff',
      '#74c0fc',
      '#4dabf7',
      '#339af0',
      '#228be6',
      '#1c7ed6',
      '#1971c2',
      '#1864ab',
    ],
    gray: [
      '#f8f9fa',
      '#f1f3f5',
      '#e9ecef',
      '#dee2e6',
      '#ced4da',
      '#adb5bd',
      '#868e96',
      '#495057',
      '#343a40',
      '#212529',
    ],
    green: [
      '#ebfbee',
      '#d3f9d8',
      '#b2f2bb',
      '#8ce99a',
      '#69db7c',
      '#51cf66',
      '#40c057',
      '#37b24d',
      '#2f9e44',
      '#2b8a3e',
    ],
  },
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
        size: 'md',
      },
      styles: (theme: any) => ({
        root: {
          fontWeight: 600,
          transition: 'transform 120ms ease, box-shadow 120ms ease',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02), 0 1px 1px rgba(0,0,0,0.04)',
        },
        inner: {
          willChange: 'transform',
        },
        label: {},
        icon: {},
        section: {},
        rootActive: {
          transform: 'scale(0.98)',
        },
      }),
    },
    Paper: {
      defaultProps: { shadow: 'sm', radius: 'md', p: 'xl' },
    },
    Card: {
      defaultProps: { withBorder: true, radius: 'md' },
      styles: (theme: any) => ({
        root: {
          borderColor: theme.colors.gray[3],
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
      styles: (theme: any) => ({
        header: { borderBottom: `1px solid ${theme.colors.gray[3]}`, paddingBottom: theme.spacing.sm },
        body: { paddingTop: theme.spacing.md },
      }),
    },
    TextInput: {
      styles: (theme: any) => ({
        input: {
          borderColor: theme.colors.gray[3],
        },
        label: { fontWeight: 500 },
      }),
    },
    Badge: {
      defaultProps: { radius: 'sm' },
    },
  },
});