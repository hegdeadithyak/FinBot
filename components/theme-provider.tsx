"use client"

import * as React from "react"
import {
  ThemeProvider as NextThemesProvider,
  useTheme as useNextTheme,
  type ThemeProviderProps
} from "next-themes"
import { Inter } from "next/font/google"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false)
  //@ts-ignore
  const { theme } = props

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (!mounted || typeof window === "undefined") return

    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(inter.variable)

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "light" : "dark"
      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme, mounted])

  return (
    <NextThemesProvider {...props} attribute="class" defaultTheme="system" enableSystem={true}>
      {children}
    </NextThemesProvider>
  )
}

// ✅ Custom export of useTheme
export const useTheme = useNextTheme
