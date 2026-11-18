/**
 * DAILY HYDRATION TRACKER - USER DASHBOARD LOGIC (js/dashboard.js)
 * Visual glass animation, quick-add, undo, target editing, and reminder integration.
 */

const Dashboard = {
    user: null,
    currentGoal: { target_ml: 2000, glass_size_ml: 250 },
    todayLogs: [],
    totalConsumed: 0,
    hasCelebratedToday: false,

    init: async function() {
        this.user = SupabaseService.getCurrentUser();
        if (!this.user) {
            window.location.href = 'login.html';
            return;
        }

        this.renderUserInfo();
        await this.loadGoalAndLogs();
        this.bindEvents();
    },

    renderUserInfo: function() {
        // Time greeting & Date
        const greetingEl = document.getElementById('user-greeting');
        const dateEl = document.getElementById('user-date');
        const nameEl = document.getElementById('user-display-name');
        const avatarEl = document.getElementById('user-avatar-initials');

        if (greetingEl) greetingEl.textContent = Utils.getTimeGreeting();
        if (dateEl) dateEl.textContent = Utils.formatDateIndo();
        if (nameEl) nameEl.textContent = this.user.full_name || this.user.username;
        if (avatarEl) {
            const initial = (this.user.full_name || this.user.username || 'U').charAt(0).toUpperCase();
            avatarEl.textContent = initial;
        }
    },

    loadGoalAndLogs: async function() {
        try {
            // Fetch today's goal
            this.currentGoal = await SupabaseService.getDailyGoal(this.user.id);
            // Fetch today's logs
            this.todayLogs = await SupabaseService.getTodayLogs(this.user.id);

            this.calculateAndRenderMetrics();
            this.renderLogsList();
        } catch (e) {
            console.error('Error loading dashboard data:', e);
            Notifications.showToast('Gagal Memuat Data', 'Tidak dapat mengambil data hidrasi.', 'error');
        }
    },

    calculateAndRenderMetrics: function() {
        // Calculate total ml
        this.totalConsumed = this.todayLogs.reduce((acc, curr) => acc + curr.amount_ml, 0);
        const target = this.currentGoal.target_ml || 2000;
        const remaining = Math.max(0, target - this.totalConsumed);
        const percentage = Utils.calcPercentage(this.totalConsumed, target);

        // Update metric card elements
        const consumedEl = document.getElementById('val-consumed');
        const targetEl = document.getElementById('val-target');
        const remainingEl = document.getElementById('val-remaining');
        const percentageEl = document.getElementById('val-percentage');

        if (consumedEl) consumedEl.textContent = Utils.formatMl(this.totalConsumed);
        if (targetEl) targetEl.textContent = Utils.formatMl(target);
        if (remainingEl) remainingEl.textContent = Utils.formatMl(remaining);
        if (percentageEl) percentageEl.textContent = `${percentage}%`;

        // Update progress bar
        const progressBar = document.getElementById('dashboard-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${Math.min(100, percentage)}%`;
        }

        // Update visual water glass
        this.updateGlassVisual(percentage);

        // Check if goal achieved and celebrate!
        if (percentage >= 100 && !this.hasCelebratedToday) {
            this.hasCelebratedToday = true;
            Notifications.showToast(
                '🎉 Target Tercapai!', 
                `Luar biasa! Anda telah mencapai 100% kebutuhan air minum harian (${Utils.formatMl(this.totalConsumed)}). Pertahankan kebiasaan sehat ini!`, 
                'success',
                6000
            );
            this.triggerCelebrationEffect();
        }
    },

    updateGlassVisual: function(percentage) {
        const waterFill = document.getElementById('water-fill');
        const glassPercent = document.getElementById('glass-percent-badge');
        const clampedPct = Math.min(100, percentage);

        if (waterFill) {
            waterFill.style.height = `${clampedPct}%`;
        }
        if (glassPercent) {
            glassPercent.textContent = `${percentage}%`;
        }
    },

    renderLogsList: function() {
        const container = document.getElementById('today-logs-container');
        const emptyState = document.getElementById('logs-empty-state');
        if (!container) return;

        container.innerHTML = '';

        if (!this.todayLogs || this.todayLogs.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        this.todayLogs.forEach((log, index) => {
            const timeStr = Utils.formatTime(log.consumed_at);
            const item = document.createElement('div');
            item.className = 'log-item';
            item.innerHTML = `
                <div class="log-item-left">
                    <div class="log-item-icon">💧</div>
                    <div class="log-item-info">
                        <h5>Konsumsi Air</h5>
                        <span>${timeStr}</span>
                    </div>
                </div>
                <div class="log-item-right">
                    <span class="log-item-amount">+${Utils.formatMl(log.amount_ml)}</span>
                    <button class="log-delete-btn" title="Hapus catatan ini" data-id="${log.id}">
                        🗑️
                    </button>
                </div>
            `;

            // Delete event
            item.querySelector('.log-delete-btn').addEventListener('click', () => {
                this.handleDeleteLog(log.id, log.amount_ml);
            });

            container.appendChild(item);
        });
    },

    /**
     * Add drink entry
     */
    handleAddDrink: async function(amount) {
        const amountMl = parseInt(amount, 10);
        if (isNaN(amountMl) || amountMl <= 0) return;

        try {
            Utils.playSound('drop');
            const newLog = await SupabaseService.addWaterLog(this.user.id, amountMl);
            this.todayLogs.unshift(newLog);
            this.calculateAndRenderMetrics();
            this.renderLogsList();
            Notifications.showToast('Berhasil Ditambahkan', `+${Utils.formatMl(amountMl)} tercatat. Terus jaga hidrasi!`, 'info', 2500);
        } catch (e) {
            Notifications.showToast('Gagal Menambah Minum', e.message, 'error');
        }
    },

    /**
     * Undo last drink entry
     */
    handleUndoLastDrink: async function() {
        if (!this.todayLogs || this.todayLogs.length === 0) {
            Notifications.showToast('Tidak Ada Catatan', 'Belum ada konsumsi air yang tercatat hari ini.', 'warning');
            return;
        }

        const lastLog = this.todayLogs[0];
        try {
            Utils.playSound('undo');
            await SupabaseService.deleteWaterLog(lastLog.id);
            this.todayLogs.shift();
            this.calculateAndRenderMetrics();
            this.renderLogsList();
            Notifications.showToast('Catatan Dibatalkan', `Telah membatalkan konsumsi -${Utils.formatMl(lastLog.amount_ml)}.`, 'info');
        } catch (e) {
            Notifications.showToast('Gagal Membatalkan', e.message, 'error');
        }
    },

    /**
     * Delete individual drink entry
     */
    handleDeleteLog: async function(logId, amountMl) {
        if (!confirm(`Hapus catatan ${Utils.formatMl(amountMl)} ini?`)) return;

        try {
            Utils.playSound('undo');
            await SupabaseService.deleteWaterLog(logId);
            this.todayLogs = this.todayLogs.filter(l => l.id !== logId);
            this.calculateAndRenderMetrics();
            this.renderLogsList();
            Notifications.showToast('Catatan Dihapus', 'Data konsumsi air berhasil dihapus.', 'info');
        } catch (e) {
            Notifications.showToast('Gagal Menghapus', e.message, 'error');
        }
    },

    /**
     * Save updated daily goal & glass size
     */
    handleSaveGoal: async function(targetMl, glassSizeMl) {
        try {
            const updated = await SupabaseService.setDailyGoal(this.user.id, targetMl, glassSizeMl);
            this.currentGoal = updated;
            this.calculateAndRenderMetrics();
            this.updatePresetButtons(glassSizeMl);
            Notifications.showToast('Target Disimpan', `Target harian diubah menjadi ${Utils.formatMl(targetMl)}.`, 'success');
        } catch (e) {
            Notifications.showToast('Gagal Menyimpan Target', e.message, 'error');
        }
    },

    updatePresetButtons: function(glassSize) {
        const mainGlassBtn = document.getElementById('preset-main-glass');
        if (mainGlassBtn) {
            mainGlassBtn.setAttribute('data-amount', glassSize);
            const volEl = mainGlassBtn.querySelector('.preset-vol');
            if (volEl) volEl.textContent = `${glassSize} ml`;
        }
    },

    triggerCelebrationEffect: function() {
        // Trigger subtle confetti-like particle animation
        for (let i = 0; i < 20; i++) {
            const drop = document.createElement('div');
            drop.style.position = 'fixed';
            drop.style.top = `${Math.random() * 50}%`;
            drop.style.left = `${Math.random() * 100}%`;
            drop.style.fontSize = '2rem';
            drop.style.pointerEvents = 'none';
            drop.style.zIndex = '9999';
            drop.textContent = ['💧', '✨', '🎉', '🌟'][Math.floor(Math.random() * 4)];
            drop.style.transition = 'all 1.5s ease-out';
            document.body.appendChild(drop);

            requestAnimationFrame(() => {
                drop.style.transform = `translateY(${100 + Math.random() * 200}px) scale(1.5) rotate(${Math.random() * 360}deg)`;
                drop.style.opacity = '0';
            });

            setTimeout(() => {
                if (drop.parentNode) drop.parentNode.removeChild(drop);
            }, 1600);
        }
    },

    bindEvents: function() {
        // Main Add Water Button (Default Glass Size)
        const mainAddBtn = document.getElementById('main-add-water-btn');
        if (mainAddBtn) {
            mainAddBtn.addEventListener('click', () => {
                this.handleAddDrink(this.currentGoal.glass_size_ml || 250);
            });
        }

        // Undo Button
        const undoBtn = document.getElementById('undo-drink-btn');
        if (undoBtn) {
            undoBtn.addEventListener('click', () => this.handleUndoLastDrink());
        }

        // Quick Preset Buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const amount = btn.getAttribute('data-amount');
                if (amount) this.handleAddDrink(amount);
            });
        });

        // Custom Add Button & Input
        const customAddBtn = document.getElementById('custom-add-btn');
        const customInput = document.getElementById('custom-amount-input');
        if (customAddBtn && customInput) {
            customAddBtn.addEventListener('click', () => {
                const val = customInput.value;
                if (!val || val <= 0) {
                    Notifications.showToast('Jumlah Tidak Valid', 'Masukkan jumlah mililiter air.', 'warning');
                    return;
                }
                this.handleAddDrink(val);
                customInput.value = '';
            });
        }

        // Goal Modal Open & Form Submit
        const openGoalModalBtn = document.getElementById('open-goal-modal-btn');
        const goalModal = document.getElementById('goal-settings-modal');
        const closeGoalModalBtn = document.getElementById('close-goal-modal-btn');
        const goalForm = document.getElementById('goal-settings-form');

        if (openGoalModalBtn && goalModal) {
            openGoalModalBtn.addEventListener('click', () => {
                document.getElementById('input-target-ml').value = this.currentGoal.target_ml || 2000;
                document.getElementById('input-glass-size-ml').value = this.currentGoal.glass_size_ml || 250;
                goalModal.classList.add('active');
            });
        }

        if (closeGoalModalBtn && goalModal) {
            closeGoalModalBtn.addEventListener('click', () => goalModal.classList.remove('active'));
        }

        if (goalForm && goalModal) {
            goalForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const target = document.getElementById('input-target-ml').value;
                const glass = document.getElementById('input-glass-size-ml').value;
                await this.handleSaveGoal(target, glass);
                goalModal.classList.remove('active');
            });
        }

        // Request notification button
        const notifBtn = document.getElementById('request-notif-btn');
        if (notifBtn) {
            notifBtn.addEventListener('click', () => {
                Notifications.requestPermission();
            });
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Dashboard.init();
});

window.Dashboard = Dashboard;
