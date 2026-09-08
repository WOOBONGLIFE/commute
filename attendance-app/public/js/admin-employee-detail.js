/* =========================================================
   🔥 관리자 직원 상세 및 근무표 관리 (Supabase 실시간 DB 연동)
========================================================= */
import supabase from "./supabase.js";

const urlParams = new URLSearchParams(window.location.search);
const targetUserId = urlParams.get("id");

// DOM 연결 (detailAvatar는 HTML에서 삭제되어 안전하게 null 처리됨)
const detailName = document.getElementById("detailName");
const detailInfo = document.getElementById("detailInfo");
const detailPhone = document.getElementById("detailPhone");
const detailAppRole = document.getElementById( "detailAppRole" ); 
const detailAppApproval = document.getElementById( "detailAppApproval" ); const detailJoinDate = document.getElementById("detailJoinDate");
const detailStatus = document.getElementById("detailStatus");
const detailRegionList = document.getElementById("detailRegionList");
const employeeDetailTitle = document.getElementById("employeeDetailTitle");

const statWorkDays = document.getElementById("detailWorkDays");
const statLateCount = document.getElementById("detailLateCount");
const statAbsentCount = document.getElementById("detailAbsentCount");
const statWorkHours = document.getElementById("detailWorkHours");

const viewTabBtns = document.querySelectorAll(".view-tab-btn");
const timeNavigator = document.getElementById("timeNavigator");
const prevTimeBtn = document.getElementById("prevTimeBtn");
const nextTimeBtn = document.getElementById("nextTimeBtn");
const currentTimeDisplay = document.getElementById("currentTimeDisplay");
const customDateFilter = document.getElementById("customDateFilter");
const attendanceStartDate = document.getElementById("attendanceStartDate");
const attendanceEndDate = document.getElementById("attendanceEndDate");
const attendanceSearchBtn = document.getElementById("attendanceSearchBtn");
const detailRecordTableBody = document.getElementById("detailRecordTableBody");

const btnViewMonthly = document.getElementById("btnViewMonthly");
const btnDeactivate = document.getElementById("btnDeactivate");
const btnDeleteAccount = document.getElementById("btnDeleteAccount");
const btnExcelPrint = document.getElementById("btnExcelPrint");

const dailyNoteDate = document.getElementById("dailyNoteDate");
const dailyNoteInput = document.getElementById("dailyNoteInput");
const saveDailyNoteBtn = document.getElementById("saveDailyNoteBtn");
const deleteDailyNoteBtn = document.getElementById("deleteDailyNoteBtn");
const printTitle = document.getElementById("printTitle");
const printSubtitle = document.getElementById("printSubtitle");

const editEmployeeBtn = document.getElementById("editEmployeeBtn");
const btnEditRegion = document.getElementById("btnEditRegion");
const employeeEditModal = document.getElementById("employeeEditModal");
const employeeEditForm = document.getElementById("employeeEditForm");
const employeeEditCloseBtn = document.getElementById("employeeEditCloseBtn");
const employeeEditCancelBtn = document.getElementById("employeeEditCancelBtn");
const editEmployeeName = document.getElementById("editEmployeeName");
const editEmployeePhone = document.getElementById("editEmployeePhone");
const regionEditModal = document.getElementById("regionEditModal");
const regionEditList = document.getElementById("regionEditList");
const regionEditCloseBtn = document.getElementById("regionEditCloseBtn");
const regionEditCancelBtn = document.getElementById("regionEditCancelBtn");
const regionEditSaveBtn = document.getElementById("regionEditSaveBtn");

const editEmployeePosition =
  document.getElementById(
    "editEmployeePosition"
  );

const editEmployeeRole =
  document.getElementById(
    "editEmployeeRole"
  );

const editEmployeeDepartment =
  document.getElementById(
    "editEmployeeDepartment"
  );

const editEmployeeStatus =
  document.getElementById(
    "editEmployeeStatus"
  );

const editEmployeeMemo =
  document.getElementById(
    "editEmployeeMemo"
  );

const editEmployeeAssignmentSummary =
  document.getElementById(
    "editEmployeeAssignmentSummary"
  );

const openRegionFromEmployeeEditBtn =
  document.getElementById(
    "openRegionFromEmployeeEditBtn"
  );

const dailyNoteType = document.getElementById("dailyNoteType");
const toggleAttendanceRowsBtn = document.getElementById( "toggleAttendanceRowsBtn" );

const attendanceEditModal =
  document.getElementById(
    "attendanceEditModal"
  );

const attendanceEditModalTitle =
  document.getElementById(
    "attendanceEditModalTitle"
  );

const attendanceEditModalInfo =
  document.getElementById(
    "attendanceEditModalInfo"
  );

const attendanceEditCloseBtn =
  document.getElementById(
    "attendanceEditCloseBtn"
  );

const attendanceEditCancelBtn =
  document.getElementById(
    "attendanceEditCancelBtn"
  );

const attendanceEditSaveBtn =
  document.getElementById(
    "attendanceEditSaveBtn"
  );

const detailEditCheckIn =
  document.getElementById(
    "detailEditCheckIn"
  );

const detailEditCheckOut =
  document.getElementById(
    "detailEditCheckOut"
  );

const detailEditStatus =
  document.getElementById(
    "detailEditStatus"
  );

const detailEditReason =
  document.getElementById(
    "detailEditReason"
  );

const detailEditMemo =
  document.getElementById(
    "detailEditMemo"
  );

let currentEmployeeData = null;
let viewMode = "monthly"; 
let selectedYear = new Date().getFullYear();
let selectedMonth = new Date().getMonth(); 
let currentAttendanceRecords = [];
let dailyNotes = new Map();
let attendanceExpanded = false;
let selectedDetailAttendance = null;
let selectedDetailAttendanceDate = null;

