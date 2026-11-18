/**
 * DAILY HYDRATION TRACKER - USER STATISTICS & CHARTS (js/statistics.js)
 * Modern Chart.js integration for 7-day and 30-day hydration analytics.
 */

const Statistics = {
    user: null,
    chartInstance: null,
    currentRange: 7,

    init: async function() {
        this.user = SupabaseService.getCurrentUser();
        if (!this.user) {
            window.location.href = 'login.html';
            return;
        }

        this.bindEvents();
        await this.loadAndRenderStats(7);
    },

    bindEvents: function() {
        const pill7d = document.getElementById('pill-7d');
        const pill30d = document.getElementById('pill-30d');

        if (pill7d && pill30d) {
            pill7d.addEventListener('click', () => {
                pill7d.classList.add('active');
                pill30d.classList.remove('active');
                this.loadAndRenderStats(7);
            });

            pill30d.addEventListener('click', () => {
                pill30d.classList.add('active');
                pill7d.classList.remove('active');
                this.loadAndRenderStats(30);
            });
        }
    },

    loadAndRenderStats: async function(days = 7) {
        this.currentRange = days;
        try {
            const data = await SupabaseService.getUserStats(this.user.id, days);
            this.renderSummaryCards(data);
            this.renderChart(data);
            this.renderHistoryTable(data);
        } catch (e) {
            console.error('Error rendering statistics:', e);
            Notifications.showToast('Gagal Memuat Statistik', e.message, 'error');
        }
    },

    renderSummaryCards: function(data) {
        if (!data || data.length === 0) return;

        const totalMl = data.reduce((acc, curr) => acc + curr.total_ml, 0);
        const avgDaily = Math.round(totalMl / data.length);
        const achievedDays = data.filter(d => d.achieved).length;
        const successRate = Math.round((achievedDays / data.length) * 100);

        const avgEl = document.getElementById('stat-avg-daily');
        const achievedEl = document.getElementById('stat-days-achieved');
        const rateEl = document.getElementById('stat-success-rate');
        const totalEl = document.getElementById('stat-total-period');

        if (avgEl) avgEl.textContent = Utils.formatMl(avgDaily);
        if (achievedEl) achievedEl.textContent = `${achievedDays} dari ${data.length} Hari`;
        if (rateEl) rateEl.textContent = `${successRate}%`;
        if (totalEl) totalEl.textContent = Utils.formatMl(totalMl);
    },

    renderChart: function(data) {
        const canvas = document.getElementById('hydration-chart-canvas');
        if (!canvas || !window.Chart) return;

        const labels = data.map(d => d.label);
        const intakes = data.map(d => d.total_ml);
        const targets = data.map(d => d.target_ml);

        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(2, 132, 199, 0.45)');
        gradient.addColorStop(1, 'rgba(2, 132, 199, 0.02)');

        this.chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Konsumsi Air (ml)',
                        data: intakes,
                        backgroundColor: data.map(d => d.achieved ? 'rgba(2, 132, 199, 0.85)' : 'rgba(56, 189, 248, 0.6)'),
                        borderRadius: 8,
                        borderSkipped: false,
                        order: 2
                    },
                    {
                        label: 'Target Harian (ml)',
                        data: targets,
                        type: 'line',
                        borderColor: '#10b981',
                        borderWidth: 2.5,
                        borderDash: [5, 5],
                        fill: false,
                        pointRadius: 3,
                        pointBackgroundColor: '#10b981',
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: { family: 'Plus Jakarta Sans', weight: 600 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` ${context.dataset.label}: ${context.raw.toLocaleString('id-ID')} ml`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value + ' ml';
                            }
                        },
                        grid: {
                            color: '#f1f5f9'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    },

    renderHistoryTable: function(data) {
        const tbody = document.getElementById('history-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        // Reverse to show most recent first
        const reversed = [...data].reverse();

        reversed.forEach((row, idx) => {
            const tr = document.createElement('tr');
            const pct = Utils.calcPercentage(row.total_ml, row.target_ml);
            const statusBadge = row.achieved
                ? `<span class="badge badge-success">✓ Tercapai</span>`
                : `<span class="badge badge-warning">Belum Tercapai</span>`;

            tr.innerHTML = `
                <td><strong>${row.label}</strong></td>
                <td>${Utils.formatMl(row.target_ml)}</td>
                <td><strong>${Utils.formatMl(row.total_ml)}</strong></td>
                <td>
                    <div style="display:flex;align-items:center;gap:0.5rem;">
                        <div class="progress-bar-wrapper" style="width:70px;height:8px;">
                            <div class="progress-bar-fill" style="width:${Math.min(100, pct)}%"></div>
                        </div>
                        <span style="font-size:0.8rem;font-weight:700;">${pct}%</span>
                    </div>
                </td>
                <td>${statusBadge}</td>
            `;
            tbody.appendChild(tr);
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Statistics.init();
});

window.Statistics = Statistics;
