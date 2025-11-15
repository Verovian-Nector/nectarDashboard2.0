import { ReactNode, createContext, useContext, useMemo, useEffect } from 'react'
import { useLocalStorage } from '@mantine/hooks'
import { MantineProvider, createTheme } from '@mantine/core'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBranding, updateBranding, type BrandSettingsResponse, type BrandSettingsUpdate } from '../api/branding'
import { deriveBrandPalette } from '../utils/color'

type BrandingContextValue = {
  branding: BrandSettingsResponse | null
  updating: boolean
  updateBranding: (payload: BrandSettingsUpdate) => Promise<BrandSettingsResponse>
  colorScheme: 'light' | 'dark'
  setColorScheme: (scheme: 'light' | 'dark') => void
  toggleColorScheme: () => void
}

const BrandingContext = createContext<BrandingContextValue | undefined>(undefined)

function buildTheme(branding: BrandSettingsResponse | null) {
  // Fallback to current default theme if branding not loaded yet
  const fontFamily = branding?.font_family || 'Asap, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif'
  // Mantine requires primaryColor to be a color key present in theme.colors
  const primaryColor = 'brand'
  const primaryHex = branding?.primary_color || '#2A7B88'
  const brandPalette = (branding?.brand_palette && branding.brand_palette.length === 10)
    ? branding.brand_palette
    : deriveBrandPalette(primaryHex)

  const overrides = (branding?.theme_overrides || {}) as Record<string, any>
  const buttonBg = (overrides.button_bg_hex as string) || primaryHex
  const buttonText = (overrides.button_text_hex as string) || '#ffffff'
  const badgeBg = (overrides.badge_bg_hex as string) || brandPalette[1]
  const badgeText = (overrides.badge_text_hex as string) || '#1f2937'
  const iconBg = (overrides.icon_bg_hex as string) || brandPalette[1]
  const iconColor = (overrides.icon_color_hex as string) || brandPalette[9]

  return createTheme({
    fontFamily,
    headings: { fontFamily },
    defaultRadius: 'md',
    primaryColor,
    colors: { brand: brandPalette },
    components: {
      Button: {
        styles: (theme) => ({
          root: {
            backgroundColor: buttonBg || theme.colors.brand[6],
            color: buttonText,
            borderColor: 'transparent',
            '&:hover': { backgroundColor: buttonBg ? buttonBg : theme.colors.brand[7] },
          },
        }),
      },
      Badge: {
        styles: (theme) => ({
          root: {
            backgroundColor: badgeBg || theme.colors.brand[1],
            color: badgeText,
            border: 'none',
            textTransform: 'none',
          },
        }),
      },
      Tabs: {
        classNames: {
          tab: 'theme-tab',
        },
      },
      ThemeIcon: {
        styles: (theme) => ({
          root: {
            backgroundColor: iconBg || theme.colors.brand[1],
            color: iconColor || theme.colors.brand[9],
          },
        }),
      },
      ActionIcon: {
        styles: (theme) => ({
          root: {
            backgroundColor: iconBg || theme.colors.brand[1],
            color: iconColor || theme.colors.brand[9],
          },
        }),
      },
    },
  })
}

export function useBranding() {
  const ctx = useContext(BrandingContext)
  if (!ctx) throw new Error('useBranding must be used within BrandingProvider')
  return ctx
}

export default function BrandingProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: getBranding,
  })

  const mutation = useMutation({
    mutationFn: updateBranding,
    onSuccess: (data) => {
      queryClient.setQueryData(['branding'], data)
    },
  })

  const theme = useMemo(() => buildTheme(branding || null), [branding])

  // Per-user color scheme with local storage; defaults to branding value
  const [colorScheme, setColorScheme] = useLocalStorage<'light' | 'dark'>({
    key: 'color-scheme',
    defaultValue: 'light',
  })

  useEffect(() => {
    const existing = typeof window !== 'undefined' ? localStorage.getItem('color-scheme') : null
    if (!existing) {
      setColorScheme((branding?.dark_mode_default ? 'dark' : 'light') as 'light' | 'dark')
    }
  }, [branding?.dark_mode_default])

  const toggleColorScheme = () => {
    setColorScheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  // Apply document title and favicon from branding
  useEffect(() => {
    const title = branding?.app_title || 'Nectar Estate'
    if (document.title !== title) {
      document.title = title
    }

    const href = branding?.favicon_url || '/favicon.ico'
    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    if (link.href !== href) {
      link.href = href
    }
  }, [branding?.app_title, branding?.favicon_url])

  return (
    <BrandingContext.Provider value={{ branding: branding || null, updating: mutation.isPending, updateBranding: mutation.mutateAsync, colorScheme, setColorScheme, toggleColorScheme }}>
      <MantineProvider
        defaultColorScheme={colorScheme as any}
        forceColorScheme={colorScheme as any}
        theme={theme}
      >
        {children}
      </MantineProvider>
    </BrandingContext.Provider>
  )
}