/**
 * DAILY HYDRATION TRACKER - ADMIN DASHBOARD LOGIC (js/admin.js)
 * Full monitoring, analytics, user management, and device unbind controls.
 */

const AdminDashboard = {
    user: null,
    allUsers: [],
    filteredUsers: [],
    userModalChart: null,

    init: async function() {
        this.user = SupabaseService.getCurrentUser();
        if (!this.user || this.user.role !== 'admin') {
            alert('Akses Ditolak: Anda tidak memiliki wewenang Administrator.');
            window.location.href = 'dashboard.html';
            return;
        }

        this.bindEvents();
        await this.loadOverallStats();
        await this.loadUsersTable();
    },

    bindEvents: function() {
        // Search bar
        const searchInput = document.getElementById('admin-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterUsers(e.target.value);
            });
        }

        // Status Filter
        const statusFilter = document.getElementById('admin-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.applyFilters());
        }

        // Sort Filter
        const sortFilter = document.getElementById('admin-sort-filter');
        if (sortFilter) {
            sortFilter.addEventListener('change', () => this.applyFilters());
        }

        // User detail modal close
        const closeModalBtn = document.getElementById('close-user-modal-btn');
        const modal = document.getElementById('user-detail-modal');
        if (closeModalBtn && modal) {
            closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));
        }
    },

    loadOverallStats: async function() {
        try {
            const stats = await SupabaseService.getAdminDashboardStats();

            const totalUsersEl = document.getElementById('stat-admin-total-users');
            const activeTodayEl = document.getElementById('stat-admin-active-today');
            const achievedEl = document.getElementById('stat-admin-achieved');
            const notAchievedEl = document.getElementById('stat-admin-not-achieved');
            const totalVolEl = document.getElementById('stat-admin-total-vol');

            if (totalUsersEl) totalUsersEl.textContent = stats.total_users || 0;
            if (activeTodayEl) activeTodayEl.textContent = stats.active_users_today || 0;
            if (achievedEl) achievedEl.textContent = stats.achieved_target_today || 0;
            if (notAchievedEl) notAchievedEl.textContent = stats.not_achieved_today || 0;
            if (totalVolEl) totalVolEl.textContent = Utils.formatMl(stats.total_consumed_ml_today || 0);
        } catch (e) {
            console.error('Error loading admin stats:', e);
            Notifications.showToast('Gagal Memuat Statistik', e.message, 'error');
        }
    },

    loadUsersTable: async function() {
        try {
            this.allUsers = await SupabaseService.getAdminUsersList();
            this.applyFilters();
        } catch (e) {
            console.error('Error loading admin users table:', e);
            Notifications.showToast('Gagal Memuat Pengguna', e.message, 'error');
        }
    },

    applyFilters: function() {
        const searchVal = (document.getElementById('admin-search-input')?.value || '').toLowerCase().trim();
        const statusVal = document.getElementById('admin-status-filter')?.value || 'all';
        const sortVal = document.getElementById('admin-sort-filter')?.value || 'progress-desc';

        let list = [...this.allUsers];

        // Search
        if (searchVal) {
            list = list.filter(u => 
                (u.full_name || '').toLowerCase().includes(searchVal) ||
                (u.username || '').toLowerCase().includes(searchVal) ||
                (u.email || '').toLowerCase().includes(searchVal)
            );
        }

        // Status filter
        if (statusVal === 'achieved') {
            list = list.filter(u => u.progress_pct >= 100);
        } else if (statusVal === 'in_progress') {
            list = list.filter(u => u.progress_pct > 0 && u.progress_pct < 100);
        } else if (statusVal === 'not_started') {
            list = list.filter(u => u.progress_pct === 0);
        } else if (statusVal === 'inactive') {
            list = list.filter(u => !u.is_active);
        }

        // Sorting
        if (sortVal === 'progress-desc') {
            list.sort((a, b) => b.progress_pct - a.progress_pct);
        } else if (sortVal === 'progress-asc') {
            list.sort((a, b) => a.progress_pct - b.progress_pct);
        } else if (sortVal === 'name-asc') {
            list.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
        }

        this.filteredUsers = list;
        this.renderTable(list);
    },

    renderTable: function(users) {
        const tbody = document.getElementById('admin-users-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!users || users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align:center;padding:2rem;color:var(--text-muted);">
                        Tidak ada pengguna yang sesuai dengan filter pencarian.
                    </td>
                </tr>
            `;
            return;
        }

        users.forEach((u, index) => {
            const tr = document.createElement('tr');
            const initial = (u.full_name || u.username || 'U').charAt(0).toUpperCase();

            let statusBadge = '<span class="badge badge-secondary">Belum Mulai</span>';
            if (!u.is_active) {
                statusBadge = '<span class="badge badge-danger">Nonaktif</span>';
            } else if (u.progress_pct >= 100) {
                statusBadge = '<span class="badge badge-success">✓ Tercapai</span>';
            } else if (u.progress_pct > 0) {
                statusBadge = '<span class="badge badge-info">Proses</span>';
            }

            const regDate = u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

            tr.innerHTML = `
                <td><strong>${index + 1}</strong></td>
                <td>
                    <div class="user-cell">
                        <div class="user-cell-avatar">${initial}</div>
                        <div>
                            <div class="user-cell-name">${Utils.escapeHtml(u.full_name)}</div>
                            <div class="user-cell-user">@${Utils.escapeHtml(u.username)}</div>
                        </div>
                    </div>
                </td>
                <td>${Utils.escapeHtml(u.email)}</td>
                <td>${Utils.formatMl(u.target_ml)}</td>
                <td><strong>${Utils.formatMl(u.consumed_today_ml)}</strong></td>
                <td>
                    <div style="display:flex;align-items:center;gap:0.4rem;">
                        <div class="progress-bar-wrapper" style="width:60px;height:7px;">
                            <div class="progress-bar-fill" style="width:${Math.min(100, u.progress_pct)}%"></div>
                        </div>
                        <span style="font-size:0.8rem;font-weight:700;">${u.progress_pct}%</span>
                    </div>
                </td>
                <td>${statusBadge}</td>
                <td style="font-size:0.85rem;color:var(--text-muted);">${regDate}</td>
                <td>
                    <div style="display:flex;gap:0.4rem;">
                        <button class="btn btn-sm btn-outline view-detail-btn" data-id="${u.id}" title="Lihat Detail & Riwayat">
                            🔍 Detail
                        </button>
                    </div>
                </td>
            `;

            tr.querySelector('.view-detail-btn').addEventListener('click', () => {
                this.openUserDetailModal(u);
            });

            tbody.appendChild(tr);
        });
    },

    openUserDetailModal: async function(u) {
        const modal = document.getElementById('user-detail-modal');
        if (!modal) return;

        document.getElementById('modal-user-name').textContent = u.full_name;
        document.getElementById('modal-user-username').textContent = `@${u.username}`;
        document.getElementById('modal-user-email').textContent = u.email;
        document.getElementById('modal-user-device-name').textContent = u.device_name || 'Tidak ada perangkat terikat';
        document.getElementById('modal-user-device-hash').textContent = u.device_hash ? u.device_hash.substring(0, 32) + '...' : '-';

        // Account status toggle button
        const toggleStatusBtn = document.getElementById('modal-btn-toggle-status');
        if (toggleStatusBtn) {
            toggleStatusBtn.textContent = u.is_active ? 'Nonaktifkan Akun' : 'Aktifkan Akun';
            toggleStatusBtn.className = u.is_active ? 'btn btn-sm btn-danger' : 'btn btn-sm btn-primary';
            toggleStatusBtn.onclick = async () => {
                const newStatus = !u.is_active;
                await SupabaseService.adminToggleUserStatus(u.id, newStatus);
                u.is_active = newStatus;
                Notifications.showToast('Status Akun Berubah', `Akun ${u.full_name} kini ${newStatus ? 'Aktif' : 'Dinonaktifkan'}.`, 'info');
                this.openUserDetailModal(u);
                this.loadUsersTable();
            };
        }

        // Unbind Device Button
        const unbindBtn = document.getElementById('modal-btn-unbind-device');
        if (unbindBtn) {
            unbindBtn.onclick = async () => {
                if (confirm(`Apakah Anda yakin ingin melepas ikatan perangkat untuk ${u.full_name}? Pengguna dapat mengikat HP/perangkat baru.`)) {
                    await SupabaseService.adminUnbindDevice(u.id);
                    u.device_name = 'Perangkat Di-reset (Belum Terikat)';
                    u.device_hash = '';
                    Notifications.showToast('Perangkat Di-reset', 'Ikatan perangkat berhasil dilepas. Pengguna kini dapat mendaftar/login di perangkat baru.', 'success');
                    this.openUserDetailModal(u);
                    this.loadUsersTable();
                }
            };
        }

        // Render User's 7-Day Chart in Modal
        modal.classList.add('active');
        await this.renderModalUserChart(u.id);
    },

    renderModalUserChart: async function(userId) {
        const canvas = document.getElementById('modal-user-chart-canvas');
        if (!canvas || !window.Chart) return;

        try {
            const data = await SupabaseService.getUserStats(userId, 7);
            const labels = data.map(d => d.label);
            const intakes = data.map(d => d.total_ml);
            const targets = data.map(d => d.target_ml);

            if (this.userModalChart) {
                this.userModalChart.destroy();
            }

            const ctx = canvas.getContext('2d');
            this.userModalChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Konsumsi (ml)',
                            data: intakes,
                            backgroundColor: 'rgba(2, 132, 199, 0.8)',
                            borderRadius: 6
                        },
                        {
                            label: 'Target (ml)',
                            data: targets,
                            type: 'line',
                            borderColor: '#10b981',
                            borderWidth: 2,
                            fill: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        } catch (e) {
            console.warn('Error loading modal chart:', e);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    AdminDashboard.init();
});

window.AdminDashboard = AdminDashboard;
