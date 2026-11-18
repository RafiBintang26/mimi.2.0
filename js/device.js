/**
 * DAILY HYDRATION TRACKER - DEVICE IDENTIFICATION & SECURITY ENGINE (js/device.js)
 * Implements persistent device fingerprinting & token hashing (SHA-256)
 * Enforces: 1 HP/Device = 1 Account, 1 Account = 1 Device.
 */

const DeviceSecurity = {
    _cachedHash: null,
    _cachedName: null,

    /**
     * Get or create a persistent cryptographically secure device salt
     */
    getOrCreateDeviceSalt: function() {
        const key = APP_CONFIG.STORAGE_KEYS.DEVICE_SALT;
        let salt = localStorage.getItem(key);
        if (!salt) {
            // Generate 32 bytes cryptographically random values
            const randomBytes = new Uint8Array(32);
            window.crypto.getRandomValues(randomBytes);
            salt = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
            try {
                localStorage.setItem(key, salt);
                // Also set backup in cookie for persistence across simple storage clears
                document.cookie = `${key}=${salt}; path=/; max-age=315360000; SameSite=Strict`;
            } catch (e) {
                console.warn('Storage persistence warning:', e);
            }
        }
        return salt;
    },

    /**
     * Generate Canvas 2D entropy
     */
    getCanvasFingerprint: function() {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 240;
            canvas.height = 60;
            const ctx = canvas.getContext('2d');
            if (!ctx) return 'canvas-disabled';

            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(125, 1, 62, 20);

            ctx.fillStyle = '#06b6d4';
            ctx.fillText('DailyHydration🌊✨<script>2026', 2, 15);
            ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
            ctx.fillText('SecureDeviceID💧', 4, 35);

            return canvas.toDataURL();
        } catch (e) {
            return 'canvas-error';
        }
    },

    /**
     * Get WebGL entropy
     */
    getWebGLFingerprint: function() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) return 'webgl-disabled';

            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
                return `${vendor}~${renderer}`;
            }
            return 'webgl-standard';
        } catch (e) {
            return 'webgl-error';
        }
    },

    /**
     * Generate readable Device Name (e.g. "Samsung Android (Chrome)" or "iPhone (Safari)")
     */
    getDeviceName: function() {
        if (this._cachedName) return this._cachedName;

        const ua = navigator.userAgent;
        let os = 'Unknown OS';
        let browser = 'Browser';

        // Detect OS
        if (/Android/i.test(ua)) {
            const match = ua.match(/Android\s([0-9\.]*)/);
            os = match ? `Android ${match[1]}` : 'Android';
        } else if (/iPhone|iPad|iPod/i.test(ua)) {
            os = 'iOS Device';
        } else if (/Windows NT 10.0/i.test(ua)) {
            os = 'Windows 10/11';
        } else if (/Macintosh/i.test(ua)) {
            os = 'macOS';
        } else if (/Linux/i.test(ua)) {
            os = 'Linux';
        }

        // Detect Browser
        if (/Edg/i.test(ua)) {
            browser = 'Edge';
        } else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) {
            browser = 'Chrome';
        } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
            browser = 'Safari';
        } else if (/Firefox/i.test(ua)) {
            browser = 'Firefox';
        }

        const isMobile = /Mobile|Android|iPhone|iPod/i.test(ua);
        const deviceType = isMobile ? 'Smartphone' : 'Desktop/Laptop';

        this._cachedName = `${deviceType} - ${os} (${browser})`;
        return this._cachedName;
    },

    /**
     * Generate unique device token hash using SHA-256
     */
    getDeviceFingerprintHash: async function() {
        if (this._cachedHash) return this._cachedHash;

        // Check stored token first
        const storedToken = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.DEVICE_TOKEN);
        if (storedToken && storedToken.length === 64) {
            this._cachedHash = storedToken;
            return storedToken;
        }

        const salt = this.getOrCreateDeviceSalt();
        const canvasFp = this.getCanvasFingerprint();
        const webglFp = this.getWebGLFingerprint();

        const entropyData = [
            salt,
            canvasFp,
            webglFp,
            screen.width + 'x' + screen.height,
            screen.colorDepth,
            window.devicePixelRatio || 1,
            navigator.hardwareConcurrency || 2,
            navigator.language || 'id',
            navigator.platform || '',
            new Date().getTimezoneOffset()
        ].join('###');

        // Hash using Web Crypto API SHA-256
        const encoder = new TextEncoder();
        const data = encoder.encode(entropyData);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        this._cachedHash = hashHex;
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.DEVICE_TOKEN, hashHex);
        return hashHex;
    },

    /**
     * Technical limitation explanation for user/admin
     */
    getBrowserLimitationNote: function() {
        return {
            title: "Catatan Keamanan & Keterbatasan Browser",
            details: "Di lingkungan browser web, tidak ada API bawaan yang mengekspos nomor IMEI/Hardware serial number fisik demi privasi pengguna. Sistem Daily Hydration Tracker menggabungkan sidik jari perangkat (Entropy Hardware, Canvas, WebGL, Layar) + Persistent Token Salt yang di-hash dengan SHA-256 dan divalidasi di server Supabase.",
            recommendation: "Jika pengguna berganti HP atau kehilangan perangkat, Admin dapat melakukan 'Reset / Unbind Device' melalui Dashboard Admin untuk mengizinkan login kembali pada perangkat baru."
        };
    }
};

window.DeviceSecurity = DeviceSecurity;
