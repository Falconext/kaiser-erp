/**
 * Detecta el sistema operativo del usuario
 */
export const detectPlatform = () => {
  const userAgent = window.navigator.userAgent;
  const platform = window.navigator.platform;
  
  // Detectar macOS con múltiples métodos para compatibilidad con navegadores modernos
  let isMacOS = false;
  
  // Método 1: Platform tradicional
  if (/Mac|iPod|iPhone|iPad/.test(platform)) {
    isMacOS = true;
  }
  
  // Método 2: User Agent
  if (/Macintosh|Mac OS X|Darwin/.test(userAgent)) {
    isMacOS = true;
  }
  
  // Método 3: Navigator properties (para navegadores que ocultan platform)
  if ((window.navigator as any).oscpu && /Mac/.test((window.navigator as any).oscpu)) {
    isMacOS = true;
  }
  
  // Método 4: Detectar Safari en macOS
  if (/Safari/.test(userAgent) && /Version/.test(userAgent) && !/Chrome|Chromium|Edge|Firefox/.test(userAgent)) {
    if (/Mac OS X/.test(userAgent)) {
      isMacOS = true;
    }
  }
  
  // Método 5: Detectar usando maxTouchPoints (específico de macOS en algunos casos)
  if (navigator.maxTouchPoints === 0 && /Mac/.test(platform)) {
    isMacOS = true;
  }
  
  const isWindows = /Win/.test(platform) || /Windows/.test(userAgent);
  const isLinux = (/Linux/.test(platform) || /Linux/.test(userAgent)) && !/Android/.test(userAgent);

  return {
    isMacOS,
    isWindows,
    isLinux,
    platform: isMacOS ? 'macOS' : isWindows ? 'Windows' : isLinux ? 'Linux' : 'Unknown',
    debug: {
      userAgent,
      platform,
      oscpu: (window.navigator as any).oscpu,
      maxTouchPoints: navigator.maxTouchPoints
    }
  };
};