function formatTimeOnly(timeString) {
  if (!timeString) return "00:00";
  const date = new Date(timeString);
  if (Number.isNaN(date.getTime())) return "00:00";
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function calcWorkMinutes(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const diffMs = new Date(checkOut) - new Date(checkIn);
  return diffMs > 0 ? Math.floor(diffMs / 1000 / 60) : 0;
}

function formatMinutesToHoursText(totalMinutes) {
  if (totalMinutes <= 0) return "0시간 0분";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}시간 ${minutes}분`;
}

function getKoreanDayOfWeek(dateString) {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const date = new Date(`${dateString}T00:00:00`);
  return days[date.getDay()] || "-";
}

function toLocalDateKey(
  year,
  monthIndex,
  day
) {
  return (
    `${year}-` +
    `${String(
      monthIndex + 1
    ).padStart(2, "0")}-` +
    `${String(day).padStart(2, "0")}`
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function fetchEmployeeProfile() {
  if (!targetUserId) {
    alert(
      "직원 ID가 없습니다. 직원 목록으로 이동합니다."
    );

    location.href =
      "admin-employees.html";

    return null;
  }

  try {
    const { data, error } =
      await supabase.rpc(
        "admin_get_employees_v2" );

    if (error) {
      throw error;
    }

    const employeeList =
      Array.isArray(data) ? data : [];

    const employee =
      employeeList.find(
        (item) =>
          String(item.id) ===
          String(targetUserId)
      );

    if (!employee) {
      alert(
        "해당 직원 정보를 찾을 수 없습니다."
      );

      location.href =
        "admin-employees.html";

      return null;
    }

    return {
      ...employee,

      workplaceIds:
        Array.isArray(
          employee.workplaceIds
        )
          ? employee.workplaceIds.map(
              String
            )
          : [],

      workplaceNames:
        Array.isArray(
          employee.workplaceNames
        )
          ? employee.workplaceNames
          : [],
    };
  } catch (error) {
    console.error(
      "직원 상세 정보 조회 실패:",
      error
    );

    alert(
      `직원 정보를 불러오지 못했습니다.\n${
        error.message ||
        "관리자 권한을 확인해 주세요."
      }`
    );

    return null;
  }
}

function getEmployeeStatusText(status) {
  if (status === "active") {
    return "재직(활성)";
  }

  if (status === "pending") {
    return "승인 대기";
  }

  if (status === "inactive") {
    return "비활성";
  }

  if (status === "resigned") {
    return "퇴사";
  }

  if (status === "deleted") {
    return "삭제 처리";
  }

  return status || "상태 미지정";
}

function renderEmployeeWorkplaces(
  workplaceNames
) {
  if (!detailRegionList) return;

  detailRegionList.replaceChildren();

  if (!workplaceNames.length) {
    const emptyChip =
      document.createElement("span");

    emptyChip.className =
      "employee-region-chip empty";

    emptyChip.textContent =
      "배정된 근무지역 없음";

    detailRegionList.appendChild(
      emptyChip
    );

    return;
  }

  workplaceNames.forEach(
    (workplaceName) => {
      const workplaceChip =
        document.createElement("span");

      workplaceChip.className =
        "employee-region-chip";

      workplaceChip.textContent =
        `📍 ${workplaceName}`;

      detailRegionList.appendChild(
        workplaceChip
      );
    }
  );
}

async function
loadAndRenderEmployeeAssignments() {
  if (
    !detailRegionList ||
    !targetUserId
  ) {
    return;
  }

  detailRegionList.innerHTML = `
    <p class="detail-assignment-loading">
      근무 배정 정보를 불러오는 중입니다.
    </p>
  `;

  try {
    const [
      assignmentResult,
      workplaceResult,
      shiftResult,
    ] = await Promise.all([
      supabase
        .from("workplace_users")
        .select(`
          workplace_id,
          start_date,
          end_date,
          days_of_week,
          work_shift_id
        `)
        .eq(
          "user_id",
          targetUserId
        ),

      supabase
        .from("workplaces")
        .select(`
          id,
          name,
          address
        `),

      supabase
        .from("work_shifts")
        .select(`
          id,
          name,
          start_time,
          end_time
        `),
    ]);

    if (assignmentResult.error) {
      throw assignmentResult.error;
    }

    if (workplaceResult.error) {
      throw workplaceResult.error;
    }

    if (shiftResult.error) {
      throw shiftResult.error;
    }

    const assignments =
      assignmentResult.data || [];

    const workplaces =
      workplaceResult.data || [];

    const workShifts =
      shiftResult.data || [];

    if (!assignments.length) {
      detailRegionList.innerHTML = `
        <div class="detail-assignment-empty">
          배정된 근무지역이 없습니다.
        </div>
      `;

      return;
    }

    detailRegionList.innerHTML =
      assignments
        .map((assignment) => {
          const workplace =
            workplaces.find(
              (item) =>
                String(item.id) ===
                String(
                  assignment
                    .workplace_id
                )
            );

          const workShift =
            workShifts.find(
              (item) =>
                String(item.id) ===
                String(
                  assignment
                    .work_shift_id
                )
            );

          const startDate =
            assignment.start_date ||
            "제한 없음";

          const endDate =
            assignment.end_date ||
            "제한 없음";

          const days =
            Array.isArray(
              assignment.days_of_week
            ) &&
            assignment
              .days_of_week.length
              ? assignment
                  .days_of_week
                  .join(" · ")
              : "매일";

          const shiftText =
            workShift
              ? `${workShift.name} · ${String(
                  workShift.start_time
                ).slice(0, 5)}~${String(
                  workShift.end_time
                ).slice(0, 5)}`
              : "근무 시간대 미지정";

          return `
            <article
              class="detail-assignment-card"
            >
              <div
                class="detail-assignment-title"
              >
                <div>
                  <strong>
                    ${escapeHtml(
                      workplace?.name ||
                      "삭제된 근무지역"
                    )}
                  </strong>

                  <small>
                    ${escapeHtml(
                      workplace?.address ||
                      "주소 미등록"
                    )}
                  </small>
                </div>

                <span>
                  배정 중
                </span>
              </div>

              <dl
                class="detail-assignment-info"
              >
                <div>
                  <dt>배정 기간</dt>

                  <dd>
                    ${escapeHtml(
                      startDate
                    )}
                    ~
                    ${escapeHtml(
                      endDate
                    )}
                  </dd>
                </div>

                <div>
                  <dt>근무 요일</dt>

                  <dd>
                    ${escapeHtml(days)}
                  </dd>
                </div>

                <div>
                  <dt>근무 시간대</dt>

                  <dd>
                    ${escapeHtml(
                      shiftText
                    )}
                  </dd>
                </div>
              </dl>
            </article>
          `;
        })
        .join("");
  } catch (error) {
    console.error(
      "근무 배정 상세 조회 실패:",
      error
    );

    detailRegionList.innerHTML = `
      <div
        class="detail-assignment-empty error"
      >
        근무 배정 정보를 불러오지 못했습니다.
      </div>
    `;
  }
}

function renderProfileUI(employee) {
  if (!employee) return;

  const employeeName =
    employee.name || "이름 없음";

  const department =
    employee.department || "소속 미배정";

  const position =
    employee.position || "직급 미지정";

  const workplaceNames =
    Array.isArray(employee.workplaceNames)
      ? employee.workplaceNames
      : [];

  if (employeeDetailTitle) {
    employeeDetailTitle.textContent =
      `${employeeName} · 근태 상세`;
  }

  if (detailName) {
    detailName.textContent =
      employeeName;
  }

  if (detailInfo) {
    detailInfo.textContent =
      `${department} · ${position} · ${getEmployeeStatusText(
        employee.status
      )}`;
  }

  if (detailPhone) {
    detailPhone.textContent =
      employee.phone || "—";
  }

  const roleText = {
    employee:
      "일반 직원",

    team_lead:
      "팀장",

    checklist_admin:
      "점검 관리자",
  }[
    employee.app_role ||
    "employee"
  ] || "일반 직원";

  if (detailAppRole) {
    detailAppRole.textContent =
      roleText;
  }

  if (detailAppApproval) {
    const approvalText = {
      not_requested: "로그인 전",
      pending: "승인 대기",
      approved: "승인 완료",
      rejected: "승인 거절",
    };

    detailAppApproval.textContent =
      approvalText[
        employee.app_approval_status
      ] || "로그인 전";
  }

  if (detailJoinDate) {
    detailJoinDate.textContent =
      employee.created_at
        ? employee.created_at.split("T")[0]
        : "—";
  }

  if (detailStatus) {
    detailStatus.textContent =
      getEmployeeStatusText(
        employee.status
      );
  }

  renderEmployeeWorkplaces(
    workplaceNames
  );

  updateAccountStatusButton();
}

async function fetchAndRenderAttendance() {
  let startDate = "";
  let endDate = "";

  if (viewMode === "monthly") {
    const lastDay =
      new Date(
        selectedYear,
        selectedMonth + 1,
        0
      ).getDate();

    startDate = toLocalDateKey(
      selectedYear,
      selectedMonth,
      1
    );

    endDate = toLocalDateKey(
      selectedYear,
      selectedMonth,
      lastDay
    );

    currentTimeDisplay.textContent =
      `${selectedYear}년 ${
        selectedMonth + 1
      }월`;
  } else if (viewMode === "yearly") {
    startDate =
      `${selectedYear}-01-01`;

    endDate =
      `${selectedYear}-12-31`;

    currentTimeDisplay.textContent =
      `${selectedYear}년 연간 근무표`;
  } else {
    startDate =
      attendanceStartDate.value;

    endDate =
      attendanceEndDate.value;

    if (!startDate || !endDate) {
      return;
    }
  }

  try {
    const [
      attendanceResult,
      noteResult,
    ] = await Promise.all([
      supabase
        .from("attendance")
        .select("*")
        .eq("user_id", targetUserId)
        .gte("work_date", startDate)
        .lte("work_date", endDate)
        .order("work_date", {
          ascending: true,
        }),

      supabase
        .from("employee_daily_notes")
        .select(`
          note_date,
          content,
          day_type
        `)
        .eq("user_id", targetUserId)
        .gte("note_date", startDate)
        .lte("note_date", endDate)
        .order("note_date", {
          ascending: true,
        }),
    ]);

    if (attendanceResult.error) {
      throw attendanceResult.error;
    }

    if (noteResult.error) {
      throw noteResult.error;
    }

    currentAttendanceRecords =
      attendanceResult.data || [];

    dailyNotes = new Map(
      (noteResult.data || []).map(
        (note) => [
          note.note_date,
          {
            content:
              note.content || "",

            dayType:
              note.day_type ||
              "normal",
          },
        ]
      )
    );

    updateSummaryStats(
      currentAttendanceRecords
    );

    renderAttendanceTable(
      currentAttendanceRecords
    );

    toggleAttendanceRowsBtn
  ?.addEventListener(
    "click",
    () => {
      attendanceExpanded =
        !attendanceExpanded;

      renderAttendanceTable(
        currentAttendanceRecords
      );
    }
  );

    syncDailyNoteEditor();
  } catch (error) {
    console.error(
      "출근부 조회 실패:",
      error
    );

    alert(
      `출근부를 불러오지 못했습니다.\n${
        error.message || ""
      }`
    );
  }
}

function updateSummaryStats(list) {
  let totalDays = list.length;
  let lateCount = 0;
  let absentCount = 0;
  let totalMinutes = 0;

  list.forEach((item) => {
    if (item.status === "late" || item.status === "지각") lateCount++;
    if (item.status === "absent" || item.status === "미출근") absentCount++;
    totalMinutes += calcWorkMinutes(item.check_in_time, item.check_out_time);
  });

  if (statWorkDays) statWorkDays.textContent = totalDays;
  if (statLateCount) statLateCount.textContent = lateCount;
  if (statAbsentCount) statAbsentCount.textContent = absentCount;
  if (statWorkHours) statWorkHours.textContent = Math.floor(totalMinutes / 60);
}

function getRecentAttendanceDateKeys(
  displayRows
) {
  const today = new Date();

  const todayKey =
    `${today.getFullYear()}-` +
    `${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-` +
    `${String(
      today.getDate()
    ).padStart(2, "0")}`;

  const rowsUntilToday =
    displayRows.filter(
      (row) =>
        row.dateKey <= todayKey
    );

  const recentRows =
    rowsUntilToday.length
      ? rowsUntilToday.slice(-5)
      : displayRows.slice(0, 5);

  return new Set(
    recentRows.map(
      (row) => row.dateKey
    )
  );
}

function updateAttendanceToggleButton(
  totalRows
) {
  if (!toggleAttendanceRowsBtn) {
    return;
  }

  if (totalRows <= 5) {
    toggleAttendanceRowsBtn.hidden =
      true;

    return;
  }

  toggleAttendanceRowsBtn.hidden =
    false;

  toggleAttendanceRowsBtn.textContent =
    attendanceExpanded
      ? "최근 5일만 보기"
      : "전체 월 보기";
}

function renderAttendanceTable(
  records
) {
  if (!detailRecordTableBody) {
    return;
  }

  let displayRows = [];

  if (viewMode === "monthly") {
    const recordMap = new Map(
      records.map((record) => [
        record.work_date,
        record,
      ])
    );

    const lastDay = new Date(
      selectedYear,
      selectedMonth + 1,
      0
    ).getDate();

    for (
      let day = 1;
      day <= lastDay;
      day += 1
    ) {
      const dateKey =
        toLocalDateKey(
          selectedYear,
          selectedMonth,
          day
        );

      displayRows.push({
        dateKey,
        record:
          recordMap.get(dateKey) ||
          null,
      });
    }
  } else {
    displayRows = records
      .map((record) => ({
        dateKey:
          record.work_date,

        record,
      }))
      .sort(
        (a, b) =>
          a.dateKey.localeCompare(
            b.dateKey
          )
      );
  }

  if (!displayRows.length) {
    detailRecordTableBody.innerHTML = `
      <tr>
        <td colspan="6">
          조회된 기록이 없습니다.
        </td>
      </tr>
    `;

    updateAttendanceToggleButton(0);
    return;
  }

  const recentDateKeys =
    getRecentAttendanceDateKeys(
      displayRows
    );

  detailRecordTableBody.innerHTML =
    displayRows
      .map(({ dateKey, record }) => {
        const date = new Date(
          `${dateKey}T00:00:00`
        );

        const noteData =
          dailyNotes.get(dateKey) || {
            content: "",
            dayType: "normal",
          };

        const isAnnualLeave =
          noteData.dayType ===
          "annual_leave";

        const isCollapsed =
          !attendanceExpanded &&
          !recentDateKeys.has(
            dateKey
          );

        const rowClasses = [];

        if (isAnnualLeave) {
          rowClasses.push(
            "annual-leave-row"
          );
        }

        if (isCollapsed) {
          rowClasses.push(
            "attendance-collapsed-row"
          );
        }

        const dayText = String(
          date.getDate()
        ).padStart(2, "0");

        const monthText =
          date.getMonth() + 1;

        const checkIn =
          record?.check_in_time
            ? formatTimeOnly(
                record.check_in_time
              )
            : "";

        const checkOut =
          record?.check_out_time
            ? formatTimeOnly(
                record.check_out_time
              )
            : "";

        const workTime =
          isAnnualLeave
            ? "연차"
            : checkIn || checkOut
              ? `${
                  checkIn || "—"
                } - ${
                  checkOut || "—"
                }`
              : "";

        const workMinutes =
          record &&
          !isAnnualLeave
            ? calcWorkMinutes(
                record.check_in_time,
                record.check_out_time
              )
            : 0;

        const workTimeText =
          workMinutes > 0
            ? formatMinutesToHoursText(
                workMinutes
              )
            : "";

        return `
          <tr class="${rowClasses.join(" ")}">
            <td>
              <strong>
                ${date.getMonth() + 1}.${dayText}
              </strong>
            </td>

            <td>
              ${getKoreanDayOfWeek(dateKey)}
            </td>

            <td>
              ${
                isAnnualLeave
                  ? `
                    <strong class="annual-leave-text">
                      연차
                    </strong>
                  `
                  : escapeHtml(workTime)
              }
            </td>

            <td>
              ${escapeHtml(workTimeText)}
            </td>

            <td class="daily-note-cell">
              ${escapeHtml(noteData.content)}
            </td>

            <td class="attendance-edit-control">
              ${
                isAnnualLeave
                  ? "—"
                  : `
                    <button
                      type="button"
                      class="detail-attendance-edit-btn"
                      data-attendance-edit-id="${record?.id || ""}"
                      data-attendance-edit-date="${dateKey}"
                    >
                      ${record?.id ? "수정" : "기록 추가"}
                    </button>
                  `
              }
            </td>
          </tr>
        `;
      })
      .join("");

  detailRecordTableBody
    .querySelectorAll(
      "[data-attendance-edit-date]"
    )
  .forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        openDetailAttendanceModal(
          button.dataset
            .attendanceEditDate,

          button.dataset
            .attendanceEditId
        );
      }
    );
  });

  updateAttendanceToggleButton(
    displayRows.length
  );
}

function getAttendanceInputTime(
  value
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return [
    String(
      date.getHours()
    ).padStart(2, "0"),

    String(
      date.getMinutes()
    ).padStart(2, "0"),
  ].join(":");
}

attendanceEditCloseBtn
  ?.addEventListener(
    "click",
    closeDetailAttendanceModal
  );

attendanceEditCancelBtn
  ?.addEventListener(
    "click",
    closeDetailAttendanceModal
  );

attendanceEditSaveBtn
  ?.addEventListener(
    "click",
    saveDetailAttendance
  );

attendanceEditModal
  ?.addEventListener(
    "click",
    (event) => {
      if (
        event.target ===
        attendanceEditModal
      ) {
        closeDetailAttendanceModal();
      }
    }
  );
  
function normalizeDetailStatus(
  status
) {
  const statusMap = {
    정상: "completed",
    퇴근완료: "completed",
    근무중: "working",
    지각: "late",
    미출근: "absent",
    위치오류: "location_error",
  };

  return (
    statusMap[status] ||
    status ||
    "working"
  );
}

function createDetailDateTime(
  dateValue,
  timeValue
) {
  if (!dateValue || !timeValue) {
    return null;
  }

  const date = new Date(
    `${dateValue}T${timeValue}:00`
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function openDetailAttendanceModal(
  dateValue,
  attendanceId
) {
  selectedDetailAttendanceDate =
    dateValue;

  selectedDetailAttendance =
    currentAttendanceRecords.find(
      (record) =>
        String(record.id) ===
        String(attendanceId)
    ) || null;

  const employeeName =
    currentEmployeeData?.name ||
    "직원";

  attendanceEditModalTitle.textContent =
    selectedDetailAttendance
      ? "출퇴근 기록 수정"
      : "출퇴근 기록 추가";

  attendanceEditModalInfo.textContent =
    `${employeeName} · ${dateValue}`;

  detailEditCheckIn.value =
    getAttendanceInputTime(
      selectedDetailAttendance
        ?.check_in_time
    );

  detailEditCheckOut.value =
    getAttendanceInputTime(
      selectedDetailAttendance
        ?.check_out_time
    );

  detailEditStatus.value =
    normalizeDetailStatus(
      selectedDetailAttendance
        ?.status
    );

  detailEditReason.value =
    selectedDetailAttendance
      ? "근무시간 조정"
      : "직원 출근 누락";

  detailEditMemo.value = "";

  attendanceEditModal.hidden = false;
  attendanceEditModal.classList.add(
    "open"
  );

  document.body.style.overflow =
    "hidden";
}

function closeDetailAttendanceModal() {
  attendanceEditModal.classList.remove(
    "open"
  );

  attendanceEditModal.hidden = true;

  selectedDetailAttendance = null;
  selectedDetailAttendanceDate = null;

  document.body.style.overflow = "";
}

async function saveDetailAttendance() {
  if (
    !selectedDetailAttendanceDate
  ) {
    return;
  }

  const status =
    detailEditStatus.value;

  let checkIn =
    detailEditCheckIn.value;

  let checkOut =
    detailEditCheckOut.value;

  if (status === "absent") {
    checkIn = "";
    checkOut = "";
  }

  if (
    checkOut &&
    !checkIn
  ) {
    alert(
      "퇴근 시간을 입력하려면 출근 시간도 입력해야 합니다."
    );

    return;
  }

  if (
    checkIn &&
    checkOut &&
    checkOut < checkIn
  ) {
    alert(
      "퇴근 시간은 출근 시간보다 빠를 수 없습니다."
    );

    return;
  }

  if (
    detailEditReason.value ===
      "기타" &&
    !detailEditMemo.value.trim()
  ) {
    alert(
      "수정 사유가 기타인 경우 상세 메모를 입력해주세요."
    );

    return;
  }

  attendanceEditSaveBtn.disabled =
    true;

  attendanceEditSaveBtn.textContent =
    "저장 중...";

  try {
    const { data, error } =
      await supabase.rpc(
        "admin_save_attendance_record",
        {
          p_attendance_id:
            selectedDetailAttendance
              ?.id || null,

          p_user_id:
            targetUserId,

          p_work_date:
            selectedDetailAttendanceDate,

          p_workplace_id:
            selectedDetailAttendance
              ?.workplace_id ??
            currentEmployeeData
              ?.workplace_id ??
            null,

          p_check_in_time:
            createDetailDateTime(
              selectedDetailAttendanceDate,
              checkIn
            ),

          p_check_out_time:
            createDetailDateTime(
              selectedDetailAttendanceDate,
              checkOut
            ),

          p_status:
            status,

          p_edit_reason:
            detailEditReason.value,

          p_memo:
            detailEditMemo.value.trim(),
        }
      );

    if (error) {
      throw error;
    }

    alert(
      data?.created
        ? "출퇴근 기록이 추가되었습니다."
        : "출퇴근 기록이 수정되었습니다."
    );

    closeDetailAttendanceModal();

    await fetchAndRenderAttendance();
  } catch (error) {
    console.error(
      "직원 상세 출퇴근 저장 실패:",
      error
    );

    alert(
      `저장하지 못했습니다.\n${
        error.message ||
        "Supabase 설정을 확인해주세요."
      }`
    );
  } finally {
    attendanceEditSaveBtn.disabled =
      false;

    attendanceEditSaveBtn.textContent =
      "저장";
  }
}

function renderMemoHistory() {
  if (!memoHistoryList || !currentEmployeeData) return;

  const rawMemo = currentEmployeeData.memo || "";
  if (!rawMemo.trim()) {
    memoHistoryList.innerHTML = `<p style="color:#64748b; font-size:13px; margin:0;">등록된 메모가 없습니다.</p>`;
    return;
  }

  const memoItems = rawMemo.split("===").filter((m) => m.trim().length > 0);

  memoHistoryList.innerHTML = memoItems
    .map((item) => {
      const lines = item.trim().split("\n");
      const dateLine = lines[0]; 
      const content = lines.slice(1).join("\n"); 

      return `
        <div class="memo-item">
          <div class="memo-item-top">
            <strong>🗓️ ${dateLine}</strong>
            <span>관리자 작성</span>
          </div>
          <div class="memo-item-content">${content || dateLine}</div>
        </div>
      `;
    })
    .join("");
}

async function handleSaveMemo() {
  const newText = newMemoInput?.value.trim();
  if (!newText) {
    alert("메모 내용을 입력해 주세요.");
    return;
  }

  const nowStr = new Date().toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const formattedNewMemo = `[${nowStr}]\n${newText}`;
  const updatedMemo = currentEmployeeData.memo ? `${formattedNewMemo}\n===\n${currentEmployeeData.memo}` : formattedNewMemo;

  saveMemoBtn.disabled = true;
  saveMemoBtn.textContent = "저장 중...";

  const { error } = await supabase
    .from("users")
    .update({ memo: updatedMemo, updated_at: new Date().toISOString() })
    .eq("id", targetUserId);

  saveMemoBtn.disabled = false;
  saveMemoBtn.textContent = "메모 작성 및 저장";

  if (error) {
    alert("메모 저장에 실패했습니다.");
    console.error(error);
  } else {
    alert("✅ 메모가 저장되었습니다.");
    newMemoInput.value = "";
    currentEmployeeData.memo = updatedMemo;
    renderMemoHistory();
  }
}

async function handleDeleteAccount() {
  if (!currentEmployeeData) return;

  const typedText = prompt(
    `${currentEmployeeData.name} 직원과 관련된 모든 데이터를 영구 삭제합니다.\n\n계속하려면 '삭제'라고 입력하세요.`
  );

  if (typedText === null) {
    return;
  }

  if (typedText.trim() !== "삭제") {
    alert(
      "'삭제'를 정확히 입력해야 합니다."
    );

    return;
  }

  const finalConfirmed = confirm(
    "출퇴근 기록, 요청, 근무지 배정, 로그인 세션을 모두 삭제합니다.\n이 작업은 복구할 수 없습니다.\n\n정말 삭제하시겠습니까?"
  );

  if (!finalConfirmed) {
    return;
  }

  btnDeleteAccount.disabled = true;
  btnDeleteAccount.textContent =
    "삭제 중...";

  try {
    const { error } =
      await supabase.rpc(
        "admin_delete_employee_permanently",
        {
          p_user_id: targetUserId,
          p_confirmation: "삭제",
        }
      );

    if (error) {
      throw error;
    }

    alert(
      "직원과 관련 데이터가 모두 삭제되었습니다."
    );

    location.replace(
      "admin-employees.html"
    );
  } catch (error) {
    console.error(
      "직원 영구 삭제 실패:",
      error
    );

    alert(
      `직원 삭제에 실패했습니다.\n${
        error.message || ""
      }`
    );

    btnDeleteAccount.disabled = false;
    btnDeleteAccount.textContent =
      "계정 삭제";
  }
}

function openEmployeeAttendancePrint(
  title,
  html
) {
  const oldFrame =
    document.getElementById(
      "employeeAttendancePrintFrame"
    );

  oldFrame?.remove();

  const printFrame =
    document.createElement(
      "iframe"
    );

  printFrame.id =
    "employeeAttendancePrintFrame";

  printFrame.title =
    "직원 출근부 인쇄";

  Object.assign(
    printFrame.style,
    {
      position: "fixed",
      right: "0",
      bottom: "0",
      width: "0",
      height: "0",
      border: "0",
      visibility: "hidden",
    }
  );

  document.body.appendChild(
    printFrame
  );

  const printWindow =
    printFrame.contentWindow;

  printWindow.document.open();

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ko">
      <head>
        <meta charset="UTF-8">

        <title>
          ${escapeHtml(title)}
        </title>

        <style>
          @page {
            size: A4 portrait;
            margin: 7mm;
          }

          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;

            color: #111111;

            font-family:
              "Malgun Gothic",
              "Apple SD Gothic Neo",
              sans-serif;
          }

          .print-document {
            width: 100%;
          }

          .print-header {
            margin-bottom: 6mm;
            text-align: center;
          }

          .print-header h1 {
            margin: 0;

            font-size: 17pt;
            line-height: 1.3;
          }

          .print-header p {
            margin: 2mm 0 0;

            color: #333333;
            font-size: 9pt;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }

          th,
          td {
            border: 1px solid #666666;
            text-align: center;
            vertical-align: middle;
          }

          th {
            height: 6mm;
            padding: 1mm;

            background: #eeeeee;
            font-weight: 700;

            print-color-adjust: exact;
            -webkit-print-color-adjust:
              exact;
          }

          td {
            height: 7.7mm;
            padding: 1.1mm 1mm;
          }

          .employee-table {
            font-size: 7.5pt;
          }

          .employee-table th:nth-child(1),
          .employee-table td:nth-child(1) {
            width: 12%;
          }

          .employee-table th:nth-child(2),
          .employee-table td:nth-child(2) {
            width: 8%;
          }

          .employee-table th:nth-child(3),
          .employee-table td:nth-child(3) {
            width: 22%;
          }

          .employee-table th:nth-child(4),
          .employee-table td:nth-child(4) {
            width: 18%;
          }

          .employee-table th:nth-child(5),
          .employee-table td:nth-child(5) {
            width: 40%;
          }

          .weekend {
            background: #f8f8f8;

            print-color-adjust: exact;
            -webkit-print-color-adjust:
              exact;
          }

          .annual-leave-cell {
            background: #fff4cc;
            color: #8a5a00;
            font-weight: 700;

            print-color-adjust: exact;
            -webkit-print-color-adjust:
              exact;
          }

          .late-cell {
            background: #fee2e2;
            color: #b91c1c;
            font-weight: 700;

            print-color-adjust: exact;
            -webkit-print-color-adjust:
              exact;
          }

          .attendance-time-pair {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1.2mm;

            line-height: 1.2;
            white-space: nowrap;
          }

          .attendance-time-pair
          span + span::before {
            content: "~";
            margin-right: 1.2mm;
          }

          .note-column {
            padding-left: 2mm !important;
            text-align: left;
          }

          .print-signature {
            margin-top: 5mm;
            text-align: right;
            font-size: 9pt;
          }
        </style>
      </head>

      <body>
        ${html}
      </body>
    </html>
  `);

  printWindow.document.close();

  printWindow.addEventListener(
    "load",
    () => {
      window.setTimeout(
        () => {
          printWindow.focus();
          printWindow.print();

          printWindow.onafterprint =
            () => {
              printFrame.remove();
            };
        },
        250
      );
    }
  );
}


