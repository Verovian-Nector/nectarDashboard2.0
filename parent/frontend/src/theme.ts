import { createTheme, rem } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'darkBlue',
  primaryShade: 6,
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
  headings: {
    fontFamily: 'Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontWeight: '700',
    sizes: {
      h1: { fontSize: rem(36), lineHeight: '1.2' },
      h2: { fontSize: rem(30), lineHeight: '1.3' },
      h3: { fontSize: rem(24), lineHeight: '1.35' },
      h4: { fontSize: rem(20), lineHeight: '1.4' },
    },
  },
  defaultRadius: 'md',
  cursorType: 'pointer',
  colors: {
    // Premium Dark Blue Palette (Corporate, Trustworthy)
    darkBlue: [
      '#EBF1F5', // 0
      '#CEDBE5', // 1
      '#A6BBCD', // 2
      '#7D9AB4', // 3
      '#5A7E9D', // 4
      '#3E6586', // 5
      '#264D70', // 6 (Primary)
      '#193A57', // 7
      '#0F293F', // 8
      '#051828', // 9
    ],
    // Sophisticated Gray (Slate-like)
    gray: [
      '#F8F9FA', // 0
      '#F1F3F5', // 1
      '#E9ECEF', // 2
      '#DEE2E6', // 3
      '#CED4DA', // 4
      '#ADB5BD', // 5
      '#868E96', // 6
      '#495057', // 7
      '#343A40', // 8
      '#212529', // 9
    ],
  },
  shadows: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  },
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
        size: 'sm',
      },
      styles: (theme: any, props: any) => ({
        root: {
          fontWeight: 600,
          transition: 'all 0.2s ease',
          boxShadow: props.variant === 'filled' ? theme.shadows.sm : 'none',
          '&:active': {
            transform: 'translateY(1px)',
          },
          '&:hover': {
            boxShadow: props.variant === 'filled' ? theme.shadows.md : 'none',
            transform: props.variant === 'filled' ? 'translateY(-1px)' : 'none',
          },
        },
      }),
    },
    Paper: {
      defaultProps: { shadow: 'sm', radius: 'lg' },
    },
    Card: {
      defaultProps: { withBorder: true, radius: 'lg', shadow: 'sm' },
      styles: (theme: any) => ({
        root: {
          backgroundColor: '#fff',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows.md,
          },
        },
      }),
    },
    Badge: {
      defaultProps: { radius: 'sm', fw: 600 },
    },
    TextInput: {
      defaultProps: { radius: 'md' },
      styles: (theme: any) => ({
        input: {
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          '&:focus': {
            borderColor: theme.colors.darkBlue[6],
            boxShadow: `0 0 0 2px ${theme.colors.darkBlue[1]}`,
          },
        },
      }),
    },
    Modal: {
      defaultProps: {
        radius: 'lg',
        overlayProps: {
          backgroundOpacity: 0.55,
          blur: 3,
        },
        transitionProps: { transition: 'pop', duration: 200 },
      },
      styles: (theme: any) => ({
        header: {
          paddingTop: theme.spacing.md,
          paddingBottom: theme.spacing.md,
          borderBottom: `1px solid ${theme.colors.gray[2]}`,
        },
        title: {
          fontWeight: 700,
          fontSize: theme.fontSizes.lg,
        },
      }),
    },
  },
});