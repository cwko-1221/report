/* ========================================
   app.js — 主程式（路由、初始化、首頁）
   ======================================== */

// Global chart colors
const CHART_COLORS = [
    '#6366F1', '#06B6D4', '#F59E0B', '#EF4444', '#10B981',
    '#8B5CF6', '#EC4899', '#F97316', '#14B8A6', '#84CC16',
    '#A855F7', '#0EA5E9', '#D946EF', '#22D3EE', '#FB923C',
];

// Global Chart settings
if (window.Chart) {
    Chart.defaults.font.family = "'Inter', 'Noto Sans TC', sans-serif";
    if (window.ChartDataLabels) {
        Chart.register(ChartDataLabels);
        Chart.defaults.plugins.datalabels.display = false;
    }
}

/* ---------- Navigation ---------- */
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewId = item.dataset.view;
            switchView(viewId);
        });
    });
}

function switchView(viewId) {
    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-view="${viewId}"]`)?.classList.add('active');

    // Show/hide views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${viewId}`)?.classList.add('active');

    // Trigger view refresh
    if (DataManager.records.length > 0) {
        switch (viewId) {
            case 'student': StudentView.refreshSelectors(); break;
            case 'class': ClassView.refreshSelectors(); break;
            case 'subject': SubjectView.refreshSelectors(); break;
            case 'compare': CompareView.refreshSelectors(); break;
        }
    }
}

/* ---------- File Upload ---------- */
function initUpload() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const btnChoose = document.getElementById('btn-choose-files');

    btnChoose.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    uploadArea.addEventListener('click', () => fileInput.click());

    // Drag & drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleFiles(fileInput.files);
        }
    });

    // Clear data button
    document.getElementById('btn-clear-data')?.addEventListener('click', () => {
        if (confirm('確定要清除所有已匯入的數據嗎？')) {
            DataManager.clearAll();
            refreshHomeView();
            showToast('已清除所有數據', 'info');
        }
    });
}

async function handleFiles(fileList) {
    const files = [...fileList].filter(f =>
        f.name.endsWith('.xls') || f.name.endsWith('.xlsx')
    );

    if (files.length === 0) {
        showToast('請選擇 .xls 或 .xlsx 檔案', 'error');
        return;
    }

    const progress = document.getElementById('upload-progress');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    progress.classList.remove('hidden');

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        progressText.textContent = `正在解析 ${file.name}... (${i + 1}/${files.length})`;
        progressFill.style.width = ((i + 1) / files.length * 100) + '%';

        try {
            const results = await DataManager.parseFile(file);
            if (results.length > 0) {
                successCount++;
            } else {
                errorCount++;
                console.warn(`No valid data in ${file.name}`);
            }
        } catch (e) {
            errorCount++;
            console.error(`Error parsing ${file.name}:`, e);
        }

        // Small delay to allow UI update
        await new Promise(r => setTimeout(r, 50));
    }

    progress.classList.add('hidden');
    progressFill.style.width = '0%';

    if (successCount > 0) {
        showToast(`成功匯入 ${successCount} 個檔案` + (errorCount > 0 ? `，${errorCount} 個失敗` : ''), 'success');
    } else {
        showToast(`匯入失敗，請檢查檔案格式`, 'error');
    }

    refreshHomeView();
}

/* ---------- Home View ---------- */
function refreshHomeView() {
    const overview = document.getElementById('data-overview');
    const stats = DataManager.getOverviewStats();

    if (stats.fileCount === 0) {
        overview.classList.add('hidden');
        return;
    }

    overview.classList.remove('hidden');

    // Update stat cards
    document.querySelector('#stat-files .stat-value').textContent = stats.fileCount;
    document.querySelector('#stat-students .stat-value').textContent = stats.studentCount;
    document.querySelector('#stat-grades .stat-value').textContent = stats.gradeCount;
    document.querySelector('#stat-years .stat-value').textContent = stats.yearCount;

    // Update file table
    const tbody = document.getElementById('data-table-body');
    const files = DataManager.getFileList();

    // Group and sort
    files.sort((a, b) => {
        if (a.filename < b.filename) return -1;
        if (a.filename > b.filename) return 1;
        return a.termLabel.localeCompare(b.termLabel);
    });

    tbody.innerHTML = files.map(f => `
        <tr>
            <td>${f.filename}</td>
            <td>${f.schoolYear}</td>
            <td>${f.grade}</td>
            <td>${f.className}</td>
            <td>${f.termLabel}</td>
            <td class="num">${f.studentCount}</td>
            <td class="num">${f.subjectCount}</td>
        </tr>
    `).join('');
}

/* ---------- PDF Export ---------- */
function initExport() {
    document.getElementById('btn-export-pdf')?.addEventListener('click', () => {
        const activeView = document.querySelector('.view.active');
        if (!activeView) return;

        showToast('正在生成 PDF...', 'info');

        const opt = {
            margin: [10, 10, 10, 10],
            filename: '考評分析報告.pdf',
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { scale: 2, backgroundColor: '#1E293B', useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };

        // Clone the view for PDF rendering
        const clone = activeView.cloneNode(true);
        clone.style.background = '#1E293B';
        clone.style.padding = '20px';
        clone.style.color = '#F8FAFC';

        html2pdf().set(opt).from(activeView).save().then(() => {
            showToast('PDF 已生成！', 'success');
        }).catch(e => {
            console.error(e);
            showToast('PDF 生成失敗', 'error');
        });
    });
}

/* ---------- Toast ---------- */
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');

    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

/* ---------- Initialize ---------- */
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initUpload();
    initExport();

    // Initialize view modules
    StudentView.init();
    ClassView.init();
    SubjectView.init();
    CompareView.init();

    // Load cached data
    if (DataManager.loadFromStorage()) {
        refreshHomeView();
        showToast(`已載入 ${DataManager.records.length} 筆緩存數據`, 'info');
    }

    // Auto-load preloaded data (from build_data.ps1)
    if (typeof PRELOAD_DATA !== 'undefined' && PRELOAD_DATA.length > 0) {
        // Only load preload data if we don't already have it
        if (DataManager.records.length === 0) {
            console.time('Preload data parsing');
            const count = DataManager.parsePreloadData(PRELOAD_DATA);
            console.timeEnd('Preload data parsing');
            if (count > 0) {
                refreshHomeView();
                showToast(`已自動載入 ${count} 筆預設數據（${DataManager.getAllStudents().length} 位學生）`, 'success');
            }
        }
    }
});
