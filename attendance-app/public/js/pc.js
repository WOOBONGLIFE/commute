import {
  applyAdminDesign,
} from "./admin-design.js";
import supabase from "./supabase.js";

import {
  requireAdmin,
  logoutAdmin,
} from "./adminAuth.js";

const currentAdmin = await requireAdmin();

if (!currentAdmin) {
  throw new Error("ADMIN_AUTH_REQUIRED");
}

function escapeAdminHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getAdminRoleText(role) {
  if (role === "owner") {
    return "최고 관리자";
  }

  return "관리자";
}

const adminDisplayName =
  currentAdmin.name || "관리자";

const adminInitial =
  adminDisplayName.trim().slice(0, 1) || "관";

/* 관리자용 공통 좌측 사이드바 */

const adminSidebar = document.getElementById("adminSidebar");
const currentAdminPage = document.body.dataset.adminPage;

const attendancePages = [
  "attendance",
  "attendance-issue",
  "attendance-monthly",
  "attendance-edit",
];

const isAttendanceOpen = attendancePages.includes(currentAdminPage);

const workManagementPages = [
  "work-schedules",
  "departments",
  "work-details",
];

const isWorkManagementOpen =
  workManagementPages.includes(
    currentAdminPage
  );

if (adminSidebar) {
  adminSidebar.innerHTML = `
    <aside class="admin-sidebar">
      <div class="admin-sidebar-logo">
        <div class="admin-logo-box">A</div>

        <div>
          <h1>근태관리 Admin</h1>
          <p>${escapeAdminHtml(
            getAdminRoleText(currentAdmin.role)
          )}</p>
        </div>
      </div>

      <nav class="admin-sidebar-menu">
        <a href="admin.html" class="admin-menu-item ${currentAdminPage === "admin" ? "active" : ""}">
          <span></span>
          <p>대시보드</p>
        </a>

        <div class="admin-menu-group ${isAttendanceOpen ? "open" : ""}">
          <a href="admin-attendance.html" class="admin-menu-item admin-menu-parent ${isAttendanceOpen ? "active" : ""}">
            <span></span>
            <p>출퇴근 관리</p>
            <b>⌄</b>
          </a>

          <div class="admin-sub-menu">
            <a href="admin-attendance.html" class="admin-sub-menu-item ${currentAdminPage === "attendance" ? "active" : ""}">
              오늘 출퇴근 현황
            </a>

            <a href="admin-attendance-issue.html" class="admin-sub-menu-item ${currentAdminPage === "attendance-issue" ? "active" : ""}">
              지각·미출근 관리
            </a>

            <a href="admin-attendance-monthly.html" class="admin-sub-menu-item ${currentAdminPage === "attendance-monthly" ? "active" : ""}">
              월간 출근부
            </a>

            <a href="admin-attendance-edit.html" class="admin-sub-menu-item ${currentAdminPage === "attendance-edit" ? "active" : ""}">
              출퇴근 기록 수정
            </a>
          </div>
        </div>

        <a
          href="admin-requests.html"
          class="admin-menu-item ${
            currentAdminPage === "requests"
              ? "active"
              : ""
          }"
        >
          <span></span>
          <p>요청사항 관리</p>
        </a>

        <a href="admin-checklists.html" class="admin-menu-item ${ currentAdminPage === "checklists" ? "active" : "" }" > <span></span>
          <p>청소 점검표</p>
        </a>

        <a href="admin-employees.html" class="admin-menu-item ${currentAdminPage === "employees" ? "active" : ""}">
          <span></span>
          <p>직원 관리</p>
        </a>

        <div
          class="admin-menu-group ${
            isWorkManagementOpen
              ? "open"
              : ""
          }"
        >
          <a
            href="admin-work-schedules.html"
            class="admin-menu-item admin-menu-parent ${
              isWorkManagementOpen
                ? "active"
                : ""
            }"
          >
            <span></span>

            <p>근무 관리</p>

            <b>⌄</b>
          </a>

          <div class="admin-sub-menu">
            <a
              href="admin-work-schedules.html"
              class="admin-sub-menu-item ${
                currentAdminPage ===
                "work-schedules"
                  ? "active"
                  : ""
              }"
            >
              출퇴근 시간 관리
            </a>

            <a
              href="admin-departments.html"
              class="admin-sub-menu-item ${
                currentAdminPage ===
                "departments"
                  ? "active"
                  : ""
              }"
            >
              지역 관리
            </a>

            <a
              href="admin-work-details.html"
              class="admin-sub-menu-item ${
                currentAdminPage ===
                "work-details"
                  ? "active"
                  : ""
              }"
            >
              근무 상세
            </a>
          </div>
        </div>

        <a href="admin-notices.html" class="admin-menu-item ${currentAdminPage === "notices" ? "active" : ""}">
          <span></span>
          <p>공지사항</p>
        </a>

        <a href="admin-settings.html" class="admin-menu-item ${currentAdminPage === "settings" ? "active" : ""}">
          <span>⚙️</span>
          <p>설정</p>
        </a>
      </nav>

      <div class="admin-sidebar-user">
        <div class="admin-user-avatar">
          ${escapeAdminHtml(adminInitial)}
        </div>

        <div class="admin-user-info">
          <strong> ${escapeAdminHtml(adminDisplayName)} </strong>
          <p> ${escapeAdminHtml(currentAdmin.email)} </p>
        </div>

        <button
          id="adminLogoutBtn"
          class="admin-logout-btn"
          type="button"
          aria-label="관리자 로그아웃"
        >
          ↗
        </button>
      </div>
    </aside>
  `;
}

