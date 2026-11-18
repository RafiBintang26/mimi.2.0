/**
 * DAILY HYDRATION TRACKER - USER PROFILE & DEVICE SETTINGS (js/profile.js)
 */

const Profile = {
    user: null,

    init: async function() {
        this.user = SupabaseService.getCurrentUser();
        if (!this.user) {
            window.location.href = 'login.html';
            return;
        }

        this.renderProfileDetails();
        await this.renderDeviceInfo();
        this.bindEvents();
    },

    renderProfileDetails: function() {
        const nameInput = document.getElementById('profile-fullname');
        const userInput = document.getElementById('profile-username');
        const emailInput = document.getElementById('profile-email');
        const roleBadge = document.getElementById('profile-role-badge');
        const avatarInitial = document.getElementById('profile-avatar-initial');
        const titleName = document.getElementById('profile-title-name');

        if (nameInput) nameInput.value = this.user.full_name || '';
        if (userInput) userInput.value = this.user.username || '';
        if (emailInput) emailInput.value = this.user.email || '';
        if (titleName) titleName.textContent = this.user.full_name || this.user.username;

        if (roleBadge) {
            roleBadge.textContent = this.user.role === 'admin' ? 'Administrator' : 'Pengguna Terverifikasi';
            roleBadge.className = this.user.role === 'admin' ? 'badge badge-warning' : 'badge badge-info';
        }

        if (avatarInitial) {
            avatarInitial.textContent = (this.user.full_name || this.user.username || 'U').charAt(0).toUpperCase();
        }
    },

    renderDeviceInfo: async function() {
        const deviceNameEl = document.getElementById('device-name-display');
        const deviceHashEl = document.getElementById('device-hash-display');
        const deviceStatusEl = document.getElementById('device-status-badge');
        const limitationNoteEl = document.getElementById('browser-limitation-text');

        try {
            const hash = await DeviceSecurity.getDeviceFingerprintHash();
            const name = DeviceSecurity.getDeviceName();
            const note = DeviceSecurity.getBrowserLimitationNote();

            if (deviceNameEl) deviceNameEl.textContent = name;
            if (deviceHashEl) deviceHashEl.textContent = hash;
            if (deviceStatusEl) {
                deviceStatusEl.textContent = 'Terikat (Active)';
                deviceStatusEl.className = 'badge badge-success';
            }
            if (limitationNoteEl) {
                limitationNoteEl.textContent = note.details;
            }
        } catch (e) {
            console.warn('Device info render error:', e);
        }
    },

    bindEvents: function() {
        // Save Profile Form
        const form = document.getElementById('profile-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const fullName = document.getElementById('profile-fullname').value.trim();
                const username = document.getElementById('profile-username').value.trim();

                if (!fullName || !username) {
                    Notifications.showToast('Data Tidak Lengkap', 'Nama dan username tidak boleh kosong.', 'warning');
                    return;
                }

                try {
                    // Update user in session
                    this.user.full_name = fullName;
                    this.user.username = username;
                    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.CURRENT_USER, JSON.stringify(this.user));

                    if (SupabaseService.isLive) {
                        await SupabaseService.client
                            .from('profiles')
                            .update({ full_name: fullName, username: username })
                            .eq('id', this.user.id);
                    }

                    Notifications.showToast('Profil Disimpan', 'Data profil Anda berhasil diperbarui.', 'success');
                    this.renderProfileDetails();
                } catch (err) {
                    Notifications.showToast('Gagal Menyimpan', err.message, 'error');
                }
            });
        }

        // Test Sound Effect
        const testSoundBtn = document.getElementById('btn-test-sound');
        if (testSoundBtn) {
            testSoundBtn.addEventListener('click', () => {
                Utils.playSound('drop');
                Notifications.showToast('Efek Suara', 'Bloop! Suara tetesan air berfungsi dengan baik.', 'info');
            });
        }

        // Request Push Notification
        const notifToggleBtn = document.getElementById('btn-enable-notif');
        if (notifToggleBtn) {
            notifToggleBtn.addEventListener('click', () => {
                Notifications.requestPermission();
            });
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Profile.init();
});

window.Profile = Profile;