function handlePrintTableOnly() {
  if (!currentEmployeeData) {
    return;
  }

  const monthNumber =
    selectedMonth + 1;

  const daysInMonth =
    new Date(
      selectedYear,
      monthNumber,
      0
    ).getDate();

  const attendanceMap =
    new Map();

  currentAttendanceRecords.forEach(
    (record) => {
      const existing =
        attendanceMap.get(
          record.work_date
        );

      if (
        !existing ||
        (
          record.check_in_time &&
          !existing.check_in_time
        )
      ) {
        attendanceMap.set(
          record.work_date,
          record
        );
      }
    }
  );

  let totalWorkMinutes = 0;

  const rows = [];

  for (
    let day = 1;
    day <= daysInMonth;
    day += 1
  ) {
    const dateKey =
      toLocalDateKey(
        selectedYear,
        selectedMonth,
        day
      );

    const weekDay =
      getKoreanDayOfWeek(
        dateKey
      );

    const record =
      attendanceMap.get(
        dateKey
      );

    const note =
      dailyNotes.get(
        dateKey
      ) || {
        content: "",
        dayType: "normal",
      };

    const isAnnualLeave =
      note.dayType ===
      "annual_leave";

    const workMinutes =
      isAnnualLeave
        ? 0
        : calcWorkMinutes(
            record?.check_in_time,
            record?.check_out_time
          );

    totalWorkMinutes +=
      workMinutes;

    const isLate =
      [
        "late",
        "지각",
      ].includes(
        String(
          record?.status || ""
        ).toLowerCase()
      );

    const timeCellClass =
      isAnnualLeave
        ? "annual-leave-cell"
        : isLate
          ? "late-cell"
          : "";

    const rowClass =
      weekDay === "토" ||
      weekDay === "일"
        ? "weekend"
        : "";

    const checkInText =
      record?.check_in_time
        ? formatTimeOnly(
            record.check_in_time
          )
        : "—";

    const checkOutText =
      record?.check_out_time
        ? formatTimeOnly(
            record.check_out_time
          )
        : "—";

    rows.push(`
      <tr class="${rowClass}">
        <td>
          ${monthNumber}.${String(
            day
          ).padStart(2, "0")}
        </td>

        <td>
          ${weekDay}
        </td>

        <td class="${timeCellClass}">
          ${
            isAnnualLeave
              ? `
                <strong>
                  연차
                </strong>
              `
              : `
                <div class="attendance-time-pair">
                  <span>
                    ${escapeHtml(
                      checkInText
                    )}
                  </span>

                  <span>
                    ${escapeHtml(
                      checkOutText
                    )}
                  </span>
                </div>
              `
          }
        </td>

        <td>
          ${
            workMinutes > 0
              ? escapeHtml(
                  formatMinutesToHoursText(
                    workMinutes
                  )
                )
              : ""
          }
        </td>

        <td class="note-column">
          ${escapeHtml(
            note.content ||
            record?.memo ||
            ""
          )}
        </td>
      </tr>
    `);
  }

  const title =
    `${selectedYear}년 ` +
    `${monthNumber}월 출근부`;

  const department =
    currentEmployeeData.department ||
    "소속 미지정";

  const employeeName =
    currentEmployeeData.name ||
    "이름 없음";

  const workplaceNames =
    Array.isArray(
      currentEmployeeData
        .workplaceNames
    )
      ? [
          ...new Set(
            currentEmployeeData
              .workplaceNames
          ),
        ]
      : [];

  openEmployeeAttendancePrint(
    title,

    `
      <main class="print-document">
        <header class="print-header">
          <h1>
            ${escapeHtml(title)}
          </h1>

          <p>
            소속:
            ${escapeHtml(department)}
            |
            성명:
            ${escapeHtml(employeeName)}
            |
            근무지:
            ${escapeHtml(
              workplaceNames.join(", ") ||
              "미배정"
            )}
          </p>
        </header>

        <table class="employee-table">
          <thead>
            <tr>
              <th>일자</th>
              <th>요일</th>
              <th>출퇴근 시간</th>
              <th>시간합계</th>
              <th>기타사항</th>
            </tr>
          </thead>

          <tbody>
            ${rows.join("")}
          </tbody>
        </table>

        <div class="print-signature">
          총 근무시간:
          <strong>
            ${escapeHtml(
              formatMinutesToHoursText(
                totalWorkMinutes
              )
            )}
          </strong>
        </div>
      </main>
    `
  );
}

