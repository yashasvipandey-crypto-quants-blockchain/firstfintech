/* ═══════════════════════════════════════════════════════
   FIDUCIA DASHBOARD — JavaScript
   Chart rendering and animations
═══════════════════════════════════════════════════════ */

'use strict';

const stockMetadata = {
    "RELIANCE.NS": { name: "Reliance Industries Ltd.", sector: "Energy & Retail • NSE" },
    "HDFCBANK.NS": { name: "HDFC Bank Ltd.", sector: "Banking & Financial Services • NSE" }
};

const urlParams = new URLSearchParams(window.location.search);
const currentTicker = (urlParams.get('ticker') || 'RELIANCE.NS').toUpperCase();
let priceChartInstance = null;

function getChartThemeColors() {
    const isDark = document.body.classList.contains('dark-mode');
    return {
        axis: isDark ? '#aab6d3' : '#4a5568',
        grid: isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(102, 126, 234, 0.07)',
        tooltipBg: isDark ? 'rgba(8, 12, 24, 0.96)' : 'rgba(15, 17, 30, 0.92)',
        tooltipTitle: isDark ? '#cbd5e1' : '#a0aec0',
        tooltipBody: isDark ? '#eef2ff' : '#e2e8f0',
        tooltipBorder: isDark ? 'rgba(148, 163, 184, 0.28)' : 'rgba(102, 126, 234, 0.35)'
    };
}

function syncChartTheme() {
    if (!priceChartInstance) return;

    const colors = getChartThemeColors();
    priceChartInstance.options.scales.x.ticks.color = colors.axis;
    priceChartInstance.options.scales.y.ticks.color = colors.axis;
    priceChartInstance.options.scales.y.grid.color = colors.grid;
    priceChartInstance.options.plugins.tooltip.backgroundColor = colors.tooltipBg;
    priceChartInstance.options.plugins.tooltip.titleColor = colors.tooltipTitle;
    priceChartInstance.options.plugins.tooltip.bodyColor = colors.tooltipBody;
    priceChartInstance.options.plugins.tooltip.borderColor = colors.tooltipBorder;
    priceChartInstance.update('none');
}

function updateCompanyMetadata() {
    const metadata = stockMetadata[currentTicker] || {
        name: currentTicker,
        sector: currentTicker.includes('.') ? `${currentTicker.split('.')[1]} Exchange` : 'NSE'
    };

    const nameEl = document.getElementById('company-name');
    const tickerEl = document.getElementById('company-ticker');
    const sectorEl = document.getElementById('company-sector');
    const dropdown = document.getElementById('stock-dropdown');

    if (nameEl) nameEl.innerText = metadata.name;
    if (tickerEl) tickerEl.innerText = currentTicker;
    if (sectorEl) sectorEl.innerText = metadata.sector;
    if (dropdown) dropdown.value = currentTicker;
}

function initStockDropdown() {
    const dropdown = document.getElementById('stock-dropdown');
    if (!dropdown) return;

    dropdown.value = currentTicker;
    dropdown.addEventListener('change', (e) => {
        window.location.href = '/dashboard?ticker=' + e.target.value;
    });
}

function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    const savedTheme = localStorage.getItem('fiducia-theme');
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = savedTheme ? savedTheme === 'dark' : prefersDark;

    document.body.classList.toggle('dark-mode', shouldUseDark);
    themeToggle.setAttribute('aria-pressed', String(shouldUseDark));

    themeToggle.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-mode');
        themeToggle.setAttribute('aria-pressed', String(isDark));
        localStorage.setItem('fiducia-theme', isDark ? 'dark' : 'light');
        syncChartTheme();
    });
}

// ── Animations on Load ──
document.addEventListener('DOMContentLoaded', () => {
    updateCompanyMetadata();
    initStockDropdown();
    initThemeToggle();

    // Fade in animations
    const slideUpElements = document.querySelectorAll('.slide-up');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    slideUpElements.forEach(el => observer.observe(el));

    // Animate pillars
    setTimeout(() => {
        document.querySelectorAll('.pillar-fill').forEach(fill => {
            fill.style.width = fill.style.getPropertyValue('--fill');
        });
    }, 500);

    // Animate score circle
    setTimeout(() => {
        const scoreProgress = document.querySelector('.score-progress');
        if (scoreProgress) {
            scoreProgress.style.strokeDashoffset = '100';
        }
    }, 800);

    // Initialize chart
    initPriceChart();
    fetchNews();
});

