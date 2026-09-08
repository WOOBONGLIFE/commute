import supabase from "./supabase.js";

/* =========================
  DOM
========================= */

const monthFilter =
  document.getElementById(
    "monthFilter"
  );

const monthlyWorkplaceFilter =
  document.getElementById(
    "monthlyWorkplaceFilter"
  );

const monthlySearchInput =
  document.getElementById(
    "monthlySearchInput"
  );

const monthlyViewTabs = [
  ...document.querySelectorAll(
    "[data-monthly-view]"
  ),
];

const summaryEmployeeCount =
  document.getElementById(
    "summaryEmployeeCount"
  );

const summaryAttendanceCount =
  document.getElementById(
    "summaryAttendanceCount"
  );

const summaryLateCount =
  document.getElementById(
    "summaryLateCount"
  );

const summaryLeaveEmployeeCount =
  document.getElementById(
    "summaryLeaveEmployeeCount"
  );

const summaryLeaveDayCount =
  document.getElementById(
    "summaryLeaveDayCount"
  );

const attendanceEmployeeBadge =
  document.getElementById(
    "attendanceEmployeeBadge"
  );

const leaveEmployeeBadge =
  document.getElementById(
    "leaveEmployeeBadge"
  );

const monthlyEmployeeTableTitle =
  document.getElementById(
    "monthlyEmployeeTableTitle"
  );

const monthlyEmployeeTableDescription =
  document.getElementById(
    "monthlyEmployeeTableDescription"
  );

const monthlyResultCount =
  document.getElementById(
    "monthlyResultCount"
  );

const monthlyEmployeeTableBody =
  document.getElementById(
    "monthlyEmployeeTableBody"
  );

const employeePrintSearchInput =
  document.getElementById(
    "employeePrintSearchInput"
  );

const employeePrintSelect =
  document.getElementById(
    "employeePrintSelect"
  );

const workplacePrintSelect =
  document.getElementById(
    "workplacePrintSelect"
  );

const employeeMonthlyPrintBtn =
  document.getElementById(
    "employeeMonthlyPrintBtn"
  );

const workplaceMonthlyPrintBtn =
  document.getElementById(
    "workplaceMonthlyPrintBtn"
  );

const monthlyDownloadBtn =
  document.getElementById(
    "monthlyDownloadBtn"
  );

/* =========================
  상태값
========================= */

let currentView = "attendance";

let employees = [];

let workplaces = [];

let workplaceAssignments = [];

let attendanceRecords = [];

let leaveRecords = [];

let employeeSummaries = [];

let filteredSummaries = [];

/* =========================
  기본 함수
========================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getCurrentMonth() {
  const today = new Date();

  return [
    today.getFullYear(),

    String(
      today.getMonth() + 1
    ).padStart(2, "0"),
  ].join("-");
}

function getMonthRange(monthValue) {
  const [
    year,
    month,
  ] = monthValue
    .split("-")
    .map(Number);

  const startDate =
    `${year}-${String(
      month
    ).padStart(2, "0")}-01`;

  const nextMonth =
    new Date(
      year,
      month,
      1
    );

  const endDate = [
    nextMonth.getFullYear(),

    String(
      nextMonth.getMonth() + 1
    ).padStart(2, "0"),

    "01",
  ].join("-");

  return {
    startDate,
    endDate,
  };
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "—";
  }

  const date = new Date(
    `${dateValue}T00:00:00`
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return dateValue;
  }

  return date.toLocaleDateString(
    "ko-KR",
    {
      month: "2-digit",
      day: "2-digit",
    }
  );
}

function calculateWorkMinutes(
  checkIn,
  checkOut
) {
  if (!checkIn || !checkOut) {
    return 0;
  }

  const start = new Date(checkIn);
  const end = new Date(checkOut);

  const minutes = Math.floor(
    (
      end.getTime() -
      start.getTime()
    ) / 60000
  );

  return Number.isFinite(minutes) &&
    minutes > 0
    ? minutes
    : 0;
}

function formatWorkMinutes(
  totalMinutes
) {
  if (!totalMinutes) {
    return "0시간";
  }

  const hours =
    Math.floor(
      totalMinutes / 60
    );

  const minutes =
    totalMinutes % 60;

  if (!minutes) {
    return `${hours}시간`;
  }

  return `${hours}시간 ${minutes}분`;
}

function isLateStatus(status) {
  return [
    "late",
    "지각",
  ].includes(status);
}

/* =========================
  데이터 조회
========================= */

