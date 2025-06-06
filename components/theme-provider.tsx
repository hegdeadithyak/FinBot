"use client"

import type * as React from "react"
import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)
  const [mounted, setMounted] = useState(false)

  // Safe localStorage getter
  const getStoredTheme = (): Theme | null => {
    if (typeof window === "undefined") return null
    try {
      return localStorage.getItem(storageKey) as Theme
    } catch (error) {
      console.warn("Local storage is not available:", error)
      return null
    }
  }

  // Safe localStorage setter
  const storeTheme = (theme: Theme): void => {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(storageKey, theme)
    } catch (error) {
      console.warn("Local storage is not available:", error)
    }
  }

  // Set initial theme from localStorage after component mounts
  useEffect(() => {
    const storedTheme = getStoredTheme()
    if (storedTheme) {
      setTheme(storedTheme)
    }
    setMounted(true)
  }, [storageKey])

  // Apply theme to document
  useEffect(() => {
    if (!mounted || typeof window === "undefined") return

    const root = document.documentElement

    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme, mounted])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      setTheme(theme)
      if (mounted) {
        storeTheme(theme)
      }
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }

  return context
}