async function openEmployeeEditModal() {
  if (
    !employeeEditModal ||
    !currentEmployeeData
  ) {
    return;
  }

  editEmployeeName.value =
    currentEmployeeData.name || "";

  editEmployeePhone.value =
    currentEmployeeData.phone || "";

  editEmployeeRole.value =
    currentEmployeeData.app_role ||
    "employee";

  editEmployeeStatus.value =
    currentEmployeeData.status ||
    "active";

  editEmployeeMemo.value =
    currentEmployeeData.memo || "";

  editEmployeePosition.innerHTML = `
    <option value="">
      직급 미지정
    </option>
  `;

  editEmployeeDepartment.innerHTML = `
    <option value="">
      소속 미지정
    </option>
  `;

  try {
    const [
      positionResult,
      departmentResult,
      assignmentResult,
      shiftResult,
    ] = await Promise.all([
      supabase
        .from("job_positions")
        .select(`
          name,
          is_active,
          sort_order
        `)
        .order("sort_order"),

      supabase
        .from("employee_departments")
        .select(`
          name,
          is_active,
          sort_order
        `)
        .order("sort_order"),

      supabase
        .from("workplace_users")
        .select(`
          workplace_id,
          start_date,
          end_date,
          days_of_week,
          work_shift_id
        `)
        .eq(
          "user_id",
          targetUserId
        ),

        supabase
        .from("work_shifts")
        .select(`
          id,
          workplace_id,
          name,
          start_time,
          end_time,
          break_minutes,
          is_active,
          sort_order
        `)
        .eq("is_active", true)
        .order(
          "sort_order",
          {
            ascending: true,
          }
        )
        .order(
          "start_time",
          {
            ascending: true,
          }
        ),
    ]);

    if (positionResult.error) {
      throw positionResult.error;
    }

    if (departmentResult.error) {
      throw departmentResult.error;
    }

    if (assignmentResult.error) {
      throw assignmentResult.error;
    }

    if (shiftResult.error) {
      throw shiftResult.error;
    }

    const currentPosition =
      currentEmployeeData.position ||
      "";

    const currentDepartment =
      currentEmployeeData.department ||
      "";

    editEmployeePosition.innerHTML +=
      (positionResult.data || [])
        .filter(
          (item) =>
            item.is_active !== false ||
            item.name === currentPosition
        )
        .map(
          (item) => `
            <option value="${escapeHtml(
              item.name
            )}">
              ${escapeHtml(
                item.name
              )}
            </option>
          `
        )
        .join("");

    editEmployeeDepartment.innerHTML +=
      (departmentResult.data || [])
        .filter(
          (item) =>
            item.is_active !== false ||
            item.name === currentDepartment
        )
        .map(
          (item) => `
            <option value="${escapeHtml(
              item.name
            )}">
              ${escapeHtml(
                item.name
              )}
            </option>
          `
        )
        .join("");

    editEmployeePosition.value =
      currentPosition;

    editEmployeeDepartment.value =
      currentDepartment;

    const assignmentCount =
      (
        assignmentResult.data ||
        []
      ).length;

    editEmployeeAssignmentSummary
      .textContent =
      assignmentCount > 0
        ? `${assignmentCount}개 근무지역이 배정되어 있습니다.`
        : "배정된 근무지역과 시간대가 없습니다.";
  } catch (error) {
    console.error(
      "직원 수정 선택지 조회 실패:",
      error
    );

    editEmployeeAssignmentSummary
      .textContent =
      "배정 정보를 불러오지 못했습니다.";
  }

  employeeEditModal.classList.add(
    "open"
  );

  employeeEditModal.setAttribute(
    "aria-hidden",
    "false"
  );
}

