/**
 * Neon Chess - AdMob Simulation Service
 * Proporciona anuncios simulados (Banners e Intersticiales) con estética Cyberpunk
 * utilizando los IDs oficiales de prueba de Google AdMob.
 */

const admobService = (function() {
  // IDs de prueba oficiales de Google AdMob
  const TEST_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111';
  const TEST_INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/1033173712';

  // Base de anuncios cyberpunk ficticios de Neon Chess
  const cyberpunkAds = [
    {
      title: "MILITECH DEFENSE",
      tagline: "Enlace neural táctico MK-V. Domina el tablero mental con implantes de combate.",
      actionText: "ADQUIRIR IMPLANTE",
      color: "#ff3333",
      bgColor: "rgba(255, 51, 51, 0.06)",
      borderColor: "rgba(255, 51, 51, 0.4)"
    },
    {
      title: "TRAUMA TEAM PLATINUM",
      tagline: "Respuesta aeromédica blindada en 3 minutos. Cobertura premium en Night City.",
      actionText: "CONTRATAR PLAN",
      color: "#33ff33",
      bgColor: "rgba(51, 255, 51, 0.06)",
      borderColor: "rgba(51, 255, 51, 0.4)"
    },
    {
      title: "KIROSHI OPTICS",
      tagline: "Escaneo de amenazas tácticas y zoom óptico 8x. Instala el nuevo MK-IV hoy.",
      actionText: "VER CATÁLOGO",
      color: "#00ffff",
      bgColor: "rgba(0, 255, 255, 0.06)",
      borderColor: "rgba(0, 255, 255, 0.4)"
    },
    {
      title: "ARASAKA CORPORATION",
      tagline: "Digitaliza tu consciencia. Asegura tu alma con nuestro programa de constructos virtuales.",
      actionText: "INICIAR TRANSICIÓN",
      color: "#ffaa00",
      bgColor: "rgba(255, 170, 0, 0.06)",
      borderColor: "rgba(255, 170, 0, 0.4)"
    },
    {
      title: "DELAMAIN AI CAB",
      tagline: "Transporte autónomo inteligente blindado. Seguridad, privacidad y comodidad neural.",
      actionText: "SOLICITAR UNIDAD",
      color: "#ff00ff",
      bgColor: "rgba(255, 0, 255, 0.06)",
      borderColor: "rgba(255, 0, 255, 0.4)"
    },
    {
      title: "KANG TAO SMART ARMS",
      tagline: "Armamento inteligente guiado por micro-procesadores. Apunta sin mirar.",
      actionText: "COMPRAR AHORA",
      color: "#ffff00",
      bgColor: "rgba(255, 255, 0, 0.06)",
      borderColor: "rgba(255, 255, 0, 0.4)"
    }
  ];

  let currentAdIndex = 0;
  let activeCallback = null;
  let countdownInterval = null;

  // Generador de sonido sintético estilo glitch cyberpunk usando Web Audio API
  function playAdSound(type) {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'load') {
        // Sonido de inicio del anuncio (glitch agudo)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      } else if (type === 'unlock') {
        // Sonido de botón disponible (bip doble ascendente)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.08); // E5
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.22);
      } else if (type === 'click') {
        // Sonido de clic/cierre (pulso seco)
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.09);
      }
    } catch (e) {
      console.warn('Audio Context blockeado o no disponible:', e);
    }
  }

  // Inicialización de la interfaz en el DOM
  function init() {
    if (document.getElementById('admob-sim-banner')) return;

    // Crear banner inferior
    const banner = document.createElement('div');
    banner.id = 'admob-sim-banner';
    banner.className = 'admob-sim-banner';
    banner.innerHTML = `
      <div class="ad-badge">ANUNCIO</div>
      <div class="ad-id-info">AdMob Test ID: ${TEST_BANNER_ID}</div>
      <div class="ad-content-wrapper" id="ad-banner-content"></div>
      <button class="ad-close-btn" onclick="admobService.hideBanner()" title="Ocultar publicidad">&times;</button>
    `;
    document.body.appendChild(banner);

    // Crear overlay intersticial
    const interstitial = document.createElement('div');
    interstitial.id = 'admob-sim-interstitial';
    interstitial.className = 'admob-sim-interstitial';
    interstitial.innerHTML = `
      <div class="interstitial-container">
        <div class="interstitial-header">
          <div class="interstitial-badge">ANUNCIO PATROCINADO (ADMOB)</div>
          <button id="interstitial-close-btn" class="interstitial-close-btn" disabled>Cargando enlace neural...</button>
        </div>
        <div class="interstitial-body">
          <div class="interstitial-glitch-bg"></div>
          <div class="interstitial-ad-box" id="interstitial-ad-box"></div>
          <div class="interstitial-technical-info">
            <span>DISPOSITIVO: NEURAL-NET-CONN</span>
            <span>TEST_ID: ${TEST_INTERSTITIAL_ID}</span>
            <span>ESTADO: SIMULATED_STREAM_OK</span>
          </div>
        </div>
        <div class="interstitial-progress-bar">
          <div id="interstitial-progress-fill" class="interstitial-progress-fill"></div>
        </div>
      </div>
    `;
    document.body.appendChild(interstitial);

    console.log('Servicio de simulación de AdMob inicializado con éxito.');
  }

  // Obtener una publicidad aleatoria garantizando rotación
  function getNextAd() {
    const ad = cyberpunkAds[currentAdIndex];
    currentAdIndex = (currentAdIndex + 1) % cyberpunkAds.length;
    return ad;
  }

  // Mostrar el banner en la parte inferior
  function showBanner(menuName) {
    init(); // Asegurar que existe en el DOM
    
    const banner = document.getElementById('admob-sim-banner');
    const content = document.getElementById('ad-banner-content');
    if (!banner || !content) return;

    const ad = getNextAd();
    
    // Configurar colores de neón dinámicos del banner según el anuncio
    banner.style.borderColor = ad.borderColor;
    banner.style.boxShadow = `0 0 15px ${ad.borderColor}, inset 0 0 10px ${ad.bgColor}`;
    banner.style.background = `linear-gradient(90deg, rgba(0,0,0,0.9) 0%, ${ad.bgColor} 50%, rgba(0,0,0,0.9) 100%)`;

    content.innerHTML = `
      <div class="ad-banner-title" style="color: ${ad.color}">${ad.title}</div>
      <div class="ad-banner-tagline">${ad.tagline}</div>
      <a href="#" class="ad-banner-action" onclick="admobService.handleAdClick(event)" style="border-color: ${ad.color}; color: ${ad.color}; box-shadow: 0 0 8px ${ad.color}">${ad.actionText}</a>
    `;

    banner.style.display = 'flex';
    console.log(`Banner AdMob cargado en el menú: ${menuName} (ID: ${TEST_BANNER_ID})`);
  }

  // Ocultar el banner
  function hideBanner() {
    const banner = document.getElementById('admob-sim-banner');
    if (banner) {
      banner.style.display = 'none';
    }
  }

  // Mostrar el anuncio intersticial de pantalla completa
  function showInterstitial(callback) {
    init(); // Asegurar que existe en el DOM

    activeCallback = callback;
    const interstitial = document.getElementById('admob-sim-interstitial');
    const adBox = document.getElementById('interstitial-ad-box');
    const closeBtn = document.getElementById('interstitial-close-btn');
    const progressFill = document.getElementById('interstitial-progress-fill');
    
    if (!interstitial || !adBox || !closeBtn || !progressFill) {
      if (callback) callback();
      return;
    }

    const ad = getNextAd();
    playAdSound('load');

    // Estructurar el anuncio intersticial con diseño premium
    adBox.style.borderColor = ad.color;
    adBox.style.boxShadow = `0 0 25px ${ad.color}, inset 0 0 20px ${ad.bgColor}`;
    adBox.style.background = `rgba(0, 0, 0, 0.85)`;

    adBox.innerHTML = `
      <div class="interstitial-logo" style="text-shadow: 0 0 10px ${ad.color}; color: ${ad.color}">${ad.title}</div>
      <div class="interstitial-tagline">${ad.tagline}</div>
      <div class="interstitial-visual" style="border: 1px dashed ${ad.color}; background: ${ad.bgColor}">
        <div class="interstitial-scanline"></div>
        <div class="interstitial-grid-effect"></div>
        <span class="cyber-loading-text" style="color: ${ad.color}">CONEXIÓN DE DATOS ENTRANTE...</span>
      </div>
      <button class="interstitial-action-btn" onclick="admobService.handleAdClick(event)" style="background: ${ad.color}; box-shadow: 0 0 15px ${ad.color}">
        ${ad.actionText}
      </button>
    `;

    // Resetear botón de cerrar y barra de progreso
    closeBtn.disabled = true;
    closeBtn.className = 'interstitial-close-btn';
    closeBtn.textContent = 'CERRANDO EN 5...';
    closeBtn.onclick = null;
    
    progressFill.style.transition = 'none';
    progressFill.style.width = '0%';
    progressFill.style.backgroundColor = ad.color;
    progressFill.style.boxShadow = `0 0 10px ${ad.color}`;

    // Activar animación de progreso
    setTimeout(() => {
      progressFill.style.transition = 'width 5s linear';
      progressFill.style.width = '100%';
    }, 50);

    // Activar el temporizador de 5 segundos
    let timeLeft = 5;
    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        closeBtn.textContent = `CERRANDO EN ${timeLeft}...`;
      } else {
        clearInterval(countdownInterval);
        countdownInterval = null;
        
        // Habilitar botón de cerrar
        playAdSound('unlock');
        closeBtn.disabled = false;
        closeBtn.className = 'interstitial-close-btn active';
        closeBtn.textContent = 'CERRAR ANUNCIO ×';
        closeBtn.onclick = function() {
          admobService.closeInterstitial();
        };
      }
    }, 1000);

    // Mostrar el overlay
    interstitial.classList.add('active');
    console.log(`Anuncio Intersticial AdMob cargado (ID: ${TEST_INTERSTITIAL_ID})`);
  }

  // Cerrar el anuncio intersticial y ejecutar la navegación diferida
  function closeInterstitial() {
    const interstitial = document.getElementById('admob-sim-interstitial');
    if (interstitial) {
      interstitial.classList.remove('active');
    }
    
    playAdSound('click');

    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }

    // Ejecutar el callback guardado
    if (activeCallback) {
      const cb = activeCallback;
      activeCallback = null;
      cb();
    }
  }

  // Manejar clics simulados en las ofertas de los anuncios
  function handleAdClick(e) {
    e.preventDefault();
    playAdSound('click');
    alert('Simulación de AdMob: Redirigiendo a la oferta comercial del patrocinador...');
  }

  return {
    init: init,
    showBanner: showBanner,
    hideBanner: hideBanner,
    showInterstitial: showInterstitial,
    closeInterstitial: closeInterstitial,
    handleAdClick: handleAdClick
  };
})();

// Exponer globalmente
window.admobService = admobService;
