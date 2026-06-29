/**
 * Neon Chess - Service for Premium Purchases via RevenueCat
 * Maneja compras in-app, entitlements premium e integración nativa/web.
 */

const premiumService = (function() {
  const ENTITLEMENT_ID = 'premium';
  // API Key pública de RevenueCat para Google Play (se actualiza en el dashboard)
  const GOOGLE_API_KEY = 'goog_placeholder_api_key_neon_chess'; 
  
  let activeAdCallback = null;

  // Generador de sonido sintético de éxito/error de compra usando Web Audio API
  function playPurchaseSound(type) {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'success') {
        // Sonido de compra exitosa (arpegio de neón ascendente)
        const now = audioCtx.currentTime;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6
        gainNode.gain.setValueAtTime(0.08, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (type === 'cancel' || type === 'error') {
        // Sonido de fallo/cancelación (tono descendente apagado)
        const now = audioCtx.currentTime;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.3);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (e) {
      console.warn('Audio Context de compra no disponible:', e);
    }
  }

  // Verificar si estamos en un ambiente nativo con el plugin Purchases de Capacitor
  function getPurchasesPlugin() {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Purchases) {
      return window.Capacitor.Plugins.Purchases;
    }
    return null;
  }

  // Inicializar servicio
  async function init() {
    const Purchases = getPurchasesPlugin();
    
    if (Purchases) {
      console.log('RevenueCat: Detectado ambiente nativo. Configurando Purchases...');
      try {
        await Purchases.configure({ 
          apiKey: GOOGLE_API_KEY,
          appUserID: null // Se puede vincular con Firebase UID si se desea
        });
        
        // Consultar estado de compras previo
        const customerInfo = await Purchases.getCustomerInfo();
        checkEntitlement(customerInfo);
      } catch (err) {
        console.error('Error al inicializar RevenueCat Purchases nativo:', err);
        // Fallback a simulación por si hay error crítico de red/configuración
        loadSimulatedState();
      }
    } else {
      console.log('RevenueCat: Ejecución en navegador web. Cargando simulación...');
      loadSimulatedState();
    }

    updateUI();
  }

  // Comprobar si el entitlement Premium está activo
  function checkEntitlement(customerInfo) {
    if (customerInfo && customerInfo.entitlements && customerInfo.entitlements.active) {
      const isPremium = typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
      window.isPremiumUser = isPremium;
      console.log(`RevenueCat: Entitlement "${ENTITLEMENT_ID}" activo =`, isPremium);
    } else {
      window.isPremiumUser = false;
    }
    updateUI();
  }

  // Cargar estado de simulación web
  function loadSimulatedState() {
    const isPremium = localStorage.getItem('neon_premium_user') === 'true';
    window.isPremiumUser = isPremium;
    console.log('Simulador Premium: Estado cargado =', isPremium);
  }

  // Actualizar la interfaz de usuario en base al estado premium
  function updateUI() {
    const isPremium = !!window.isPremiumUser;

    // 1. Modificar botón "Apoyar Proyecto" (Donate) para que actúe como botón de suscripción premium en la versión móvil
    const donateBtn = document.querySelector('.donate-btn');
    if (donateBtn) {
      if (isPremium) {
        donateBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style="color: #ff00ff; margin-right: 8px;">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          PREMIUM ACTIVADO ⚡
        `;
        donateBtn.style.background = 'linear-gradient(45deg, rgba(255, 0, 255, 0.15), rgba(0, 255, 255, 0.15))';
        donateBtn.style.borderColor = 'rgba(0, 255, 255, 0.4)';
        donateBtn.style.boxShadow = '0 0 10px rgba(0, 255, 255, 0.2)';
        donateBtn.style.cursor = 'default';
        donateBtn.onclick = null;
      } else {
        donateBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style="color: #00ffff; margin-right: 8px;">
            <path d="M12 2L2 22h20L12 2zm0 3.99L19.53 19H4.47L12 5.99zM12 17c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1zm0-3c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1s-1 .45-1 1v4c0 .55.45 1 1 1z"/>
          </svg>
          ELIMINAR PUBLICIDAD ⚡
        `;
        donateBtn.style.background = 'linear-gradient(45deg, #ff00ff, #00ffff)';
        donateBtn.style.borderColor = '#ff00ff';
        donateBtn.style.boxShadow = '0 0 15px rgba(255, 0, 255, 0.5)';
        donateBtn.style.cursor = 'pointer';
        donateBtn.onclick = function() {
          premiumService.showPaywall();
        };
      }
    }

    // 2. Si el usuario es Premium, ocultar anuncios visibles actuales
    if (isPremium && typeof admobService !== 'undefined') {
      admobService.hideBanner();
    }
  }

  // Iniciar flujo de compra de suscripción
  async function purchase() {
    const Purchases = getPurchasesPlugin();
    const buyBtn = document.getElementById('premium-buy-btn');
    
    if (buyBtn) {
      buyBtn.disabled = true;
      buyBtn.textContent = 'CONECTANDO AL ENLACE...';
    }

    if (Purchases) {
      try {
        console.log('RevenueCat: Cargando ofertas de la tienda...');
        const offerings = await Purchases.getOfferings();
        if (offerings.current && offerings.current.availablePackages.length > 0) {
          // Tomar el primer paquete disponible (ej. Lifetime o Suscripción mensual)
          const pkg = offerings.current.availablePackages[0];
          console.log(`RevenueCat: Comprando paquete: ${pkg.identifier}`);
          
          const result = await Purchases.purchasePackage({ aPackage: pkg });
          checkEntitlement(result.customerInfo);
          
          if (window.isPremiumUser) {
            playPurchaseSound('success');
            alert('¡Enlace neural Premium establecido! La publicidad ha sido eliminada para siempre.');
            closePaywall();
          } else {
            playPurchaseSound('cancel');
          }
        } else {
          throw new Error('No hay productos activos configurados en RevenueCat.');
        }
      } catch (err) {
        console.error('Error al realizar compra nativa:', err);
        playPurchaseSound('error');
        alert('Error en la pasarela de pago: ' + (err.message || err));
      } finally {
        if (buyBtn) {
          buyBtn.disabled = false;
          buyBtn.textContent = 'ADQUIRIR ACCESO ILIMITADO';
        }
      }
    } else {
      // Simulación en entorno web
      setTimeout(() => {
        window.isPremiumUser = true;
        localStorage.setItem('neon_premium_user', 'true');
        playPurchaseSound('success');
        updateUI();
        alert('Simulación: ¡Compra realizada con éxito! Se ha activado el Premium en tu navegador.');
        if (buyBtn) {
          buyBtn.disabled = false;
          buyBtn.textContent = 'ADQUIRIR ACCESO ILIMITADO';
        }
        closePaywall();
      }, 1500);
    }
  }

  // Restaurar compras previas
  async function restore() {
    const Purchases = getPurchasesPlugin();
    
    if (Purchases) {
      try {
        console.log('RevenueCat: Restaurando transacciones...');
        const customerInfo = await Purchases.restorePurchases();
        checkEntitlement(customerInfo);
        if (window.isPremiumUser) {
          playPurchaseSound('success');
          alert('¡Compras restauradas con éxito! Acceso Premium activado.');
          closePaywall();
        } else {
          playPurchaseSound('cancel');
          alert('No se encontraron compras válidas para este usuario.');
        }
      } catch (err) {
        console.error('Error al restaurar compras:', err);
        playPurchaseSound('error');
        alert('Fallo al restaurar transacciones: ' + err.message);
      }
    } else {
      // Simulación en entorno web
      alert('Simulación: Restaurando compras desde almacenamiento local...');
      loadSimulatedState();
      if (window.isPremiumUser) {
        playPurchaseSound('success');
        alert('Simulación: Compras locales restauradas.');
        closePaywall();
      } else {
        playPurchaseSound('cancel');
        alert('Simulación: No hay compras guardadas localmente.');
      }
    }
  }

  // Métodos de visualización de modales
  function showPaywall() {
    const paywall = document.getElementById('premium-modal');
    if (paywall) paywall.classList.add('active');
  }

  function closePaywall() {
    const paywall = document.getElementById('premium-modal');
    if (paywall) paywall.classList.remove('active');
  }

  function showPrompt(adCallback) {
    activeAdCallback = adCallback;
    const prompt = document.getElementById('premium-prompt-modal');
    if (prompt) {
      prompt.classList.add('active');
    } else {
      // Si no existe el prompt por algún motivo, seguir con el juego
      if (activeAdCallback) {
        const cb = activeAdCallback;
        activeAdCallback = null;
        cb();
      }
    }
  }

  function closePrompt(wantsPremium = false) {
    const prompt = document.getElementById('premium-prompt-modal');
    if (prompt) prompt.classList.remove('active');

    // Si pulsó adquirir premium, abrir el paywall
    if (wantsPremium) {
      showPaywall();
    }

    // Ejecutar la navegación del juego diferida
    if (activeAdCallback) {
      const cb = activeAdCallback;
      activeAdCallback = null;
      cb();
    }
  }

  return {
    init: init,
    purchase: purchase,
    restore: restore,
    showPaywall: showPaywall,
    closePaywall: closePaywall,
    showPrompt: showPrompt,
    closePrompt: closePrompt,
    updateUI: updateUI
  };
})();

// Carga sincrónica del estado premium local para evitar parpadeos y desincronización en el arranque
window.premiumService = premiumService;
window.isPremiumUser = (typeof localStorage !== 'undefined' && localStorage.getItem('neon_premium_user') === 'true');

document.addEventListener('DOMContentLoaded', () => {
  premiumService.init();
});