function closeEmployeeEditModal() {
  employeeEditModal?.classList.remove(
    "open"
  );

  employeeEditModal?.setAttribute(
    "aria-hidden",
    "true"
  );
}

async function saveEmployeeProfile(
  event
) {
  event.preventDefault();

  const name =
    editEmployeeName.value
      .trim();

  const phone =
    editEmployeePhone.value
      .trim();

  const selectedPositionOption =
    editEmployeePosition
      .selectedOptions[0];

  const position =
    editEmployeePosition
      .selectedIndex > 0
      ? selectedPositionOption
          ?.textContent
          .trim() || null
      : null;

  const department =
    editEmployeeDepartment.value ||
    null;

  const appRole =
    editEmployeeRole.value;

  const nextStatus =
    editEmployeeStatus.value;

  const memo =
    editEmployeeMemo.value
      .trim() || null;

  if (!name || !phone) {
    alert(
      "직원명과 연락처를 모두 입력해 주세요."
    );

    return;
  }

  const saveButton =
    employeeEditForm.querySelector(
      'button[type="submit"]'
    );

  saveButton.disabled = true;
  saveButton.textContent =
    "저장 중...";

  try {
    const {
      error: profileError,
    } = await supabase
      .from("users")
      .update({
        name,
        phone,
        position,
        department,

        app_role:
          appRole,

        memo,
        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        targetUserId
      );

    if (profileError) {
      throw profileError;
    }

    if (
      nextStatus !==
      currentEmployeeData.status
    ) {
      const {
        error: statusError,
      } = await supabase.rpc(
        "admin_set_employee_status",
        {
          p_user_id:
            targetUserId,

          p_status:
            nextStatus,
        }
      );

      if (statusError) {
        throw statusError;
      }
    }

    const refreshedEmployee =
      await fetchEmployeeProfile();

    currentEmployeeData =
      refreshedEmployee || {
        ...currentEmployeeData,
        name,
        phone,
        position,
        department,
        app_role:
          appRole,

        attendance_exempt:
          attendanceExempt,

        status:
          nextStatus,
        memo,
      };

    renderProfileUI(
      currentEmployeeData
    );

    updateAccountStatusButton();
    closeEmployeeEditModal();

    alert(
      "직원 정보가 수정되었습니다."
    );
  } catch (error) {
    console.error(
      "직원 정보 수정 실패:",
      error
    );

    alert(
      `직원 정보 수정에 실패했습니다.\n${
        error.message || ""
      }`
    );
  } finally {
    saveButton.disabled =
      false;

    saveButton.textContent =
      "수정 저장";
  }
}

async function openRegionEditModal() {
  if (
    !regionEditModal ||
    !currentEmployeeData
  ) {
    return;
  }

  regionEditList.innerHTML =
    "근무지 정보를 불러오는 중입니다.";

  regionEditModal.classList.add(
    "open"
  );

  regionEditModal.setAttribute(
    "aria-hidden",
    "false"
  );

  try {
    const [
      workplaceResult,
      assignmentResult,
      shiftResult,
    ] = await Promise.all([
      supabase
        .from("workplaces")
        .select(`
          id,
          name,
          address,
          is_active
        `)
        .eq("is_active", true)
        .order("name", {
          ascending: true,
        }),

      supabase
        .from("workplace_users")
        .select(`
          workplace_id,
          start_date,
          end_date,
          days_of_week,
          work_shift_id
        `)
        .eq(
          "user_id",
          targetUserId
        ),

      supabase
        .from("work_shifts")
        .select(`
          id,
          workplace_id,
          name,
          start_time,
          end_time,
          break_minutes,
          is_active,
          sort_order
        `)
        .eq("is_active", true)
        .order("sort_order", {
          ascending: true,
        })
        .order("start_time", {
          ascending: true,
        }),
    ]);

    if (workplaceResult.error) {
      throw workplaceResult.error;
    }

    if (assignmentResult.error) {
      throw assignmentResult.error;
    }

    if (shiftResult.error) {
      throw shiftResult.error;
    }

    const workplaces =
      workplaceResult.data || [];

    const assignments =
      assignmentResult.data || [];

    const assignmentMap =
      new Map(
        assignments.map(
          (assignment) => [
            String(
              assignment.workplace_id
            ),
            assignment,
          ]
        )
      );

    const workShifts =
      shiftResult.data || [];

    if (!workplaces.length) {
      regionEditList.innerHTML = `
        <div class="detail-workplace-empty">
          등록된 활성 근무지가 없습니다.
        </div>
      `;

      return;
    }

    const weekDays = [
      "월",
      "화",
      "수",
      "목",
      "금",
      "토",
      "일",
    ];

    regionEditList.innerHTML =
      workplaces
        .map(
          (
            workplace,
            workplaceIndex
          ) => {
            const workplaceId =
              String(workplace.id);

            const assignment =
              assignmentMap.get(
                workplaceId
              );

            const isAssigned =
              Boolean(assignment);

            const savedDays =
              Array.isArray(
                assignment
                  ?.days_of_week
              )
                ? assignment
                    .days_of_week
                : [];

            const isEveryDay =
              savedDays.length === 0;

            return `
              <article
                class="detail-workplace-card ${
                  isAssigned
                    ? "selected"
                    : ""
                }"
                data-workplace-id="${escapeHtml(
                  workplaceId
                )}"
              >
                <div class="detail-workplace-card-top">
                  <input
                    id="detailWorkplace${workplaceIndex}"
                    class="detail-workplace-select"
                    type="checkbox"
                    ${
                      isAssigned
                        ? "checked"
                        : ""
                    }
                  />

                  <label
                    for="detailWorkplace${workplaceIndex}"
                    class="detail-workplace-main-label"
                  >
                    <span class="detail-workplace-check"></span>

                    <span>
                      <strong>
                        ${escapeHtml(
                          workplace.name
                        )}
                      </strong>

                      <small>
                        ${escapeHtml(
                          workplace.address ||
                          "주소 미등록"
                        )}
                      </small>
                    </span>
                  </label>
                </div>

                <div class="detail-workplace-schedule">
                  <div class="detail-workplace-period">
                    <label>
                      배정 시작일

                      <input
                        class="detail-workplace-start-date"
                        type="date"
                        value="${escapeHtml(
                          assignment
                            ?.start_date ||
                          ""
                        )}"
                      />
                    </label>

                    <label>
                      배정 종료일

                      <input
                        class="detail-workplace-end-date"
                        type="date"
                        value="${escapeHtml(
                          assignment
                            ?.end_date ||
                          ""
                        )}"
                      />
                    </label>
                  </div>

                  <div class="detail-workplace-time">
                    <label>
                      근무 시간대

                      <select
                        class="detail-workplace-shift-select"
                      >
                        <option value="">
                          시간대 미지정
                        </option>

                        ${workShifts
                          .filter(
                            (shift) =>
                              String(
                                shift.workplace_id
                              ) === workplaceId
                          )
                          .map(
                            (shift) => `
                              <option
                                value="${escapeHtml(
                                  shift.id
                                )}"
                                ${
                                  String(
                                    assignment
                                      ?.work_shift_id ||
                                    ""
                                  ) ===
                                  String(shift.id)
                                    ? "selected"
                                    : ""
                                }
                              >
                                ${escapeHtml(
                                  shift.name
                                )}
                                (${escapeHtml(
                                  String(
                                    shift.start_time
                                  ).slice(0, 5)
                                )}
                                ~
                                ${escapeHtml(
                                  String(
                                    shift.end_time
                                  ).slice(0, 5)
                                )})
                              </option>
                            `
                          )
                          .join("")}
                      </select>

                      <small>
                        출퇴근 시간 관리에서 등록한 시간대가 표시됩니다.
                      </small>
                    </label>
                  </div>

                  <div class="detail-workplace-days">
                    <span class="detail-workplace-days-title">
                      출근 가능 요일
                    </span>

                    <div class="detail-workplace-day-list">
                      <label class="detail-day-option every-day">
                        <input
                          class="detail-every-day-check"
                          type="checkbox"
                          ${
                            isEveryDay
                              ? "checked"
                              : ""
                          }
                        />

                        <span>
                          매일
                        </span>
                      </label>

                      ${weekDays
                        .map(
                          (
                            day,
                            dayIndex
                          ) => `
                            <label class="detail-day-option">
                              <input
                                class="detail-weekday-check"
                                type="checkbox"
                                value="${day}"
                                ${
                                  savedDays.includes(
                                    day
                                  )
                                    ? "checked"
                                    : ""
                                }
                                ${
                                  isEveryDay
                                    ? "disabled"
                                    : ""
                                }
                              />

                              <span>
                                ${day}
                              </span>
                            </label>
                          `
                        )
                        .join("")}
                    </div>
                  </div>
                </div>
              </article>
            `;
          }
        )
        .join("");

    regionEditList
      .querySelectorAll(
        ".detail-workplace-card"
      )
      .forEach((card) => {
        const workplaceCheck =
          card.querySelector(
            ".detail-workplace-select"
          );

        const everyDayCheck =
          card.querySelector(
            ".detail-every-day-check"
          );

        const weekdayChecks = [
          ...card.querySelectorAll(
            ".detail-weekday-check"
          ),
        ];

        const scheduleInputs = [
          ...card.querySelectorAll(
            `
              input[type="date"],
              .detail-workplace-shift-select
            `
          ),
        ];

        function syncCardState() {
          const assigned =
            workplaceCheck.checked;

          card.classList.toggle(
            "selected",
            assigned
          );

          everyDayCheck.disabled =
            !assigned;

          scheduleInputs.forEach(
            (input) => {
              input.disabled =
                !assigned;
            }
          );

          weekdayChecks.forEach(
            (input) => {
              input.disabled =
                !assigned ||
                everyDayCheck.checked;
            }
          );
        }

        workplaceCheck.addEventListener(
          "change",
          syncCardState
        );

        everyDayCheck.addEventListener(
          "change",
          () => {
            if (
              everyDayCheck.checked
            ) {
              weekdayChecks.forEach(
                (input) => {
                  input.checked =
                    false;
                }
              );
            }

            syncCardState();
          }
        );

        weekdayChecks.forEach(
          (weekdayCheck) => {
            weekdayCheck
              .addEventListener(
                "change",
                () => {
                  const hasSelectedDay =
                    weekdayChecks.some(
                      (input) =>
                        input.checked
                    );

                  everyDayCheck.checked =
                    !hasSelectedDay;

                  syncCardState();
                }
              );
          }
        );

        syncCardState();
      });
  } catch (error) {
    console.error(
      "근무지 배정 정보 조회 실패:",
      error
    );

    regionEditList.textContent =
      "근무지 정보를 불러오지 못했습니다.";
  }
}