async function fetchBaseData() {
  const [
    employeeResult,
    workplaceResult,
    assignmentResult,
  ] = await Promise.all([
    supabase
      .from("users")
      .select(`
        id,
        name,
        department,
        status
      `)
      .neq(
        "status",
        "deleted"
      )
      .order("name", {
        ascending: true,
      }),

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
        user_id,
        workplace_id,
        start_date,
        end_date,
        days_of_week
      `),
  ]);

  if (employeeResult.error) {
    throw employeeResult.error;
  }

  if (workplaceResult.error) {
    throw workplaceResult.error;
  }

  if (assignmentResult.error) {
    throw assignmentResult.error;
  }

  employees =
    employeeResult.data || [];

  workplaces =
    workplaceResult.data || [];

  workplaceAssignments =
    assignmentResult.data || [];
}

async function fetchMonthlyData() {
  const selectedMonth =
    monthFilter.value ||
    getCurrentMonth();

  const {
    startDate,
    endDate,
  } = getMonthRange(
    selectedMonth
  );

  const [
    attendanceResult,
    leaveResult,
  ] = await Promise.all([
    supabase
      .from("attendance")
      .select(`
        id,
        user_id,
        workplace_id,
        work_date,
        check_in_time,
        check_out_time,
        status,
        memo
      `)
      .gte(
        "work_date",
        startDate
      )
      .lt(
        "work_date",
        endDate
      )
      .order("work_date", {
        ascending: true,
      }),

    supabase
      .from(
        "employee_daily_notes"
      )
      .select(`
        id,
        user_id,
        note_date,
        content,
        day_type
      `)
      .eq(
        "day_type",
        "annual_leave"
      )
      .gte(
        "note_date",
        startDate
      )
      .lt(
        "note_date",
        endDate
      )
      .order("note_date", {
        ascending: true,
      }),
  ]);

  if (attendanceResult.error) {
    throw attendanceResult.error;
  }

  if (leaveResult.error) {
    throw leaveResult.error;
  }

  attendanceRecords =
    attendanceResult.data || [];

  leaveRecords =
    leaveResult.data || [];}

/* =========================
  직원별 집계
========================= */

function buildEmployeeSummaries() {
  const employeeMap =
    new Map(
      employees.map(
        (employee) => [
          String(employee.id),
          employee,
        ]
      )
    );

  const workplaceMap =
    new Map(
      workplaces.map(
        (workplace) => [
          String(workplace.id),
          workplace,
        ]
      )
    );

  const assignmentsByUser =
    new Map();

  workplaceAssignments.forEach(
    (assignment) => {
      const userId =
        String(
          assignment.user_id
        );

      if (
        !assignmentsByUser.has(
          userId
        )
      ) {
        assignmentsByUser.set(
          userId,
          []
        );
      }

      assignmentsByUser
        .get(userId)
        .push(assignment);
    }
  );

  const summaryMap = new Map();

  function getSummary(userId) {
    const key =
      String(userId);

    if (
      summaryMap.has(key)
    ) {
      return summaryMap.get(
        key
      );
    }

    const employee =
      employeeMap.get(key) || {
        id: userId,
        name: "이름 없음",
        department:
          "소속 미지정",
        status: "unknown",
      };

    const assignedWorkplaces =
      (
        assignmentsByUser.get(
          key
        ) || []
      )
        .map((assignment) =>
          workplaceMap.get(
            String(
              assignment.workplace_id
            )
          )
        )
        .filter(Boolean);

    const summary = {
      userId:
        employee.id,

      name:
        employee.name ||
        "이름 없음",

      department:
        employee.department ||
        "소속 미지정",

      status:
        employee.status,

      workplaceIds:
        new Set(
          assignedWorkplaces.map(
            (workplace) =>
              String(
                workplace.id
              )
          )
        ),

      workplaceNames:
        new Set(
          assignedWorkplaces.map(
            (workplace) =>
              workplace.name
          )
        ),

      attendanceByDate:
        new Map(),

      leaveDates:
        new Set(),

      attendanceDays: 0,

      lateCount: 0,

      leaveDays: 0,

      totalWorkMinutes: 0,

      lastAttendanceDate:
        null,
    };

    summaryMap.set(
      key,
      summary
    );

    return summary;
  }

  attendanceRecords.forEach(
    (record) => {
      /*
        실제 출근시간이 있는 기록만
        출근 직원 집계에 포함합니다.
      */
      if (!record.check_in_time) {
        return;
      }

      const summary =
        getSummary(
          record.user_id
        );

      const workplace =
        workplaceMap.get(
          String(
            record.workplace_id
          )
        );

      if (workplace) {
        summary.workplaceIds.add(
          String(workplace.id)
        );

        summary.workplaceNames.add(
          workplace.name
        );
      }

      const existing =
        summary.attendanceByDate
          .get(record.work_date);

      /*
        같은 날짜에 중복 기록이 있다면
        근무시간이 긴 기록을 사용합니다.
      */
      if (!existing) {
        summary.attendanceByDate
          .set(
            record.work_date,
            record
          );

        return;
      }

      const existingMinutes =
        calculateWorkMinutes(
          existing.check_in_time,
          existing.check_out_time
        );

      const newMinutes =
        calculateWorkMinutes(
          record.check_in_time,
          record.check_out_time
        );

      if (
        newMinutes >
        existingMinutes
      ) {
        summary.attendanceByDate
          .set(
            record.work_date,
            record
          );
      }
    }
  );

  leaveRecords.forEach(
    (leave) => {
      const summary =
        getSummary(
          leave.user_id
        );

      summary.leaveDates.add(
        leave.note_date
      );
    }
  );

  summaryMap.forEach(
    (summary) => {
      const records = [
        ...summary
          .attendanceByDate
          .values(),
      ];

      summary.attendanceDays =
        records.length;

      summary.lateCount =
        records.filter(
          (record) =>
            isLateStatus(
              record.status
            )
        ).length;

      summary.totalWorkMinutes =
        records.reduce(
          (
            total,
            record
          ) =>
            total +
            calculateWorkMinutes(
              record.check_in_time,
              record.check_out_time
            ),
          0
        );

      summary.leaveDays =
        summary.leaveDates.size;

      summary.lastAttendanceDate =
        records
          .map(
            (record) =>
              record.work_date
          )
          .sort()
          .at(-1) || null;

      summary.workplaceIds = [
        ...summary.workplaceIds,
      ];

      summary.workplaceNames = [
        ...summary.workplaceNames,
      ].sort(
        (a, b) =>
          a.localeCompare(
            b,
            "ko"
          )
      );
    }
  );

  employeeSummaries = [
    ...summaryMap.values(),
  ]
    .filter(
      (summary) =>
        summary.attendanceDays >
          0 ||
        summary.leaveDays > 0
    )
    .sort(
      (a, b) =>
        a.name.localeCompare(
          b.name,
          "ko"
        )
    );
}

/* =========================
  선택창
========================= */
function filterEmployeePrintOptions() {
  const keyword =
    employeePrintSearchInput
      ?.value
      .trim()
      .toLowerCase() ||
    "";

  const currentValue =
    employeePrintSelect.value;

  const matchedEmployees =
    employeeSummaries.filter(
      (summary) =>
        !keyword ||
        String(
          summary.name || ""
        )
          .toLowerCase()
          .includes(keyword)
    );

  employeePrintSelect.innerHTML = `
    <option value="">
      ${
        matchedEmployees.length
          ? "직원을 선택하세요"
          : "검색 결과가 없습니다"
      }
    </option>

    ${matchedEmployees
      .map(
        (summary) => `
          <option
            value="${escapeHtml(
              summary.userId
            )}"
          >
            ${escapeHtml(
              summary.name
            )}
            ·
            ${escapeHtml(
              summary.department
            )}
          </option>
        `
      )
      .join("")}
  `;

  const valueExists = [
    ...employeePrintSelect.options,
  ].some(
    (option) =>
      option.value ===
      currentValue
  );

  if (valueExists) {
    employeePrintSelect.value =
      currentValue;
  }
}

function renderSelectOptions() {
  const workplaceOptions =
    workplaces
      .map(
        (workplace) => `
          <option
            value="${escapeHtml(
              workplace.id
            )}"
          >
            ${escapeHtml(
              workplace.name
            )}
          </option>
        `
      )
      .join("");

  monthlyWorkplaceFilter.innerHTML = `
    <option value="all">
      전체 근무지
    </option>

    ${workplaceOptions}
  `;

  workplacePrintSelect.innerHTML = `
    <option value="">
      현장을 선택하세요
    </option>

    ${workplaceOptions}
  `;

  filterEmployeePrintOptions();
}

/* =========================
  통계
========================= */

function updateSummary(
  summaries
) {
  const attendanceEmployees =
    summaries.filter(
      (summary) =>
        summary.attendanceDays > 0
    );

  const leaveEmployees =
    summaries.filter(
      (summary) =>
        summary.leaveDays > 0
    );

  const attendanceCount =
    attendanceEmployees.reduce(
      (
        total,
        summary
      ) =>
        total +
        summary.attendanceDays,
      0
    );

  const lateCount =
    attendanceEmployees.reduce(
      (
        total,
        summary
      ) =>
        total +
        summary.lateCount,
      0
    );

  const leaveDayCount =
    leaveEmployees.reduce(
      (
        total,
        summary
      ) =>
        total +
        summary.leaveDays,
      0
    );

  summaryEmployeeCount.textContent =
    attendanceEmployees.length;

  summaryAttendanceCount.textContent =
    attendanceCount;

  summaryLateCount.textContent =
    lateCount;

  summaryLeaveEmployeeCount.textContent =
    leaveEmployees.length;

  summaryLeaveDayCount.textContent =
    leaveDayCount;

  attendanceEmployeeBadge.textContent =
    attendanceEmployees.length;

  leaveEmployeeBadge.textContent =
    leaveEmployees.length;
}

/* =========================
  표 출력
========================= */

function renderEmployeeTable() {
  if (
    !filteredSummaries.length
  ) {
    monthlyEmployeeTableBody
      .innerHTML = `
        <tr>
          <td
            colspan="9"
            class="empty-table-cell"
          >
            선택한 조건에 해당하는 직원이 없습니다.
          </td>
        </tr>
      `;

    monthlyResultCount.textContent =
      "0명";

    return;
  }

  monthlyResultCount.textContent =
    `${filteredSummaries.length}명`;

  monthlyEmployeeTableBody
    .innerHTML =
      filteredSummaries
        .map((summary) => {
          const workplaceHtml =
            summary
              .workplaceNames
              .length
              ? summary
                  .workplaceNames
                  .map(
                    (name) => `
                      <span class="monthly-workplace-chip">
                        ${escapeHtml(
                          name
                        )}
                      </span>
                    `
                  )
                  .join("")
              : `
                <span class="monthly-workplace-chip">
                  미배정
                </span>
              `;

          return `
            <tr>
              <td>
                <div class="monthly-employee-name">
                  <span class="monthly-employee-avatar">
                    ${escapeHtml(
                      summary.name
                        .slice(0, 1)
                    )}
                  </span>

                  <strong>
                    ${escapeHtml(
                      summary.name
                    )}
                  </strong>
                </div>
              </td>

              <td>
                ${escapeHtml(
                  summary.department
                )}
              </td>

              <td>
                <div class="monthly-workplace-list">
                  ${workplaceHtml}
                </div>
              </td>

              <td>
                <strong>
                  ${summary.attendanceDays}일
                </strong>
              </td>

              <td>
                ${
                  summary.lateCount
                    ? `
                      <strong class="status-late-text">
                        ${summary.lateCount}회
                      </strong>
                    `
                    : "0회"
                }
              </td>

              <td>
                <span class="monthly-leave-count">
                  ${summary.leaveDays}일
                </span>
              </td>

              <td>
                ${escapeHtml(
                  formatWorkMinutes(
                    summary.totalWorkMinutes
                  )
                )}
              </td>

              <td>
                ${escapeHtml(
                  formatDate(
                    summary
                      .lastAttendanceDate
                  )
                )}
              </td>

              <td>
                <div class="monthly-table-actions">
                  <a
                    href="admin-employee-detail.html?id=${encodeURIComponent(
                      summary.userId
                    )}"
                  >
                    상세
                  </a>

                  <button
                    type="button"
                    class="monthly-personal-print"
                    data-employee-print-id="${escapeHtml(
                      summary.userId
                    )}"
                  >
                    출력
                  </button>
                </div>
              </td>
            </tr>
          `;
        })
        .join("");

monthlyEmployeeTableBody
  .querySelectorAll(
    "[data-employee-print-id]"
  )
  .forEach((button) => {
    button.addEventListener(
      "click",
      async () => {
        const userId =
          button.dataset
            .employeePrintId;

        employeePrintSelect.value =
          userId;

        button.disabled = true;
        button.textContent =
          "준비 중...";

        try {
          await printEmployeeMonthlyAttendance(
            userId
          );
        } finally {
          button.disabled = false;
          button.textContent =
            "출력";
        }
      }
    );
  });
}

/* =========================
  필터
========================= */

function applyFilters() {
  const workplaceId =
    monthlyWorkplaceFilter
      .value || "all";

  const keyword =
    monthlySearchInput.value
      .trim()
      .toLowerCase();

  const baseFiltered =
    employeeSummaries.filter(
      (summary) => {
        const workplaceMatched =
          workplaceId === "all" ||
          summary.workplaceIds
            .includes(
              String(workplaceId)
            );

        const keywordTarget = [
          summary.name,
          summary.department,
          ...summary.workplaceNames,
        ]
          .join(" ")
          .toLowerCase();

        const keywordMatched =
          !keyword ||
          keywordTarget.includes(
            keyword
          );

        return (
          workplaceMatched &&
          keywordMatched
        );
      }
    );

  updateSummary(
    baseFiltered
  );

  filteredSummaries =
    baseFiltered.filter(
      (summary) =>
        currentView ===
        "leave"
          ? summary.leaveDays > 0
          : summary.attendanceDays >
            0
    );

  monthlyViewTabs.forEach(
    (tab) => {
      tab.classList.toggle(
        "active",
        tab.dataset.monthlyView ===
          currentView
      );
    }
  );

  if (
    currentView === "leave"
  ) {
    monthlyEmployeeTableTitle
      .textContent =
        "연차 사용자";

    monthlyEmployeeTableDescription
      .textContent =
        "선택한 달에 연차를 사용한 직원과 사용 일수를 표시합니다.";
  } else {
    monthlyEmployeeTableTitle
      .textContent =
        "이번 달 출근 직원";

    monthlyEmployeeTableDescription
      .textContent =
        "선택한 달에 실제 출근시간이 기록된 직원만 표시됩니다.";
  }

  renderEmployeeTable();
}

/* =========================
  CSV 다운로드
========================= */

function escapeCsv(value) {
  return `"${String(
    value ?? ""
  ).replaceAll(
    '"',
    '""'
  )}"`;
}

