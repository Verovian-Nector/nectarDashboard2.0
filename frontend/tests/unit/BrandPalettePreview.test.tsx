import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { baseTheme } from '../../src/theme'
import BrandPalettePreview from '../../src/components/BrandPalettePreview'

describe('BrandPalettePreview', () => {
  it('renders 10 palette items with labels', () => {
    const palette = ['#111','#222','#333','#444','#555','#666','#777','#888','#999','#000']
    const theme = {
      ...baseTheme,
      colors: { brand: palette },
      primaryColor: 'brand',
    } as any
    render(
      <MantineProvider theme={theme}>
        <BrandPalettePreview palette={palette} />
      </MantineProvider>
    )

    const labels = screen.getAllByText(/brand\[\d+\]/)
    expect(labels.length).toBeGreaterThanOrEqual(10)

    expect(screen.getByText(/Brand Palette/i)).toBeTruthy()
  })
})