function closeRegionEditModal() {
  regionEditModal?.classList.remove(
    "open"
  );

  regionEditModal?.setAttribute(
    "aria-hidden",
    "true"
  );
}

async function saveEmployeeRegions() {
  const selectedCards = [
    ...regionEditList
      .querySelectorAll(
        ".detail-workplace-card"
      ),
  ].filter((card) =>
    card.querySelector(
      ".detail-workplace-select"
    )?.checked
  );

  const assignments = [];

  for (
    const card of selectedCards
  ) {
    const workplaceId =
      card.dataset.workplaceId;

    const startDate =
      card.querySelector(
        ".detail-workplace-start-date"
      )?.value || null;

    const endDate =
      card.querySelector(
        ".detail-workplace-end-date"
      )?.value || null;

    const workShiftId =
      card.querySelector(
        ".detail-workplace-shift-select"
      )?.value || null;

    if (
      startDate &&
      endDate &&
      endDate < startDate
    ) {
      alert(
        "배정 종료일은 시작일보다 빠를 수 없습니다."
      );

      return;
    }

    const everyDay =
      card.querySelector(
        ".detail-every-day-check"
      )?.checked;

    const daysOfWeek =
      everyDay
        ? []
        : [
            ...card.querySelectorAll(
              ".detail-weekday-check:checked"
            ),
          ].map(
            (input) =>
              input.value
          );

    assignments.push({
      workplace_id:
        Number(workplaceId),

      start_date:
        startDate,

      end_date:
        endDate,

      days_of_week:
        daysOfWeek,

      work_shift_id:
        workShiftId
          ? Number(workShiftId)
          : null,
    });
  }

  regionEditSaveBtn.disabled =
    true;

  regionEditSaveBtn.textContent =
    "저장 중...";

  try {
    const { data, error } =
      await supabase.rpc(
        "admin_set_user_workplace_schedules",
        {
          p_user_id:
            targetUserId,

          p_assignments:
            assignments,
        }
      );

    if (error) {
      throw error;
    }

    const refreshedEmployee =
      await fetchEmployeeProfile();

    if (refreshedEmployee) {
      currentEmployeeData =
        refreshedEmployee;

      renderProfileUI(
        currentEmployeeData
      );
    }

    await loadAndRenderEmployeeAssignments();

    closeRegionEditModal();

    alert(
      `${data?.saved_count ?? assignments.length}개 근무지 배정이 저장되었습니다.`
    );
  } catch (error) {
    console.error(
      "근무지 배정 저장 실패:",
      error
    );

    const message =
      error.message || "";

    if (
      message.includes(
        "INVALID_ASSIGNMENT_PERIOD"
      )
    ) {
      alert(
        "배정 시작일과 종료일을 확인해주세요."
      );
    } else if (
      message.includes(
        "WORKPLACE_NOT_FOUND_OR_INACTIVE"
      )
    ) {
      alert(
        "삭제되었거나 비활성화된 근무지가 포함되어 있습니다."
      );
    } else {
      alert(
        `근무지 배정에 실패했습니다.\n${message}`
      );
    }
  } finally {
    regionEditSaveBtn.disabled =
      false;

    regionEditSaveBtn.textContent =
      "근무지 배정 저장";
  }
}