// ── Price Chart ──
async function initPriceChart() {
    const canvas = document.getElementById('priceChart');
    if (!canvas) return;

    let labels   = [];
    let priceData = [];
    let smaData   = [];

    try {
        const res = await fetch('/api/chart?ticker=' + currentTicker);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.error) throw new Error(json.error);

        labels    = json.dates;
        priceData = json.prices;
        // Use server-computed SMA — already rounded, nulls for first 4 entries
        smaData   = json.sma;

        // ── Live price injection ──
        const livePriceEl = document.getElementById('live-price-display');
        if (livePriceEl && json.current_price != null) {
            livePriceEl.innerText = json.current_price.toLocaleString('en-IN');
        }

    } catch (err) {
        console.warn('[CHART] Live data unavailable, falling back to mock:', err.message);

        // Graceful fallback — mock data so the chart still renders without a blank frame
        const basePrice = 2800;
        for (let i = 0; i < 30; i++) {
            const d = new Date();
            d.setDate(d.getDate() - (29 - i));
            labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            priceData.push(+(basePrice + i * 2 + (Math.random() - 0.5) * 80).toFixed(2));
        }
        // Client-side SMA fallback
        smaData = priceData.map((_, i) => {
            if (i < 4) return null;
            return +(priceData.slice(i - 4, i + 1).reduce((a, b) => a + b, 0) / 5).toFixed(2);
        });
    }

    // ── Sleek semi-transparent purple gradient fill ──
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.offsetHeight || 400);
    gradient.addColorStop(0, 'rgba(102, 126, 234, 0.35)');
    gradient.addColorStop(0.6, 'rgba(118, 75, 162, 0.12)');
    gradient.addColorStop(1, 'rgba(102, 126, 234, 0.0)');
    const chartColors = getChartThemeColors();

    priceChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Price',
                    data: priceData,
                    borderColor: '#667eea',
                    backgroundColor: gradient,
                    borderWidth: 2,
                    fill: true,
                    tension: 0,              // sharp, jagged — no bezier curves
                    pointRadius: 0,          // hide static dots — clean terminal look
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#667eea',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 2,
                },
                {
                    label: '5-Day SMA',
                    data: smaData,
                    borderColor: '#f093fb',
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0,              // sharp — matches price line
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: '#f093fb',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 2,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 600,
                easing: 'easeOutQuart'
            },
            // ── TradingView-style crosshair: snaps to both datasets on hover ──
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: chartColors.tooltipBg,
                    titleColor: chartColors.tooltipTitle,
                    bodyColor: chartColors.tooltipBody,
                    borderColor: chartColors.tooltipBorder,
                    borderWidth: 1,
                    padding: { x: 14, y: 10 },
                    caretSize: 6,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            if (context.parsed.y == null) return null;
                            return ` ${context.dataset.label}: ₹${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: chartColors.axis,
                        font: { size: 11, family: 'Plus Jakarta Sans' },
                        maxRotation: 0,
                        autoSkipPadding: 24,
                    },
                    border: { display: false }
                },
                y: {
                    position: 'right',       // Y-axis pinned to right — TradingView standard
                    grid: {
                        color: chartColors.grid,
                        borderDash: [5, 5],
                        drawBorder: false,
                    },
                    ticks: {
                        color: chartColors.axis,
                        font: { size: 11, family: 'Plus Jakarta Sans' },
                        callback: function(value) {
                            return '₹' + value.toLocaleString('en-IN', { maximumFractionDigits: 0 });
                        },
                        padding: 12,
                        maxTicksLimit: 6,
                    },
                    border: { display: false }
                }
            }
        }
    });
}


// ── News Source Logo Fallback ──
document.querySelectorAll('.source-logo').forEach(img => {
    img.addEventListener('error', function() {
        this.style.display = 'none';
    });
});

function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char]));
}

function renderNews(articles) {
    const newsContainer = document.getElementById('news-container');
    if (!newsContainer || !Array.isArray(articles) || articles.length === 0) return;

    newsContainer.innerHTML = articles.map((article) => {
        const sentiment = (article.sentiment || 'NEUTRAL').toLowerCase();
        const badgeClass = sentiment === 'positive' ? 'positive' : 'neutral';

        return `
            <article class="news-item">
                <div class="news-source">
                    <img src="https://logo.clearbit.com/reuters.com" alt="News" class="source-logo" style="display: none;">
                    <span>${escapeHtml(article.publisher || 'Market News')}</span>
                    <span class="news-time">Live</span>
                </div>
                <h3 class="news-title">${escapeHtml(article.headline || 'No headline available')}</h3>
                <p class="news-excerpt">${escapeHtml(currentTicker)} market intelligence updated from live ticker-specific news.</p>
                <div class="news-footer">
                    <span class="sentiment-badge ${badgeClass}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="12" r="10"></circle>
                        </svg>
                        ${escapeHtml((article.sentiment || 'NEUTRAL').toUpperCase())}
                    </span>
                    <span class="confidence-score">Confidence: ${escapeHtml(article.confidence || 'N/A')}</span>
                </div>
            </article>
        `;
    }).join('');
}

async function fetchNews() {
    try {
        const response = await fetch('/api/news?ticker=' + currentTicker);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        renderNews(data.articles);
    } catch (error) {
        console.error("[NEWS] Ticker-specific news fetch failed:", error);
    }
}

// --- FIDUCIA SECURE API CONNECTION ---
async function fetchTrustReport() {
    try {
        console.log(`[SYSTEM] Initiating secure data fetch for ${currentTicker}...`);
        
        const response = await fetch('/api/analyze?ticker=' + currentTicker);
        
        // Strict HTTP Error Handling
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        console.log("[SYSTEM] Trust Matrix decrypted:", data);

        // --- DOM INJECTION ---
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };

        if (data.metadata) {
            const nameEl = document.getElementById('company-name');
            const tickerEl = document.getElementById('company-ticker');
            const sectorEl = document.getElementById('company-sector');

            if (nameEl) nameEl.innerText = data.metadata.name;
            if (tickerEl) tickerEl.innerText = data.metadata.ticker;
            if (sectorEl) {
                sectorEl.innerText = data.metadata.sector;
                const trailingSeparator = sectorEl.nextElementSibling;
                if (trailingSeparator?.classList.contains('separator')) {
                    trailingSeparator.style.display = 'none';
                }
            }
        }

        set('trust-score-display', data.trust_score);
        set('prediction-display',  data.prediction);

        // ── Trust Pillars Breakdown ──
        // data.breakdown keys: model_confidence, news_sentiment, volatility_penalty,
        //                      trend_strength, feature_health
        // Each pillar is: { score, max, pct }
        const pillars = [
            { key: 'model_confidence',  scoreId: 'score-confidence', pctId: 'pct-confidence' },
            { key: 'news_sentiment',    scoreId: 'score-sentiment',   pctId: 'pct-sentiment'  },
            { key: 'volatility_penalty', scoreId: 'score-volatility', pctId: 'pct-volatility' },
            { key: 'trend_strength',    scoreId: 'score-trend',       pctId: 'pct-trend'      },
            { key: 'feature_health',    scoreId: 'score-health',      pctId: 'pct-health'     },
        ];

        pillars.forEach(({ key, scoreId, pctId }) => {
            const pillar = data.breakdown[key];
            if (!pillar) return;

            // Inject numerator score
            set(scoreId, pillar.score);

            // Inject formatted percentage text
            set(pctId, `${pillar.pct}%`);

            // Animate the progress bar fill to the real percentage
            const pctEl = document.getElementById(pctId);
            if (pctEl) {
                // Walk up to the pillar-bar-container, then find pillar-fill inside it
                const fillEl = pctEl.closest('.pillar-bar-container')
                                    ?.querySelector('.pillar-fill');
                if (fillEl) {
                    const w = `${pillar.pct}%`;
                    fillEl.style.setProperty('--fill', w);
                    fillEl.style.width = w;
                }
            }
        });

    } catch (error) {
        console.error("[FATAL] Dashboard Sync Failed:", error);
        alert(`System Alert: ${error.message}`);
    }
}

// Ensure the data fetch triggers seamlessly when the UI renders
window.addEventListener("DOMContentLoaded", fetchTrustReport);
