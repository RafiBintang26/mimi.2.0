/**
 * DAILY HYDRATION TRACKER - UTILITY FUNCTIONS (js/utils.js)
 */

const Utils = {
    /**
     * Escape strings to prevent XSS
     */
    escapeHtml: function(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * Format date in Indonesian locale
     * Example: "Rabu, 18 November 2026"
     */
    formatDateIndo: function(dateInput) {
        const date = dateInput ? new Date(dateInput) : new Date();
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        const dayName = days[date.getDay()];
        const day = date.getDate();
        const monthName = months[date.getMonth()];
        const year = date.getFullYear();

        return `${dayName}, ${day} ${monthName} ${year}`;
    },

    /**
     * Format time in HH:mm WIB
     */
    formatTime: function(dateInput) {
        const date = dateInput ? new Date(dateInput) : new Date();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes} WIB`;
    },

    /**
     * Returns Indonesian time greeting
     */
    getTimeGreeting: function() {
        const hour = new Date().getHours();
        if (hour >= 4 && hour < 11) return 'Selamat Pagi ☀️';
        if (hour >= 11 && hour < 15) return 'Selamat Siang 🌤️';
        if (hour >= 15 && hour < 18) return 'Selamat Sore 🌇';
        return 'Selamat Malam 🌙';
    },

    /**
     * Format ml numbers with dot separators
     */
    formatMl: function(ml) {
        const val = Number(ml) || 0;
        return `${new Intl.NumberFormat('id-ID').format(val)} ml`;
    },

    /**
     * Calculate percentage and clamp
     */
    calcPercentage: function(consumed, target) {
        if (!target || target <= 0) return 0;
        const pct = Math.round((consumed / target) * 100);
        return pct;
    },

    /**
     * Get YYYY-MM-DD string for today or date
     */
    toDateString: function(dateInput) {
        const d = dateInput ? new Date(dateInput) : new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * Synthesize clean audio via Web Audio API (Water drop & Celebration)
     */
    audioCtx: null,

    getAudioContext: function() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.audioCtx = new AudioContext();
            }
        }
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        return this.audioCtx;
    },

    playSound: function(type = 'drop') {
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;

            if (type === 'drop') {
                // Realistic water drop 'bloop' sound
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(1400, now + 0.08);
                osc.frequency.exponentialRampToValueAtTime(450, now + 0.18);

                gain.gain.setValueAtTime(0.01, now);
                gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(now);
                osc.stop(now + 0.24);
            } else if (type === 'success') {
                // Triumphant Hydration Goal Met Arpeggio
                const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
                notes.forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    const startTime = now + (idx * 0.12);

                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, startTime);

                    gain.gain.setValueAtTime(0.01, startTime);
                    gain.gain.linearRampToValueAtTime(0.25, startTime + 0.04);
                    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.38);

                    osc.connect(gain);
                    gain.connect(ctx.destination);

                    osc.start(startTime);
                    osc.stop(startTime + 0.4);
                });
            } else if (type === 'undo') {
                // Soft low pitch pop for undo
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(320, now);
                osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);

                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(now);
                osc.stop(now + 0.16);
            }
        } catch (e) {
            console.warn('Audio playback error (browser policy):', e);
        }
    }
};

window.Utils = Utils;