editEmployeeBtn?.addEventListener(
  "click",
  openEmployeeEditModal
);

employeeEditCloseBtn?.addEventListener(
  "click",
  closeEmployeeEditModal
);

employeeEditCancelBtn?.addEventListener(
  "click",
  closeEmployeeEditModal
);

employeeEditForm?.addEventListener(
  "submit",
  saveEmployeeProfile
);

btnEditRegion?.addEventListener(
  "click",
  openRegionEditModal
);

regionEditCloseBtn?.addEventListener(
  "click",
  closeRegionEditModal
);

regionEditCancelBtn?.addEventListener(
  "click",
  closeRegionEditModal
);

regionEditSaveBtn?.addEventListener(
  "click",
  saveEmployeeRegions
);

btnDeactivate?.addEventListener(
  "click",
  toggleEmployeeStatus
);

btnDeleteAccount?.addEventListener(
  "click",
  handleDeleteAccount
);

function updateAccountStatusButton() {
  if (
    !btnDeactivate ||
    !currentEmployeeData
  ) {
    return;
  }

  const isActive =
    currentEmployeeData.status ===
    "active";

  btnDeactivate.textContent =
    isActive
      ? "계정 비활성화"
      : "계정 활성화";

  btnDeactivate.classList.toggle(
    "is-activate",
    !isActive
  );
}

async function toggleEmployeeStatus() {
  if (!currentEmployeeData) return;

  const isActive =
    currentEmployeeData.status ===
    "active";

  const nextStatus =
    isActive
      ? "inactive"
      : "active";

  const actionText =
    isActive
      ? "비활성화"
      : "활성화";

  const confirmed = confirm(
    `${currentEmployeeData.name} 직원을 ${actionText}하시겠습니까?`
  );

  if (!confirmed) return;

  btnDeactivate.disabled = true;

  try {
    const { data, error } =
      await supabase.rpc(
        "admin_set_employee_status",
        {
          p_user_id: targetUserId,
          p_status: nextStatus,
        }
      );

    if (error) {
      throw error;
    }

    currentEmployeeData.status =
      data;

    renderProfileUI(
      currentEmployeeData
    );

    updateAccountStatusButton();

    alert(
      `계정이 ${actionText}되었습니다.`
    );
  } catch (error) {
    console.error(
      "계정 상태 변경 실패:",
      error
    );

    alert(
      `상태 변경에 실패했습니다.\n${
        error.message || ""
      }`
    );
  } finally {
    btnDeactivate.disabled = false;
  }
}

