/**
 * DAILY HYDRATION TRACKER - NOTIFICATIONS & REMINDERS ENGINE (js/notifications.js)
 */

const Notifications = {
    toastContainer: null,
    reminderInterval: null,

    init: function() {
        if (!this.toastContainer) {
            let container = document.getElementById('toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'toast-container';
                document.body.appendChild(container);
            }
            this.toastContainer = container;
        }

        this.startReminderWatcher();
    },

    /**
     * Show animated modern toast
     */
    showToast: function(title, message, type = 'info', duration = 4000) {
        this.init();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = {
            success: '🎉',
            error: '⚠️',
            warning: '🔔',
            info: '💧'
        };

        toast.innerHTML = `
            <div class="toast-icon" style="font-size: 1.4rem;">${icons[type] || '💧'}</div>
            <div style="flex: 1;">
                <div class="toast-title">${Utils.escapeHtml(title)}</div>
                <div class="toast-message">${Utils.escapeHtml(message)}</div>
            </div>
            <button class="toast-close" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:1.1rem;padding:0 0.2rem;">&times;</button>
        `;

        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.dismissToast(toast);
        });

        this.toastContainer.appendChild(toast);

        // Play matching sound
        if (type === 'success') {
            Utils.playSound('success');
        } else if (type === 'info') {
            Utils.playSound('drop');
        }

        // Trigger slide-in
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto dismiss
        const timer = setTimeout(() => {
            this.dismissToast(toast);
        }, duration);

        toast._timer = timer;
    },

    dismissToast: function(toast) {
        if (!toast || !toast.parentNode) return;
        clearTimeout(toast._timer);
        toast.classList.remove('show');
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    },

    /**
     * Request Browser System Notification Permission
     */
    requestPermission: async function() {
        if (!('Notification' in window)) {
            this.showToast('Browser Tidak Mendukung', 'Browser Anda belum mendukung notifikasi sistem desktop/HP.', 'warning');
            return false;
        }

        if (Notification.permission === 'granted') {
            this.showToast('Notifikasi Aktif', 'Notifikasi sistem pengingat hidrasi sudah aktif!', 'success');
            return true;
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            this.showToast('Izin Diberikan! 💧', 'Anda akan menerima pengingat berkala untuk minum air.', 'success');
            return true;
        } else {
            this.showToast('Izin Ditolak', 'Pengingat akan ditampilkan melalui notifikasi pop-up di dalam website.', 'warning');
            return false;
        }
    },

    /**
     * Fire system push/desktop notification
     */
    sendSystemNotification: function(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification(title, {
                    body: body,
                    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%230284c7"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>'
                });
            } catch (e) {
                console.warn('System notification error:', e);
            }
        }
    },

    /**
     * Periodic reminder watcher: checks every 60 seconds
     */
    startReminderWatcher: function() {
        if (this.reminderInterval) return;

        this.reminderInterval = setInterval(() => {
            const userStr = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.CURRENT_USER);
            if (!userStr) return;

            const now = new Date();
            const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const lastPing = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.LAST_REMINDER_CHECK);

            // Avoid double pings in the same minute
            if (lastPing === currentHourMin) return;

            const reminders = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.REMINDERS) || '[]');
            const activeMatch = reminders.find(r => r.is_enabled && r.reminder_time.startsWith(currentHourMin));

            if (activeMatch) {
                localStorage.setItem(APP_CONFIG.STORAGE_KEYS.LAST_REMINDER_CHECK, currentHourMin);
                const title = '💧 Waktunya Minum Air!';
                const message = 'Segelas air akan mengembalikan fokus dan hidrasi tubuh Anda.';
                this.showToast(title, message, 'info', 6000);
                this.sendSystemNotification(title, message);
            }
        }, 15000); // Check every 15 seconds
    }
};

window.Notifications = Notifications;
