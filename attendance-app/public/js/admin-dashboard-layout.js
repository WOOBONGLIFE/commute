import supabase from './supabase.js';
import { adminIcon } from './admin-design.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time = value => value ? new Date(value).toLocaleTimeString('ko-KR', {timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}) : '—';
let snapshot;
let selectedTab = 'all';

export function setupDashboardLayout() {
  const content = document.querySelector('.content');
  if (!content || document.getElementById('dashboardLiveRows')) return;
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = new URL('../css/admin-dashboard-layout.css?v=1', import.meta.url).href;
  document.head.append(css);
  document.querySelector('.top-header h2').textContent = '오늘의 근무 현황';
  const columns = document.createElement('section');
  columns.className = 'dashboard-workspace';
  columns.innerHTML = `<div class="dashboard-main-column"><article class="panel dashboard-live-panel">
    <div class="panel-header"><h3>오늘 출퇴근</h3><a class="panel-link-button" href="admin-attendance.html">전체 현황 ›</a></div>
    <div class="dashboard-live-tools"><label>${adminIcon('users')}<input id="dashboardLiveSearch" type="search" placeholder="직원명 검색" aria-label="직원명 검색"></label><select id="dashboardLiveRegion" aria-label="배정 현장"><option value="all">현장 전체</option></select></div>
    <div class="dashboard-live-tabs" role="group" aria-label="근무 상태"><button type="button" data-live-tab="all" aria-pressed="true">전체</button><button type="button" data-live-tab="working" aria-pressed="false">근무 중</button><button type="button" data-live-tab="done" aria-pressed="false">퇴근 완료</button></div>
    <div class="attendance-table-wrap"><table class="attendance-table"><thead><tr><th>직원</th><th>배정 현장</th><th>출근</th><th>퇴근</th><th>상태</th><th>상세</th></tr></thead><tbody id="dashboardLiveRows"><tr><td colspan="6">불러오는 중입니다.</td></tr></tbody></table></div>
    <div class="dashboard-live-footer" id="dashboardLiveCount"></div></article>
    <article class="panel"><div class="panel-header"><h3>최근 청소점검</h3><a class="panel-link-button" href="admin-checklists.html">전체보기 ›</a></div><div id="dashboardCleaningRows" class="dashboard-cleaning-list">불러오는 중입니다.</div></article></div><div class="dashboard-side-column"></div>`;
  document.querySelector('.dashboard-summary-grid').after(columns);
  const side = columns.querySelector('.dashboard-side-column');
  for (const selector of ['.dashboard-task-panel','.dashboard-activity-panel','.dashboard-quick-panel']) {
    const panel = document.querySelector(selector);
    if (panel) side.append(panel);
  }
  const taskTitle = side.querySelector('.dashboard-task-panel h3');
  if (taskTitle) taskTitle.textContent = '처리할 업무';
  const activity = side.querySelector('.dashboard-activity-panel .panel-header');
  if (activity) activity.innerHTML = '<h3>공지사항</h3><a class="panel-link-button" href="admin-notices.html">전체보기 ›</a>';
  document.querySelectorAll('.dashboard-grid').forEach(grid => {
    if (!grid.children.length) grid.remove();
  });
  document.getElementById('dashboardLiveSearch').addEventListener('input', renderRows);
  document.getElementById('dashboardLiveRegion').addEventListener('change', renderRows);
  columns.querySelectorAll('[data-live-tab]').forEach(button => button.addEventListener('click', () => {
    selectedTab = button.dataset.liveTab;
    columns.querySelectorAll('[data-live-tab]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    renderRows();
  }));
}

function getRows() {
  const places = new Map(snapshot.workplaces.map(w => [String(w.id), w.name]));
  const leave = new Set(snapshot.leave.map(l => String(l.user_id)));
  return snapshot.users.filter(u => u.status === 'active').map(user => {
    const records = snapshot.attendance.filter(a => String(a.user_id) === String(user.id)).sort((a,b) => String(b.check_in_time || '').localeCompare(String(a.check_in_time || '')));
    const record = records.find(a => a.check_in_time && !a.check_out_time) || records[0];
    const assignments = snapshot.assignments.filter(a => String(a.user_id) === String(user.id));
    const ids = [...new Set(assignments.map(a => String(a.workplace_id)))];
    let status = '미출근', kind = 'absent';
    if (leave.has(String(user.id))) { status = '연차'; kind = 'leave'; }
    else if (record?.check_out_time) { status = '퇴근 완료'; kind = 'done'; }
    else if (record?.check_in_time) { status = ['late','지각'].includes(record.status) ? '지각' : '근무 중'; kind = 'working'; }
    return {user, record, ids, region:ids.map(id => places.get(id)).filter(Boolean).join(', ') || '미배정',status,kind};
  }).sort((a,b) => (a.user.name || '').localeCompare(b.user.name || '', 'ko'));
}

function renderRows() {
  if (!snapshot) return;
  const query = document.getElementById('dashboardLiveSearch').value.trim().toLowerCase();
  const region = document.getElementById('dashboardLiveRegion').value;
  const rows = getRows().filter(r => (!query || (r.user.name || '').toLowerCase().includes(query)) && (region === 'all' || r.ids.includes(region)) && (selectedTab === 'all' || r.kind === selectedTab));
  document.getElementById('dashboardLiveRows').innerHTML = rows.length ? rows.map(r => `<tr><td><div class="dashboard-person"><span class="dashboard-initial" aria-hidden="true">${escape((r.user.name || '?').slice(0,1))}</span><strong>${escape(r.user.name || '이름 없음')}</strong></div></td><td>${escape(r.region)}</td><td>${time(r.record?.check_in_time)}</td><td>${time(r.record?.check_out_time)}</td><td><span class="dashboard-state ${r.status === '지각' ? 'late' : r.kind}">${escape(r.status)}</span></td><td><a class="panel-link-button" aria-label="${escape(r.user.name)} 직원 상세" href="admin-employee-detail.html?id=${encodeURIComponent(r.user.id)}">상세 ›</a></td></tr>`).join('') : '<tr><td colspan="6">조건에 맞는 직원이 없습니다.</td></tr>';
  document.getElementById('dashboardLiveCount').textContent = `${rows.length}명 · 새로고침 시 최신 기록을 불러옵니다.`;
}

export function renderDashboardLayout(data) {
  snapshot = data;
  const region = document.getElementById('dashboardLiveRegion');
  const old = region.value;
  region.innerHTML = '<option value="all">현장 전체</option>' + data.workplaces.map(w => `<option value="${escape(w.id)}">${escape(w.name)}</option>`).join('');
  region.value = [...region.options].some(o => o.value === old) ? old : 'all';
  renderRows();
}

export function failDashboardLayout() {
  snapshot = null;
  document.getElementById('dashboardLiveRows').innerHTML = '<tr><td colspan="6">현황을 불러오지 못했습니다. 새로고침을 눌러 다시 시도해 주세요.</td></tr>';
  document.getElementById('dashboardLiveCount').textContent = '';
}

export async function loadDashboardCleaning(data) {
  const target = document.getElementById('dashboardCleaningRows');
  try {
    const {data:rows,error} = await supabase.from('cleaning_checklist_submissions').select('id,user_id,workplace_id,created_at').order('created_at',{ascending:false}).limit(3);
    if (error) throw error;
    const users = new Map(data.users.map(u => [String(u.id),u.name]));
    const places = new Map(data.workplaces.map(w => [String(w.id),w.name]));
    target.innerHTML = rows.length ? rows.map(r => `<a class="dashboard-cleaning-row" href="admin-checklists.html"><span>${adminIcon('check')}</span><div><strong>${escape(places.get(String(r.workplace_id)) || '현장 미확인')}</strong><small>${escape(users.get(String(r.user_id)) || '직원')} · ${escape(new Date(r.created_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}))}</small></div><span class="dashboard-state working">제출 완료</span></a>`).join('') : '<p>제출된 점검표가 없습니다.</p>';
  } catch {
    target.textContent = '청소점검 내역을 불러오지 못했습니다. 청소점검표 페이지에서 확인해 주세요.';
  }
}