function setupEventListeners() {
  /* 월간·연간·직접 기간 탭 */

  viewTabBtns.forEach((button) => {
    button.addEventListener(
      "click",
      async () => {
        viewTabBtns.forEach(
          (item) =>
            item.classList.remove(
              "active"
            )
        );

        button.classList.add(
          "active"
        );

        viewMode =
          button.dataset.mode;

        if (viewMode === "custom") {
          if (timeNavigator) {
            timeNavigator.style.display =
              "none";
          }

          if (customDateFilter) {
            customDateFilter.style.display =
              "flex";
          }

          return;
        }

        if (timeNavigator) {
          timeNavigator.style.display =
            "flex";
        }

        if (customDateFilter) {
          customDateFilter.style.display =
            "none";
        }

        attendanceExpanded = false;
        await fetchAndRenderAttendance();
      }
    );
  });


  /* 이전 기간 */

  prevTimeBtn?.addEventListener(
    "click",
    async () => {
      if (viewMode === "monthly") {
        selectedMonth -= 1;

        if (selectedMonth < 0) {
          selectedMonth = 11;
          selectedYear -= 1;
        }
      } else if (
        viewMode === "yearly"
      ) {
        selectedYear -= 1;
      }

      attendanceExpanded = false;
      await fetchAndRenderAttendance();
    }
  );


  /* 다음 기간 */

  nextTimeBtn?.addEventListener(
    "click",
    async () => {
      if (viewMode === "monthly") {
        selectedMonth += 1;

        if (selectedMonth > 11) {
          selectedMonth = 0;
          selectedYear += 1;
        }
      } else if (
        viewMode === "yearly"
      ) {
        selectedYear += 1;
      }

      attendanceExpanded = false;
      await fetchAndRenderAttendance();
    }
  );


  /* 직접 기간 조회 */

  attendanceSearchBtn?.addEventListener(
    "click",
    async () => {
      attendanceExpanded = false;
      await fetchAndRenderAttendance();
    }
  );


  /* 상단 월간 출근부 출력 */

  btnViewMonthly?.addEventListener(
    "click",
    async () => {
      viewMode = "monthly";

      viewTabBtns.forEach(
        (button) => {
          button.classList.toggle(
            "active",
            button.dataset.mode ===
              "monthly"
          );
        }
      );

      if (timeNavigator) {
        timeNavigator.style.display =
          "flex";
      }

      if (customDateFilter) {
        customDateFilter.style.display =
          "none";
      }

      attendanceExpanded = false;
      await fetchAndRenderAttendance();

      handlePrintTableOnly();
    }
  );


  /* 현재 표시된 출근부 출력 */

  btnExcelPrint?.addEventListener(
    "click",
    handlePrintTableOnly
  );


  /* 관리자 메모 저장 */

  dailyNoteDate?.addEventListener(
    "change",
    syncDailyNoteEditor
  );

  saveDailyNoteBtn?.addEventListener(
    "click",
    saveDailyNote
  );

  deleteDailyNoteBtn?.addEventListener(
    "click",
    deleteDailyNote
  );

  /* 모달 바깥 클릭 닫기 */

  employeeEditModal?.addEventListener(
    "click",
    (event) => {
      if (
        event.target ===
        employeeEditModal
      ) {
        closeEmployeeEditModal();
      }
    }
  );

  regionEditModal?.addEventListener(
    "click",
    (event) => {
      if (
        event.target ===
        regionEditModal
      ) {
        closeRegionEditModal();
      }
    }
  );


  /* ESC로 모달 닫기 */

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape") {
        return;
      }

      if (
        employeeEditModal
          ?.classList
          .contains("open")
      ) {
        closeEmployeeEditModal();
        return;
      }

      if (
        regionEditModal
          ?.classList
          .contains("open")
      ) {
        closeRegionEditModal();
      }
    }
  );
}

function syncDailyNoteEditor() {
  if (
    !dailyNoteDate ||
    !dailyNoteInput ||
    !dailyNoteType
  ) {
    return;
  }

  if (!dailyNoteDate.value) {
    const today = new Date();

    const isCurrentMonth =
      today.getFullYear() ===
        selectedYear &&
      today.getMonth() ===
        selectedMonth;

    dailyNoteDate.value =
      isCurrentMonth
        ? toLocalDateKey(
            selectedYear,
            selectedMonth,
            today.getDate()
          )
        : toLocalDateKey(
            selectedYear,
            selectedMonth,
            1
          );
  }

  const noteData =
    dailyNotes.get(
      dailyNoteDate.value
    );

  dailyNoteInput.value =
    noteData?.content || "";

  dailyNoteType.value =
    noteData?.dayType ||
    "normal";
}

async function saveDailyNote() {
  const noteDate =
    dailyNoteDate.value;

  const content =
    dailyNoteInput.value.trim();

  const dayType =
    dailyNoteType.value ||
    "normal";

  if (!noteDate) {
    alert(
      "날짜를 선택해 주세요."
    );

    return;
  }

  if (
    dayType === "normal" &&
    !content
  ) {
    alert(
      "기타사항을 입력하거나 연차를 선택해 주세요."
    );

    return;
  }

  saveDailyNoteBtn.disabled = true;
  saveDailyNoteBtn.textContent =
    "저장 중...";

  try {
    const { error } =
      await supabase
        .from(
          "employee_daily_notes"
        )
        .upsert(
          {
            user_id:
              targetUserId,

            note_date:
              noteDate,

            day_type:
              dayType,

            content:
              content,

            updated_at:
              new Date()
                .toISOString(),
          },
          {
            onConflict:
              "user_id,note_date",
          }
        );

    if (error) {
      throw error;
    }

    dailyNotes.set(
      noteDate,
      {
        content,
        dayType,
      }
    );

    renderAttendanceTable(
      currentAttendanceRecords
    );

    alert(
      dayType === "annual_leave"
        ? "연차가 등록되었습니다."
        : "기타사항이 저장되었습니다."
    );
  } catch (error) {
    console.error(
      "기타사항 저장 실패:",
      error
    );

    alert(
      `저장에 실패했습니다.\n${
        error.message || ""
      }`
    );
  } finally {
    saveDailyNoteBtn.disabled =
      false;

    saveDailyNoteBtn.textContent =
      "기타사항 저장";

    dailyNoteType.value = "normal";
  }
}


async function deleteDailyNote() {
  const noteDate =
    dailyNoteDate.value;

  if (!noteDate) {
    return;
  }

  const confirmed = confirm(
    `${noteDate} 기타사항을 삭제하시겠습니까?`
  );

  if (!confirmed) return;

  const { error } = await supabase
    .from("employee_daily_notes")
    .delete()
    .eq("user_id", targetUserId)
    .eq("note_date", noteDate);

  if (error) {
    alert(
      "기타사항을 삭제하지 못했습니다."
    );

    console.error(error);
    return;
  }

  dailyNotes.delete(noteDate);
  dailyNoteInput.value = "";

  renderAttendanceTable(
    currentAttendanceRecords
  );

  alert(
    "기타사항이 삭제되었습니다."
  );
}

async function init() {
  currentEmployeeData =
    await fetchEmployeeProfile();

  if (!currentEmployeeData) {
    return;
  }

  renderProfileUI(
    currentEmployeeData
  );

  await loadAndRenderEmployeeAssignments();

  setupEventListeners();

  const today = new Date();

  const todayStr =
    `${today.getFullYear()}-` +
    `${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-` +
    `${String(
      today.getDate()
    ).padStart(2, "0")}`;

  const firstDay =
    `${selectedYear}-` +
    `${String(
      selectedMonth + 1
    ).padStart(2, "0")}-01`;

  if (attendanceStartDate) {
    attendanceStartDate.value =
      firstDay;
  }

  if (attendanceEndDate) {
    attendanceEndDate.value =
      todayStr;
  }

  attendanceExpanded = false;
  await fetchAndRenderAttendance();

  openRegionFromEmployeeEditBtn
  ?.addEventListener(
    "click",
    () => {
      closeEmployeeEditModal();
      openRegionEditModal();
    }
  );
}

init();