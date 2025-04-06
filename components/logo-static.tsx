"use client"

export function LogoStatic() {
  return (
    <div className="relative w-11 h-11 flex items-center justify-center">
      <svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
        {/* Rounded rectangle background */}
        <rect x="0" y="0" width="44" height="44" rx="10" fill="#000000" />
        
        {/* Main vertical line of 'F' */}
        <rect x="14" y="10" width="4" height="24" fill="#ffffff" />
        
        {/* Top horizontal of 'F' */}
        <rect x="14" y="10" width="16" height="4" fill="#ffffff" />
        
        {/* Middle horizontal of 'F' */}
        <rect x="14" y="20" width="12" height="4" fill="#ffffff" />
        
        {/* Subtle accent line */}
        <line x1="34" y1="10" x2="34" y2="34" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1" />
        
        {/* Circle border */}
        <circle cx="22" cy="22" r="19" fill="none" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="2" />
        
        {/* Animated particles as static dots */}
        <circle cx="37" cy="22" r="1.5" fill="#ffffff" />
        <circle cx="15" cy="35" r="1.5" fill="#ffffff" />
        <circle cx="15" cy="9" r="1.5" fill="#ffffff" />
      </svg>
    </div>
  )
} 