const adminLogoutBtn =
  document.getElementById("adminLogoutBtn");
  
applyAdminDesign();

adminLogoutBtn?.addEventListener(
  "click",
  async () => {
    const confirmed = confirm(
      "관리자 계정에서 로그아웃하시겠습니까?"
    );

    if (!confirmed) return;

    adminLogoutBtn.disabled = true;

    await logoutAdmin();
  }
);

/* 사이드바 하위 메뉴 열기 / 닫기 */

document
  .querySelectorAll(".admin-menu-group")
  .forEach((menuGroup) => {
    const menuParent =
      menuGroup.querySelector(".admin-menu-parent");

    if (!menuParent) return;

    menuParent.addEventListener("click", (event) => {
      event.preventDefault();

      menuGroup.classList.toggle("open");
    });
  });

/* 관리자 상단 실시간 알림 */

function getAdminTodayKey() {
  const today = new Date();

  const year =
    today.getFullYear();

  const month =
    String(
      today.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      today.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function normalizeAdminStatus(
  status
) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_");
}


function isAdminLateStatus(
  status
) {
  const value =
    normalizeAdminStatus(
      status
    );

  return (
    value === "late" ||
    value === "지각"
  );
}


function isAdminLocationErrorStatus(
  status
) {
  const value =
    normalizeAdminStatus(
      status
    );

  return (
    value ===
      "location_error" ||
    value ===
      "위치오류" ||
    value ===
      "위치_오류"
  );
}


function formatAdminRelativeTime(
  value
) {
  if (!value) {
    return "현재";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "현재";
  }

  const difference =
    Math.max(
      0,
      Date.now() -
        date.getTime()
    );

  const minutes =
    Math.floor(
      difference / 60000
    );

  if (minutes < 1) {
    return "방금 전";
  }

  if (minutes < 60) {
    return `${minutes}분 전`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (hours < 24) {
    return `${hours}시간 전`;
  }

  const days =
    Math.floor(
      hours / 24
    );

  return `${days}일 전`;
}


function getLatestCreatedAt(
  items
) {
  const timestamps =
    items
      .map(
        (item) =>
          item.created_at
      )
      .filter(Boolean)
      .map(
        (value) =>
          new Date(
            value
          ).getTime()
      )
      .filter(
        (value) =>
          !Number.isNaN(
            value
          )
      );

  if (!timestamps.length) {
    return null;
  }

  return new Date(
    Math.max(...timestamps)
  ).toISOString();
}


async function loadAdminNotifications() {
  const today =
    getAdminTodayKey();

  const [
    userResult,
    assignmentResult,
    attendanceResult,
    requestResult,
  ] = await Promise.all([
    supabase
      .from("users")
      .select(`
        id,
        name,
        status,
        app_approval_status,
        created_at
      `),

    supabase
      .from(
        "workplace_users"
      )
      .select(
        "user_id"
      ),

    supabase
      .from("attendance")
      .select(`
        id,
        status,
        created_at
      `)
      .eq(
        "work_date",
        today
      ),

    supabase.rpc(
      "admin_get_employee_requests"
    ),
  ]);

  if (userResult.error) {
    console.error(
      "관리자 알림 직원 조회 실패:",
      userResult.error
    );
  }

  if (
    assignmentResult.error
  ) {
    console.error(
      "관리자 알림 근무지 조회 실패:",
      assignmentResult.error
    );
  }

  if (
    attendanceResult.error
  ) {
    console.error(
      "관리자 알림 출퇴근 조회 실패:",
      attendanceResult.error
    );
  }

  if (requestResult.error) {
    console.error(
      "관리자 알림 요청 조회 실패:",
      requestResult.error
    );
  }

  const users =
    userResult.data || [];

  const assignments =
    assignmentResult.data ||
    [];

  const attendance =
    attendanceResult.data ||
    [];

  const requests =
    requestResult.data || [];

  const notifications = [];

  const pendingEmployees =
    users.filter(
      (user) =>
        user.status !==
          "deleted" &&
        user.app_approval_status ===
          "pending"
    );

  if (
    pendingEmployees.length > 0
  ) {
    notifications.push({
      type: "가입 승인",
      tone: "approval",

      title:
        `앱 사용 승인 대기 ${pendingEmployees.length}명`,

      desc:
        "앱 로그인을 시도한 직원의 사용 승인이 필요합니다.",

      time:
        formatAdminRelativeTime(
          getLatestCreatedAt(
            pendingEmployees
          )
        ),

      link:
        "admin-employees.html",

      count:
        pendingEmployees.length,
    });
  }

  const pendingRequests =
    requests.filter(
      (request) =>
        request.status ===
        "pending"
    );

  const requestGroups = [
    {
      type:
        "annual_leave",

      label:
        "연차 신청",

      desc:
        "승인 대기 중인 연차 신청이 있습니다.",
    },

    {
      type:
        "supply_request",

      label:
        "비품 요청",

      desc:
        "확인이 필요한 비품 요청이 있습니다.",
    },

    {
      type:
        "general_request",

      label:
        "요청 사항",

      desc:
        "직원이 등록한 요청 사항이 있습니다.",
    },
  ];

  requestGroups.forEach(
    (definition) => {
      const groupItems =
        pendingRequests.filter(
          (request) =>
            request.request_type ===
            definition.type
        );

      if (!groupItems.length) {
        return;
      }

      notifications.push({
        type:
          definition.label,

        tone:
          definition.type ===
          "annual_leave"
            ? "leave"
            : "request",

        title:
          `${definition.label} ${groupItems.length}건 대기`,

        desc:
          definition.desc,

        time:
          formatAdminRelativeTime(
            getLatestCreatedAt(
              groupItems
            )
          ),

        link:
          "admin-requests.html",

        count:
          groupItems.length,
      });
    }
  );

  const profileRequests =
    pendingRequests.filter(
      (request) =>
        request.request_type ===
          "phone_change" ||
        request.request_type ===
          "profile_change"
    );

  if (
    profileRequests.length > 0
  ) {
    notifications.push({
      type:
        "정보 변경",

      tone:
        "profile",

      title:
        `직원 정보 변경 ${profileRequests.length}건 대기`,

      desc:
        "연락처 또는 직원 정보 변경 요청을 확인해 주세요.",

      time:
        formatAdminRelativeTime(
          getLatestCreatedAt(
            profileRequests
          )
        ),

      link:
        "admin-requests.html",

      count:
        profileRequests.length,
    });
  }

  const otherRequests =
    pendingRequests.filter(
      (request) =>
        ![
          "annual_leave",
          "supply_request",
          "general_request",
          "phone_change",
          "profile_change",
        ].includes(
          request.request_type
        )
    );

  if (
    otherRequests.length > 0
  ) {
    notifications.push({
      type:
        "직원 요청",

      tone:
        "request",

      title:
        `기타 직원 요청 ${otherRequests.length}건 대기`,

      desc:
        "확인이 필요한 직원 요청이 있습니다.",

      time:
        formatAdminRelativeTime(
          getLatestCreatedAt(
            otherRequests
          )
        ),

      link:
        "admin-requests.html",

      count:
        otherRequests.length,
    });
  }

  const lateRecords =
    attendance.filter(
      (record) =>
        isAdminLateStatus(
          record.status
        )
    );

  if (
    lateRecords.length > 0
  ) {
    notifications.push({
      type:
        "지각",

      tone:
        "attendance",

      title:
        `오늘 지각 기록 ${lateRecords.length}건`,

      desc:
        "오늘 지각 처리된 출근 기록을 확인해 주세요.",

      time:
        formatAdminRelativeTime(
          getLatestCreatedAt(
            lateRecords
          )
        ),

      link:
        "admin-attendance-issue.html",

      count:
        lateRecords.length,
    });
  }

  const locationErrors =
    attendance.filter(
      (record) =>
        isAdminLocationErrorStatus(
          record.status
        )
    );

  if (
    locationErrors.length > 0
  ) {
    notifications.push({
      type:
        "위치 오류",

      tone:
        "location",

      title:
        `위치 오류 기록 ${locationErrors.length}건`,

      desc:
        "배정된 근무지역 밖에서 시도한 출근 기록이 있습니다.",

      time:
        formatAdminRelativeTime(
          getLatestCreatedAt(
            locationErrors
          )
        ),

      link:
        "admin-attendance-issue.html",

      count:
        locationErrors.length,
    });
  }

  const assignedUserIds =
    new Set(
      assignments.map(
        (assignment) =>
          String(
            assignment.user_id
          )
      )
    );

  const unassignedEmployees =
    users.filter(
      (user) =>
        user.status ===
          "active" &&
        user.app_approval_status !==
          "pending" &&
        !assignedUserIds.has(
          String(user.id)
        )
    );

  if (
    unassignedEmployees.length > 0
  ) {
    notifications.push({
      type:
        "근무지 미배정",

      tone:
        "assignment",

      title:
        `근무지 미배정 직원 ${unassignedEmployees.length}명`,

      desc:
        "활성 직원의 근무지역 배정이 필요합니다.",

      time:
        "현재",

      link:
        "admin-employees.html",

      count:
        unassignedEmployees.length,
    });
  }

  return notifications;
}


function getAdminNotificationTotal(
  notifications
) {
  return notifications.reduce(
    (
      total,
      notification
    ) =>
      total +
      Number(
        notification.count ||
        0
      ),
    0
  );
}


function renderAdminNotificationList(
  notifications
) {
  const notificationBadge =
    document.getElementById(
      "adminNotificationBadge"
    );

  const notificationCount =
    document.getElementById(
      "adminNotificationCount"
    );

  const notificationList =
    document.getElementById(
      "adminNotificationList"
    );

  if (
    !notificationBadge ||
    !notificationCount ||
    !notificationList
  ) {
    return;
  }

  const total =
    getAdminNotificationTotal(
      notifications
    );

  notificationBadge.textContent =
    total > 99
      ? "99+"
      : String(total);

  notificationCount.textContent =
    `${total}건`;

  notificationBadge.classList.toggle(
    "is-empty",
    total === 0
  );

  if (
    notifications.length === 0
  ) {
    notificationList.innerHTML = `
      <div class="admin-notification-empty">
        <strong>
          새로운 알림이 없습니다.
        </strong>

        <p>
          현재 확인할 요청이나 오류가 없습니다.
        </p>
      </div>
    `;

    return;
  }

  notificationList.innerHTML =
    notifications
      .map(
        (notice) => `
          <a
            href="${escapeAdminHtml(
              notice.link
            )}"
            class="admin-notification-item ${
              escapeAdminHtml(
                notice.tone
              )
            }"
          >
            <div class="admin-notification-item-top">
              <span>
                ${escapeAdminHtml(
                  notice.type
                )}
              </span>

              <em>
                ${escapeAdminHtml(
                  notice.time
                )}
              </em>
            </div>

            <strong>
              ${escapeAdminHtml(
                notice.title
              )}
            </strong>

            <p>
              ${escapeAdminHtml(
                notice.desc
              )}
            </p>
          </a>
        `
      )
      .join("");
}


async function createAdminNotification() {
  const headerActions =
    document.querySelector(
      ".top-header .header-actions"
    );

  if (!headerActions) {
    return;
  }

  const notificationBox =
    document.createElement(
      "div"
    );

  notificationBox.className =
    "admin-notification";

  notificationBox.innerHTML = `
    <button
      type="button"
      class="admin-notification-button"
      id="adminNotificationBtn"
      aria-expanded="false"
    >
      <span>알림</span>

      <strong
        id="adminNotificationBadge"
      >
        0
      </strong>
    </button>

    <div
      class="admin-notification-dropdown"
      id="adminNotificationDropdown"
    >
      <div class="admin-notification-header">
        <strong>알림</strong>

        <span
          id="adminNotificationCount"
        >
          불러오는 중
        </span>
      </div>

      <div
        class="admin-notification-list"
        id="adminNotificationList"
      >
        <div class="admin-notification-empty">
          <p>
            알림을 불러오는 중입니다.
          </p>
        </div>
      </div>

      <a
        href="admin.html"
        class="admin-notification-more"
      >
        대시보드에서 전체 현황 보기 ›
      </a>
    </div>
  `;

  headerActions.prepend(
    notificationBox
  );

  const notificationBtn =
    document.getElementById(
      "adminNotificationBtn"
    );

  const notificationDropdown =
    document.getElementById(
      "adminNotificationDropdown"
    );

  notificationBtn.addEventListener(
    "click",
    (event) => {
      event.stopPropagation();

      const isOpen =
        notificationDropdown
          .classList
          .toggle("open");

      notificationBtn.setAttribute(
        "aria-expanded",
        String(isOpen)
      );
    }
  );

  document.addEventListener(
    "click",
    (event) => {
      if (
        !notificationBox.contains(
          event.target
        )
      ) {
        notificationDropdown
          .classList
          .remove("open");

        notificationBtn.setAttribute(
          "aria-expanded",
          "false"
        );
      }
    }
  );

  try {
    const notifications =
      await loadAdminNotifications();

    renderAdminNotificationList(
      notifications
    );
  } catch (error) {
    console.error(
      "관리자 알림 조회 실패:",
      error
    );

    const notificationCount =
      document.getElementById(
        "adminNotificationCount"
      );

    const notificationList =
      document.getElementById(
        "adminNotificationList"
      );

    if (notificationCount) {
      notificationCount.textContent =
        "조회 실패";
    }

    if (notificationList) {
      notificationList.innerHTML = `
        <div class="admin-notification-empty error">
          <strong>
            알림을 불러오지 못했습니다.
          </strong>

          <p>
            페이지를 새로고침해 주세요.
          </p>
        </div>
      `;
    }
  }
}


createAdminNotification();
