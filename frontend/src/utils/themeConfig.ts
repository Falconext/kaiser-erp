export const themeColors: Record<string, { bg: string, text: string, border: string, ring: string, hover: string, soft: string }> = {
    brand: { // Violeta de marca (#7551FF)
        bg: 'bg-[#7551FF]',
        text: 'text-[#7551FF]',
        border: 'border-[#7551FF]',
        ring: 'focus:ring-[#7551FF]',
        hover: 'hover:bg-[#6742f0]',
        soft: 'bg-[#7551FF]/10 text-[#7551FF]'
    },
    primary: { // Fuchsia
        bg: 'bg-fuchsia-600',
        text: 'text-fuchsia-600',
        border: 'border-fuchsia-600',
        ring: 'focus:ring-fuchsia-500',
        hover: 'hover:bg-fuchsia-700',
        soft: 'bg-fuchsia-50 text-fuchsia-700'
    },
    dark: { // Gray
        bg: 'bg-gray-900',
        text: 'text-gray-900',
        border: 'border-gray-900',
        ring: 'focus:ring-gray-500',
        hover: 'hover:bg-gray-800',
        soft: 'bg-gray-100 text-gray-800'
    },
    info: { // Blue
        bg: 'bg-blue-600',
        text: 'text-blue-600',
        border: 'border-blue-600',
        ring: 'focus:ring-blue-500',
        hover: 'hover:bg-blue-700',
        soft: 'bg-blue-50 text-blue-700'
    },
    success: { // Emerald
        bg: 'bg-emerald-500',
        text: 'text-emerald-500',
        border: 'border-emerald-500',
        ring: 'focus:ring-emerald-500',
        hover: 'hover:bg-emerald-600',
        soft: 'bg-emerald-50 text-emerald-700'
    },
    warning: { // Orange
        bg: 'bg-orange-500',
        text: 'text-orange-500',
        border: 'border-orange-500',
        ring: 'focus:ring-orange-500',
        hover: 'hover:bg-orange-600',
        soft: 'bg-orange-50 text-orange-700'
    },
    error: { // Red
        bg: 'bg-red-500',
        text: 'text-red-500',
        border: 'border-red-500',
        ring: 'focus:ring-red-500',
        hover: 'hover:bg-red-600',
        soft: 'bg-red-50 text-red-700'
    }
};

export const getThemeColor = (key: string) => themeColors[key] || themeColors.info;