function downloadMonthlyCsv() {
  if (!filteredSummaries.length) {
    alert(
      "다운로드할 직원 목록이 없습니다."
    );

    return;
  }

  const rows = [
    [
      "직원명",
      "소속",
      "근무지",
      "출근일수",
      "지각",
      "연차",
      "총 근무시간",
      "최근 출근일",
    ],

    ...filteredSummaries.map(
      (summary) => [
        summary.name,
        summary.department,
        summary
          .workplaceNames
          .join(", ") ||
          "미배정",
        `${summary.attendanceDays}일`,
        `${summary.lateCount}회`,
        `${summary.leaveDays}일`,
        formatWorkMinutes(
          summary.totalWorkMinutes
        ),
        summary.lastAttendanceDate ||
          "",
      ]
    ),
  ];

  const csv = rows
    .map((row) =>
      row
        .map(escapeCsv)
        .join(",")
    )
    .join("\n");

  const blob = new Blob(
    [
      "\uFEFF",
      csv,
    ],
    {
      type:
        "text/csv;charset=utf-8",
    }
  );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;

  link.download =
    `월간_직원목록_${monthFilter.value}.csv`;

  document.body.appendChild(
    link
  );

  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

/* =========================
  데이터 새로고침
========================= */

async function loadMonthlyPage() {
  monthlyEmployeeTableBody
    .innerHTML = `
      <tr>
        <td
          colspan="9"
          class="empty-table-cell"
        >
          월간 출근 정보를 불러오는 중입니다.
        </td>
      </tr>
    `;

  try {
    await fetchMonthlyData();

    buildEmployeeSummaries();

    renderSelectOptions();

    applyFilters();
  } catch (error) {
    console.error(
      "월간 출근부 조회 실패:",
      error
    );

    monthlyEmployeeTableBody
      .innerHTML = `
        <tr>
          <td
            colspan="9"
            class="empty-table-cell"
          >
            월간 출근 정보를 불러오지 못했습니다.
            <br>
            ${
              escapeHtml(
                error.message ||
                ""
              )
            }
          </td>
        </tr>
      `;
  }
}

/* =========================
  출력 공통 함수
========================= */

function getSelectedMonthInfo() {
  const [
    year,
    month,
  ] = monthFilter.value
    .split("-")
    .map(Number);

  return {
    year,
    month,

    daysInMonth:
      new Date(
        year,
        month,
        0
      ).getDate(),

    startDate:
      `${year}-${String(
        month
      ).padStart(2, "0")}-01`,

    endDate:
      getMonthRange(
        monthFilter.value
      ).endDate,
  };
}

function createDateKey(
  year,
  month,
  day
) {
  return [
    year,

    String(month).padStart(
      2,
      "0"
    ),

    String(day).padStart(
      2,
      "0"
    ),
  ].join("-");
}

function getKoreanDayOfWeek(
  dateKey
) {
  const date = new Date(
    `${dateKey}T00:00:00`
  );

  return [
    "일",
    "월",
    "화",
    "수",
    "목",
    "금",
    "토",
  ][date.getDay()];
}

function formatTimeOnly(
  value
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date.toLocaleTimeString(
    "ko-KR",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  );
}

function getAttendanceStatusText(
  record
) {
  if (!record) {
    return "";
  }

  if (
    record.status === "late" ||
    record.status === "지각"
  ) {
    return "지각";
  }

  if (
    record.status === "absent" ||
    record.status === "미출근"
  ) {
    return "미출근";
  }

  if (
    record.status ===
      "location_error" ||
    record.status ===
      "위치오류"
  ) {
    return "위치오류";
  }

  if (
    record.check_in_time &&
    record.check_out_time
  ) {
    return "근무완료";
  }

  if (record.check_in_time) {
    return "근무중";
  }

  return "";
}

function openPrintWindow(
  title,
  content,
  pageStyle = ""
) {
  const oldPrintFrame =
    document.getElementById(
      "attendancePrintFrame"
    );

  oldPrintFrame?.remove();

  const printFrame =
    document.createElement(
      "iframe"
    );

  printFrame.id =
    "attendancePrintFrame";

  printFrame.title =
    "출근부 인쇄";

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
            margin: 7mm;
            ${pageStyle}
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

            border-collapse:
              collapse;

            table-layout: fixed;
          }

          th,
          td {
            border:
              1px solid #666666;

            text-align: center;
            vertical-align: middle;
          }

          th {
            background: #eeeeee;

            font-weight: 700;

            print-color-adjust:
              exact;

            -webkit-print-color-adjust:
              exact;
          }

          .weekend {
            background: #f8f8f8;

            print-color-adjust:
              exact;

            -webkit-print-color-adjust:
              exact;
          }

          .annual-leave-cell {
            background: #fff4cc;
            color: #8a5a00;
            font-weight: 700;

            print-color-adjust:
              exact;

            -webkit-print-color-adjust:
              exact;
          }

          .late-cell {
            background: #fee2e2;
            color: #b91c1c;
            font-weight: 700;

            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .print-legend {
            display: flex;
            justify-content: flex-end;
            gap: 12px;

            margin-top: 3mm;

            font-size: 8pt;
          }

          .print-signature {
            margin-top: 5mm;

            text-align: right;
            font-size: 9pt;
          }

          ${content.styles || ""}
        </style>
      </head>

      <body>
        ${content.html}
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

/* =========================
  직원별 월간 출력
========================= */

async function printEmployeeMonthlyAttendance(
  userId
) {
  const employee =
    employees.find(
      (item) =>
        String(item.id) ===
        String(userId)
    );

  if (!employee) {
    alert(
      "직원 정보를 찾지 못했습니다."
    );

    return;
  }

  const {
    year,
    month,
    daysInMonth,
    startDate,
    endDate,
  } = getSelectedMonthInfo();

  const {
    data: noteData,
    error,
  } = await supabase
    .from(
      "employee_daily_notes"
    )
    .select(`
      note_date,
      day_type
    `)
    .eq(
      "user_id",
      userId
    )
    .gte(
      "note_date",
      startDate
    )
    .lt(
      "note_date",
      endDate
    );

  if (error) {
    console.error(
      "직원 연차 조회 실패:",
      error
    );

    alert(
      "직원 출근부 정보를 불러오지 못했습니다."
    );

    return;
  }

  const annualLeaveDates =
    new Set(
      (noteData || [])
        .filter(
          (note) =>
            note.day_type ===
            "annual_leave"
        )
        .map(
          (note) =>
            note.note_date
        )
    );

  const attendanceMap =
    new Map();

  attendanceRecords
    .filter(
      (record) =>
        String(
          record.user_id
        ) ===
        String(userId)
    )
    .forEach((record) => {
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
    });

  const workplaceMap =
    new Map(
      workplaces.map(
        (workplace) => [
          String(
            workplace.id
          ),
          workplace.name,
        ]
      )
    );

  const assignedNames = [
    ...new Set(
      workplaceAssignments
        .filter(
          (assignment) =>
            String(
              assignment.user_id
            ) ===
            String(userId)
        )
        .map(
          (assignment) =>
            workplaceMap.get(
              String(
                assignment
                  .workplace_id
              )
            )
        )
        .filter(Boolean)
    ),
  ];

  const dayCells = [];
  const timeCells = [];

  for (
    let day = 1;
    day <= daysInMonth;
    day += 1
  ) {
    const dateKey =
      createDateKey(
        year,
        month,
        day
      );

    const record =
      attendanceMap.get(
        dateKey
      );

    const isAnnualLeave =
      annualLeaveDates.has(
        dateKey
      );

    const annualLeaveClass =
      isAnnualLeave
        ? "annual-leave-day"
        : "";

    dayCells.push(`
      <td class="${annualLeaveClass}">
        ${day}
      </td>
    `);

    let timeContent = "";

    if (isAnnualLeave) {
      timeContent = `
        <strong>연</strong>
      `;
    } else {
      const checkIn =
        formatTimeOnly(
          record?.check_in_time
        );

      const checkOut =
        formatTimeOnly(
          record?.check_out_time
        );

      timeContent = `
        <span>
          ${escapeHtml(checkIn)}
        </span>

        <span>
          ${escapeHtml(checkOut)}
        </span>
      `;
    }

    timeCells.push(`
      <td class="${annualLeaveClass}">
        ${timeContent}
      </td>
    `);
  }

  const workplaceNames =
    assignedNames.join(", ") ||
    "미배정";

  const title =
    "월별 출퇴근표";

  const periodStart =
    createDateKey(
      year,
      month,
      1
    );

  const periodEnd =
    createDateKey(
      year,
      month,
      daysInMonth
    );

  openPrintWindow(
    title,
    {
      styles: `
        .monthly-report {
          width: 100%;
          color: #000000;
        }

        .monthly-report-title {
          margin: 0 0 8px;
          color: #000000;
          font-size: 14px;
          font-weight: 700;
          line-height: 1.2;
          text-align: center;
        }

        .monthly-report-period {
          margin: 0 0 3px;
          color: #000000;
          font-size: 8px;
          line-height: 1.2;
          text-align: right;
        }

        .monthly-report-table {
          width: 100%;
          margin: 0;
          border: 1px solid #000000;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .monthly-report-table td {
          padding: 0;
          border: 1px solid #000000;
          background: #ffffff;
          color: #000000;
          text-align: center;
          vertical-align: middle;
        }

        .employee-block {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .employee-info-row td {
          height: 22px;
          padding: 0 8px;
          text-align: left;
        }

        .employee-info-content {
          display: flex;
          align-items: center;
          justify-content:
            space-between;
          gap: 24px;
          width: 100%;
          font-size: 8px;
          white-space: nowrap;
        }

        .employee-info-content span {
          flex: 1;
        }

        .employee-info-content
        span:nth-child(2) {
          text-align: center;
        }

        .employee-info-content
        span:nth-child(3) {
          text-align: right;
        }

        .employee-info-content strong {
          margin-left: 4px;
          font-size: 8px;
          font-weight: 700;
        }

        .employee-day-row td {
          height: 18px;
          font-size: 6px;
          font-weight: 700;
          line-height: 1;
        }

        .employee-time-row td {
          height: 32px;
          padding: 2px 0;
          font-size: 7px;
          line-height: 1.2;
        }

        .employee-time-row span {
          display: block;
          min-height: 10px;
          font-size: 7px;
          font-weight: 600;
          white-space: nowrap;
        }

        .employee-time-row strong {
          display: inline-block;
          font-size: 9px;
          font-weight: 800;
          line-height: 28px;
          white-space: nowrap;
        }

        .monthly-report-table
        .annual-leave-day {
          background: #fff2a8;
          color: #000000;

          print-color-adjust: exact;
          -webkit-print-color-adjust:
            exact;
        }
      `,

      html: `
        <main class="monthly-report">
          <h1 class="monthly-report-title">
            ${escapeHtml(title)}
          </h1>

          <p class="monthly-report-period">
            근무기간:
            ${escapeHtml(
              periodStart
            )}
            ~
            ${escapeHtml(
              periodEnd
            )}
          </p>

          <table class="monthly-report-table">
            <colgroup>
              ${Array.from(
                {
                  length:
                    daysInMonth,
                },
                () => "<col />"
              ).join("")}
            </colgroup>

            <tbody class="employee-block">
              <tr class="employee-info-row">
                <td colspan="${daysInMonth}">
                  <div class="employee-info-content">
                    <span>
                      이름:
                      <strong>
                        ${escapeHtml(
                          employee.name ||
                          "이름 없음"
                        )}
                      </strong>
                    </span>

                    <span>
                      현장:
                      <strong>
                        ${escapeHtml(
                          workplaceNames
                        )}
                      </strong>
                    </span>

                    <span>
                      소속:
                      <strong>
                        ${escapeHtml(
                          employee.department ||
                          "소속 미지정"
                        )}
                      </strong>
                    </span>
                  </div>
                </td>
              </tr>

              <tr class="employee-day-row">
                ${dayCells.join("")}
              </tr>

              <tr class="employee-time-row">
                ${timeCells.join("")}
              </tr>
            </tbody>
          </table>
        </main>
      `,
    },
    "size: 297mm 210mm;"
  );
}

/* =========================
  현장별 월간 출력
========================= */

function printWorkplaceMonthlyAttendance(
  workplaceId
) {
  const workplace =
    workplaces.find(
      (item) =>
        String(item.id) ===
        String(workplaceId)
    );

  if (!workplace) {
    alert(
      "현장 정보를 찾지 못했습니다."
    );

    return;
  }

  const {
    year,
    month,
    daysInMonth,
    startDate,
    endDate,
  } = getSelectedMonthInfo();

  const assignedUserIds =
    new Set(
      workplaceAssignments
        .filter(
          (assignment) => {
            if (
              String(
                assignment
                  .workplace_id
              ) !==
              String(workplaceId)
            ) {
              return false;
            }

            const startsBeforeEnd =
              !assignment
                .start_date ||
              assignment
                .start_date <
                endDate;

            const endsAfterStart =
              !assignment
                .end_date ||
              assignment
                .end_date >=
                startDate;

            return (
              startsBeforeEnd &&
              endsAfterStart
            );
          }
        )
        .map(
          (assignment) =>
            String(
              assignment.user_id
            )
        )
    );

  attendanceRecords
    .filter(
      (record) =>
        String(
          record.workplace_id
        ) ===
        String(workplaceId)
    )
    .forEach(
      (record) => {
        assignedUserIds.add(
          String(
            record.user_id
          )
        );
      }
    );

  const targetEmployees =
    employees
      .filter((employee) =>
        assignedUserIds.has(
          String(employee.id)
        )
      )
      .sort(
        (a, b) =>
          a.name.localeCompare(
            b.name,
            "ko"
          )
      );

  if (!targetEmployees.length) {
    alert(
      "선택한 현장에 출력할 직원이 없습니다."
    );

    return;
  }

  const attendanceMap =
    new Map();

  attendanceRecords
    .filter(
      (record) =>
        String(
          record.workplace_id
        ) ===
        String(workplaceId)
    )
    .forEach((record) => {
      const key =
        `${record.user_id}_${record.work_date}`;

      const existing =
        attendanceMap.get(key);

      if (
        !existing ||
        (
          record.check_in_time &&
          !existing.check_in_time
        )
      ) {
        attendanceMap.set(
          key,
          record
        );
      }
    });

  const leaveSet =
    new Set(
      leaveRecords.map(
        (leave) =>
          `${leave.user_id}_${leave.note_date}`
      )
    );

  const employeeBlocks =
    targetEmployees
      .map((employee) => {
        const dayCells = [];
        const timeCells = [];

        for (
          let day = 1;
          day <= daysInMonth;
          day += 1
        ) {
          const dateKey =
            createDateKey(
              year,
              month,
              day
            );

          const key =
            `${employee.id}_${dateKey}`;

          const record =
            attendanceMap.get(key);

          const isLeave =
            leaveSet.has(key);

          const leaveClass =
            isLeave
              ? "annual-leave-day"
              : "";

          dayCells.push(`
            <td class="${leaveClass}">
              ${day}
            </td>
          `);

          let timeContent = "";

          if (isLeave) {
            timeContent = `
              <strong>연</strong>
            `;
          } else {
            const checkIn =
              formatTimeOnly(
                record?.check_in_time
              );

            const checkOut =
              formatTimeOnly(
                record?.check_out_time
              );

            timeContent = `
              <span>
                ${escapeHtml(checkIn)}
              </span>

              <span>
                ${escapeHtml(checkOut)}
              </span>
            `;
          }

          timeCells.push(`
            <td class="${leaveClass}">
              ${timeContent}
            </td>
          `);
        }

        return `
          <tbody class="employee-block">
            <tr class="employee-info-row">
              <td colspan="${daysInMonth}">
                <div class="employee-info-content">
                  <span>
                    이름:
                    <strong>
                      ${escapeHtml(
                        employee.name ||
                        "이름 없음"
                      )}
                    </strong>
                  </span>

                  <span>
                    현장:
                    <strong>
                      ${escapeHtml(
                        workplace.name
                      )}
                    </strong>
                  </span>

                  <span>
                    소속:
                    <strong>
                      ${escapeHtml(
                        employee.department ||
                        "소속 미지정"
                      )}
                    </strong>
                  </span>
                </div>
              </td>
            </tr>

            <tr class="employee-day-row">
              ${dayCells.join("")}
            </tr>

            <tr class="employee-time-row">
              ${timeCells.join("")}
            </tr>
          </tbody>
        `;
      })
      .join("");

  const title =
    "월별 출퇴근표";

  const periodStart =
    createDateKey(
      year,
      month,
      1
    );

  const periodEnd =
    createDateKey(
      year,
      month,
      daysInMonth
    );

  openPrintWindow(
    title,
    {
      styles: `
        .monthly-report {
          width: 100%;
          color: #000000;
        }

        .monthly-report-title {
          margin: 0 0 8px;
          color: #000000;
          font-size: 14px;
          font-weight: 700;
          line-height: 1.2;
          text-align: center;
        }

        .monthly-report-period {
          margin: 0 0 3px;
          color: #000000;
          font-size: 8px;
          line-height: 1.2;
          text-align: right;
        }

        .monthly-report-table {
          width: 100%;
          margin: 0;
          border: 1px solid #000000;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .monthly-report-table td {
          padding: 0;
          border: 1px solid #000000;
          background: #ffffff;
          color: #000000;
          text-align: center;
          vertical-align: middle;
        }

        .employee-block {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .employee-info-row td {
          height: 22px;
          padding: 0 8px;
          text-align: left;
        }

        .employee-info-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          width: 100%;
          font-size: 8px;
          white-space: nowrap;
        }

        .employee-info-content span {
          flex: 1;
        }

        .employee-info-content span:nth-child(2) {
          text-align: center;
        }

        .employee-info-content span:nth-child(3) {
          text-align: right;
        }

        .employee-info-content strong {
          margin-left: 4px;
          font-size: 8px;
          font-weight: 700;
        }

        .employee-day-row td {
          height: 18px;
          font-size: 6px;
          font-weight: 700;
          line-height: 1;
        }

        .employee-time-row td {
          height: 32px;
          padding: 2px 0;
          font-size: 7px;
          line-height: 1.2;
        }

        .employee-time-row span {
          display: block;
          min-height: 10px;
          font-size: 7px;
          font-weight: 600;
          white-space: nowrap;
        }

        .employee-time-row strong {
          display: inline-block;
          font-size: 9px;
          font-weight: 800;
          line-height: 28px;
          white-space: nowrap;
        }

        .monthly-report-table
        .annual-leave-day {
          background: #fff2a8;
          color: #000000;

          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }

        @media print {
          .employee-block {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `,

      html: `
        <main class="monthly-report">
          <h1 class="monthly-report-title">
            ${escapeHtml(title)}
          </h1>

          <p class="monthly-report-period">
            근무기간:
            ${escapeHtml(periodStart)}
            ~
            ${escapeHtml(periodEnd)}
          </p>

          <table class="monthly-report-table">
            <colgroup>
              ${Array.from(
                {
                  length:
                    daysInMonth,
                },
                () => "<col />"
              ).join("")}
            </colgroup>

            ${employeeBlocks}
          </table>
        </main>
      `,
    },
    "size: A4 landscape;"
  );
}

/* =========================
  이벤트
========================= */

function bindEvents() {
  monthFilter.addEventListener(
    "change",
    loadMonthlyPage
  );

  monthlyWorkplaceFilter
    .addEventListener(
      "change",
      applyFilters
    );

  monthlySearchInput
    .addEventListener(
      "input",
      applyFilters
    );

  monthlyViewTabs.forEach(
    (tab) => {
      tab.addEventListener(
        "click",
        () => {
          currentView =
            tab.dataset
              .monthlyView;

          applyFilters();
        }
      );
    }
  );

  monthlyDownloadBtn
    ?.addEventListener(
      "click",
      downloadMonthlyCsv
    );
  employeeMonthlyPrintBtn
    ?.addEventListener(
      "click",
      async () => {
        const userId =
          employeePrintSelect.value;

        if (!userId) {
          alert(
            "출력할 직원을 선택해주세요."
          );

          return;
        }

        employeeMonthlyPrintBtn
          .disabled = true;

        employeeMonthlyPrintBtn
          .textContent =
            "출력 준비 중...";

        try {
          await printEmployeeMonthlyAttendance(
            userId
          );
        } finally {
          employeeMonthlyPrintBtn
            .disabled = false;

          employeeMonthlyPrintBtn
            .textContent =
              "직원 출근부 출력";
        }
      }
    );

  employeePrintSearchInput
    ?.addEventListener(
      "input",
      () => {
        employeePrintSelect.value =
          "";

        filterEmployeePrintOptions();
      }
    );

  workplaceMonthlyPrintBtn
    ?.addEventListener(
      "click",
      () => {
        const workplaceId =
          workplacePrintSelect.value;

        if (!workplaceId) {
          alert(
            "출력할 현장을 선택해주세요."
          );

          return;
        }

        printWorkplaceMonthlyAttendance(
          workplaceId
        );
      }
    );
}

/* =========================
  초기 실행
========================= */

async function init() {
  monthFilter.value =
    getCurrentMonth();

  bindEvents();

  try {
    await fetchBaseData();

    renderSelectOptions();

    await loadMonthlyPage();
  } catch (error) {
    console.error(
      "월간 출근부 초기화 실패:",
      error
    );

    monthlyEmployeeTableBody
      .innerHTML = `
        <tr>
          <td
            colspan="9"
            class="empty-table-cell"
          >
            직원 또는 근무지 정보를 불러오지 못했습니다.
          </td>
        </tr>
      `;
  }
}

init();