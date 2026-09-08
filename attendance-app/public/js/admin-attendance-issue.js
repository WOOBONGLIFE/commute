/* =========================
  관리자 지각·미출근 관리
  Supabase 연동 버전
========================= */

import supabase from "./supabase.js";

const todayDate = document.getElementById("todayDate");

const issueLateCount = document.getElementById("issueLateCount");
const issueAbsentCount = document.getElementById("issueAbsentCount");
const issueLocationCount = document.getElementById("issueLocationCount");
const issueRepeatLateCount = document.getElementById("issueRepeatLateCount");

const lateTableBody = document.getElementById("lateTableBody");
const absentTableBody = document.getElementById("absentTableBody");
const repeatLateList = document.getElementById("repeatLateList");
const locationErrorList = document.getElementById("locationErrorList");

const reasonModal = document.getElementById("reasonModal");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalCancelBtn = document.getElementById("modalCancelBtn");
const reasonSaveBtn = document.getElementById("reasonSaveBtn");
const modalEmployeeName = document.getElementById("modalEmployeeName");
const modalEmployeeInfo = document.getElementById("modalEmployeeInfo");
const reasonSelect = document.getElementById("reasonSelect");
const reasonMemo = document.getElementById("reasonMemo");

let lateEmployees = [];
let absentEmployees = [];
let locationErrors = [];
let selectedLateIndex = null;

function getAttendanceIssueDate() {
  const sixHours =
    6 * 60 * 60 * 1000;

  const shiftedDate =
    new Date(
      Date.now() - sixHours
    );

  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Seoul",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      }
    );

  const parts =
    formatter.formatToParts(
      shiftedDate
    );

  const year =
    parts.find(
      (part) =>
        part.type === "year"
    )?.value;

  const month =
    parts.find(
      (part) =>
        part.type === "month"
    )?.value;

  const day =
    parts.find(
      (part) =>
        part.type === "day"
    )?.value;

  return `${year}-${month}-${day}`;
}

const todayStr =
  getAttendanceIssueDate();

function setTodayText() {
  if (!todayDate) {
    return;
  }

  const workDate =
    new Date(
      `${todayStr}T00:00:00+09:00`
    );

  const formattedDate =
    workDate.toLocaleDateString(
      "ko-KR",
      {
        timeZone:
          "Asia/Seoul",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",

        weekday:
          "long",
      }
    );

  todayDate.textContent =
    `${formattedDate} 지각, 미출근, 위치 오류 직원을 확인합니다.`;
}

function formatTime(timeString) {
  if (!timeString) return "—";

  const date = new Date(timeString);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShiftTime(
  timeString
) {
  if (!timeString) {
    return "미설정";
  }

  return String(timeString)
    .slice(0, 5);
}

function getMinutesLate(
  checkInTime,
  scheduledTime
) {
  if (
    !checkInTime ||
    !scheduledTime ||
    scheduledTime === "미설정"
  ) {
    return null;
  }

  const checkInDate =
    new Date(checkInTime);

  if (
    Number.isNaN(
      checkInDate.getTime()
    )
  ) {
    return null;
  }

  const [
    hour,
    minute,
  ] = scheduledTime
    .split(":")
    .map(Number);

  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return null;
  }

  const scheduledDate =
    new Date(checkInDate);

  scheduledDate.setHours(
    hour,
    minute,
    0,
    0
  );

  const diffMs =
    checkInDate -
    scheduledDate;

  const diffMinutes =
    Math.floor(
      diffMs /
      1000 /
      60
    );

  return Math.max(
    diffMinutes,
    0
  );
}

function getReasonBadgeClass(reason) {
  if (!reason || reason === "미확인") return "unchecked";
  if (reason === "기타 직접 입력") return "input";
  return "checked";
}

async function saveIssueAction({
  userId,
  attendanceId = null,
  issueType,
  actionStatus = null,
  reason = null,
  memo = null,
}) {
  const { error } =
    await supabase.rpc(
      "admin_save_attendance_issue_action",
      {
        p_user_id:
          userId,

        p_attendance_id:
          attendanceId,

        p_issue_date:
          todayStr,

        p_issue_type:
          issueType,

        p_action_status:
          actionStatus,

        p_reason:
          reason,

        p_memo:
          memo,
      }
    );

  if (error) {
    console.error(
      "처리 내용 저장 실패:",
      error
    );

    throw error;
  }
}

function updateStats() {
  if (issueLateCount) issueLateCount.textContent = lateEmployees.length;
  if (issueAbsentCount) issueAbsentCount.textContent = absentEmployees.length;
  if (issueLocationCount) issueLocationCount.textContent = locationErrors.length;

  const repeatLateCount = lateEmployees.filter(
    (employee) => employee.monthlyLateCount >= 3
  ).length;

  if (issueRepeatLateCount) {
    issueRepeatLateCount.textContent = repeatLateCount;
  }
}

async function fetchIssueData() {
  const [
    userResult,
    attendanceResult,
    leaveResult,
    assignmentResult,
    actionResult,
    shiftResult,
    locationResult,
  ] = await Promise.all([
    supabase
      .from("users")
      .select(
        `
          id,
          name,
          department,
          status,
          attendance_exempt
        `
      )
      .eq(
        "status",
        "active"
      )
      .eq(
        "attendance_exempt",
        false
      ),

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
        users (
          name,
          department,
          attendance_exempt
        ),
        workplaces (
          name
        )
      `)
      .eq("work_date", todayStr),

    supabase
      .from("employee_daily_notes")
      .select(
        "user_id, note_date, day_type"
      )
      .eq("note_date", todayStr)
      .eq( "day_type", "annual_leave" ),

    supabase
      .from("workplace_users")
      .select(`
        user_id,
        workplace_id,
        work_shift_id,
        start_date,
        end_date,
        workplaces (
          name,
          is_active
        )
      `),

    supabase.rpc(
      "admin_get_attendance_issue_actions",
      {
        p_issue_date:
          todayStr,
      }
    ),

    supabase
      .from("work_shifts")
      .select(
        "id, start_time, is_active"
      )
      .eq(
        "is_active",
        true
      ),

    supabase.rpc(
      "admin_get_attendance_location_errors",
      {
        p_issue_date:
          todayStr,
      }
    ),
  ]);

  if (
    userResult.error ||
    attendanceResult.error ||
    leaveResult.error ||
    assignmentResult.error ||
    actionResult.error ||
    shiftResult.error ||
    locationResult.error
  ) {
    console.error(
      "지각·미출근 데이터 조회 실패:",
      userResult.error ||
      attendanceResult.error ||
      leaveResult.error ||
      assignmentResult.error ||
      actionResult.error ||
      shiftResult.error ||
      locationResult.error
    );

    lateEmployees = [];
    absentEmployees = [];
    locationErrors = [];

    return;
  }

  const allUsers =
    userResult.data || [];

  const attendanceData =
    (
      attendanceResult.data ||
      []
    ).filter(
      (attendance) =>
        attendance.users
          ?.attendance_exempt !==
        true
    );

  const shiftStartMap =
    new Map(
      (shiftResult.data || []).map(
        (shift) => [
          String(shift.id),

          formatShiftTime(
            shift.start_time
          ),
        ]
      )
    );

  const assignedShiftMap =
    new Map();

  const workplaceShiftMap =
    new Map();

  const assignedRegionMap =
    new Map();

  (
    assignmentResult.data || []
  )
    .filter((assignment) => {
      const workplaceActive =
        assignment.workplaces
          ?.is_active !== false;

      const started =
        !assignment.start_date ||
        assignment.start_date <=
          todayStr;

      const notEnded =
        !assignment.end_date ||
        assignment.end_date >=
          todayStr;

      return (
        workplaceActive &&
        started &&
        notEnded
      );
    })
    .forEach((assignment) => {
      const userId =
        String(
          assignment.user_id
        );

      const workplaceName =
        assignment.workplaces
          ?.name;

      if (!workplaceName) {
        return;
      }

      const shiftStart =
        shiftStartMap.get(
          String(
            assignment.work_shift_id
          )
        );

      if (shiftStart) {
        const workplaceKey =
          `${userId}:${String(
            assignment.workplace_id
          )}`;

        workplaceShiftMap.set(
          workplaceKey,
          shiftStart
        );

        if (
          !assignedShiftMap.has(
            userId
          )
        ) {
          assignedShiftMap.set(
            userId,
            []
          );
        }

        const shiftTimes =
          assignedShiftMap.get(
            userId
          );

        if (
          !shiftTimes.includes(
            shiftStart
          )
        ) {
          shiftTimes.push(
            shiftStart
          );
        }
      }

      if (
        !assignedRegionMap.has(
          userId
        )
      ) {
        assignedRegionMap.set(
          userId,
          []
        );
      }

      const regionNames =
        assignedRegionMap.get(
          userId
        );

      if (
        !regionNames.includes(
          workplaceName
        )
      ) {
        regionNames.push(
          workplaceName
        );
      }
    });

  const issueActionMap =
    new Map(
      (actionResult.data || []).map(
        (action) => [
          `${String(
            action.user_id
          )}:${action.issue_type}`,
          action,
        ]
      )
    );

  const annualLeaveUserIds =
    new Set(
      (leaveResult.data || []).map(
        (leave) =>
          String(leave.user_id)
      )
    );

  const checkedInUserIds =
    new Set(
      attendanceData.map(
        (attendance) =>
          String(
            attendance.user_id
          )
      )
    );

  lateEmployees =
    attendanceData
      .filter((item) => {
        const isLate =
          item.status === "late" ||
          item.status === "지각";

        const isAnnualLeave =
          annualLeaveUserIds.has(
            String(item.user_id)
          );

        return (
          isLate &&
          !isAnnualLeave
        );
      })
      .map((item) => {
        const scheduledTime =
          workplaceShiftMap.get(
            `${String(
              item.user_id
            )}:${String(
              item.workplace_id
            )}`
          ) ||
          "미설정";

        const lateMinutes =
          getMinutesLate(
            item.check_in_time,
            scheduledTime
          );

        const savedAction =
          issueActionMap.get(
            `${String(
              item.user_id
            )}:late`
          );

        return {
          attendanceId:
            item.id,

          userId:
            item.user_id,

          name:
            item.users?.name ||
            "이름 없음",

          department:
            item.users?.department ||
            "부서 없음",

          region:
            item.workplaces?.name ||
            "미배정",

          scheduledTime:
            scheduledTime,

          actualTime:
            formatTime(
              item.check_in_time
            ),

          lateMinutes:
            lateMinutes === null
              ? "계산 불가"
              : `${lateMinutes}분`,

          monthlyLateCount: 1,
          reason: savedAction?.reason || "미확인",
          memo: savedAction?.memo || "",
        };
      });

  absentEmployees =
    allUsers
      .filter((user) => {
        const userId =
          String(user.id);

        return (
          !checkedInUserIds.has(
            userId
          ) &&
          !annualLeaveUserIds.has(
            userId
          )
        );
      })
      .map((user) => ({
        userId:
          user.id,

        name:
          user.name ||
          "이름 없음",

        department:
          user.department ||
          "부서 없음",

        region:
          assignedRegionMap
            .get(
              String(user.id)
            )
            ?.join(", ") ||
          "미배정",

        scheduledTime:
          assignedShiftMap
            .get(
              String(user.id)
            )
            ?.join(", ") ||
          "미설정",

        phone: "—",
        status:
          issueActionMap.get(
            `${String(
              user.id
            )}:absent`
          )?.action_status ||
          "미확인",
      }));

const attendanceIncludedUserIds =
  new Set(
    allUsers.map(
      (user) =>
        String(user.id)
    )
  );

locationErrors =
  (
    locationResult.data || []
  )
    .filter(
      (item) =>
        attendanceIncludedUserIds
          .has(
            String(
              item.user_id
            )
          )
    )
    .map((item) => {
      const distance =
        item.distance_m === null ||
        item.distance_m === undefined
          ? null
          : Number(
              item.distance_m
            );

      const allowedRadius =
        item.allowed_radius === null ||
        item.allowed_radius === undefined
          ? null
          : Number(
              item.allowed_radius
            );

      let distanceText =
        "배정 위치를 계산할 수 없음";

      if (
        distance !== null &&
        allowedRadius !== null &&
        Number.isFinite(
          distance
        ) &&
        Number.isFinite(
          allowedRadius
        )
      ) {
        distanceText =
          `지정 위치와 약 ${Math.round(
            distance
          )}m 거리 · 허용 ${Math.round(
            allowedRadius
          )}m`;
      }

      return {
        attemptId:
          item.id,

        userId:
          item.user_id,

        name:
          item.employee_name ||
          "이름 없음",

        department:
          item.department ||
          "부서 없음",

        region:
          item.workplace_name ||
          "미배정",

        time:
          formatTime(
            item.attempted_at
          ),

        distance:
          distanceText,

        status:
          distance === null ||
          !Number.isFinite(
            distance
          )
            ? "배정 위치 없음"
            : (
                allowedRadius !== null &&
                Number.isFinite(
                  allowedRadius
                ) &&
                distance <=
                  allowedRadius
              )
              ? "요일·시간대 확인"
              : "범위 밖",
      };
    });

await applyMonthlyLateCount();
}

async function applyMonthlyLateCount() {
  const firstDayOfMonth =
    `${todayStr.slice(
      0,
      7
    )}-01`;

  const { data, error } = await supabase
    .from("attendance")
    .select("user_id")
    .gte("work_date", firstDayOfMonth)
    .lte("work_date", todayStr)
    .in("status", ["late", "지각"]);

  if (error || !data) {
    console.error("이번 달 지각 횟수 조회 실패:", error);
    return;
  }

  const countMap = new Map();

  data.forEach((item) => {
    countMap.set(item.user_id, (countMap.get(item.user_id) || 0) + 1);
  });

  lateEmployees = lateEmployees.map((employee) => ({
    ...employee,
    monthlyLateCount: countMap.get(employee.userId) || 1,
  }));
}

function renderLateTable() {
  if (!lateTableBody) return;

  if (lateEmployees.length === 0) {
    lateTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-row" style="text-align:center; padding:30px; color:#888;">
          오늘 지각 직원이 없습니다.
        </td>
      </tr>
    `;
    return;
  }

  lateTableBody.innerHTML = lateEmployees
    .map((employee, index) => {
      return `
        <tr>
          <td>
            <div class="employee">
              <div>
                <strong>${employee.name}</strong>
                <span style="display:block; font-size:11px; color:#888;">
                  ${employee.department}
                </span>
              </div>
            </div>
          </td>
          <td>${employee.region}</td>
          <td>${employee.scheduledTime}</td>
          <td>${employee.actualTime}</td>
          <td>${employee.lateMinutes}</td>
          <td>${employee.monthlyLateCount}회</td>
          <td>
            <span class="reason-badge ${getReasonBadgeClass(employee.reason)}">
              ${employee.reason}
            </span>
          </td>
          <td>
            <button class="table-action-btn" type="button" data-late-index="${index}">
              사유 기입
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  lateTableBody.querySelectorAll("[data-late-index]").forEach((button) => {
    button.addEventListener("click", () => {
      openReasonModal(Number(button.dataset.lateIndex));
    });
  });
}

function renderAbsentTable() {
  if (!absentTableBody) return;

  if (absentEmployees.length === 0) {
    absentTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-row" style="text-align:center; padding:30px; color:#888;">
          오늘 미출근 직원이 없습니다.
        </td>
      </tr>
    `;
    return;
  }

  absentTableBody.innerHTML = absentEmployees
    .map((employee, index) => {
      return `
        <tr>
          <td>
            <div class="employee">
              <div>
                <strong>${employee.name}</strong>
                <span style="display:block; font-size:11px; color:#888;">
                  ${employee.department}
                </span>
              </div>
            </div>
          </td>
          <td>${employee.region}</td>
          <td>${employee.scheduledTime}</td>
          <td>${employee.phone}</td>
          <td>
            <select data-absent-index="${index}">
              <option ${employee.status === "미확인" ? "selected" : ""}>미확인</option>
              <option ${employee.status === "연락 완료" ? "selected" : ""}>연락 완료</option>
              <option ${employee.status === "사유 확인" ? "selected" : ""}>사유 확인</option>
              <option ${employee.status === "무단 미출근" ? "selected" : ""}>무단 미출근</option>
              <option ${employee.status === "관리자 처리" ? "selected" : ""}>관리자 처리</option>
            </select>
          </td>
          <td>
            <a href="admin-employee-detail.html?id=${employee.userId}" class="table-action-btn" style="text-decoration:none;">
              상세
            </a>
          </td>
        </tr>
      `;
    })
    .join("");

    absentTableBody
    .querySelectorAll(
      "[data-absent-index]"
    )
    .forEach((select) => {
      select.addEventListener(
        "change",
        async () => {
          const index =
            Number(
              select.dataset
                .absentIndex
            );

          const employee =
            absentEmployees[index];

          if (!employee) {
            return;
          }

          const previousStatus =
            employee.status;

          const nextStatus =
            select.value;

          select.disabled = true;

          try {
            await saveIssueAction({
              userId:
                employee.userId,

              attendanceId:
                null,

              issueType:
                "absent",

              actionStatus:
                nextStatus,

              reason:
                null,

              memo:
                null,
            });

            employee.status =
              nextStatus;
          } catch (error) {
            select.value =
              previousStatus;

            window.alert(
              "미출근 처리 상태를 저장하지 못했습니다."
            );
          } finally {
            select.disabled =
              false;
          }
        }
      );
    });
}

function renderRepeatLateList() {
  if (!repeatLateList) return;

  const repeatLateEmployees = lateEmployees
    .filter((employee) => employee.monthlyLateCount >= 3)
    .sort((a, b) => b.monthlyLateCount - a.monthlyLateCount);

  if (repeatLateEmployees.length === 0) {
    repeatLateList.innerHTML = `
      <p style="padding:16px; color:#888; text-align:center;">
        반복 지각 직원이 없습니다.
      </p>
    `;
    return;
  }

  repeatLateList.innerHTML = repeatLateEmployees
    .map((employee) => {
      return `
        <div class="repeat-late-item">
          <div class="repeat-late-item-top">
            <strong>${employee.name}</strong>
            <span>${employee.monthlyLateCount}회</span>
          </div>
          <p>${employee.department} · ${employee.region} · 최근 사유: ${employee.reason}</p>
        </div>
      `;
    })
    .join("");
}

function renderLocationErrors() {
  if (!locationErrorList) return;

  if (locationErrors.length === 0) {
    locationErrorList.innerHTML = `
      <p style="padding:16px; color:#888; text-align:center;">
        위치 오류 출근 시도가 없습니다.
      </p>
    `;
    return;
  }

  locationErrorList.innerHTML = locationErrors
    .map((error) => {
      return `
        <div class="location-error-item">
          <div class="location-error-item-top">
            <strong>${error.name}</strong>
            <span>${error.status}</span>
          </div>
          <p>
            ${error.department}
            ·
            ${error.region}
            ·
            ${error.time}
            ·
            ${error.distance}
          </p>
        </div>
      `;
    })
    .join("");
}

function openReasonModal(index) {
  if (!reasonModal) return;

  selectedLateIndex = index;

  const employee = lateEmployees[index];
  if (!employee) return;

  modalEmployeeName.textContent = employee.name;
  modalEmployeeInfo.textContent = `${employee.region} · ${employee.lateMinutes} 지각`;
  reasonSelect.value = employee.reason;
  reasonMemo.value = employee.memo;

  reasonModal.classList.add("open");
}

function closeReasonModal() {
  selectedLateIndex = null;

  if (reasonModal) {
    reasonModal.classList.remove("open");
  }
}

async function saveReason() {
  if (
    selectedLateIndex === null
  ) {
    return;
  }

  const employee =
    lateEmployees[
      selectedLateIndex
    ];

  if (!employee) {
    return;
  }

  const nextReason =
    reasonSelect.value;

  const nextMemo =
    reasonMemo.value.trim();

  try {
    await saveIssueAction({
      userId:
        employee.userId,

      attendanceId:
        employee.attendanceId,

      issueType:
        "late",

      actionStatus:
        "사유 확인",

      reason:
        nextReason,

      memo:
        nextMemo,
    });

    employee.reason =
      nextReason;

    employee.memo =
      nextMemo;

    renderLateTable();
    renderRepeatLateList();
    closeReasonModal();
  } catch (error) {
    window.alert(
      "지각 사유를 저장하지 못했습니다."
    );
  }
}

function bindEvents() {
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", closeReasonModal);
  }

  if (modalCancelBtn) {
    modalCancelBtn.addEventListener("click", closeReasonModal);
  }

  if (reasonSaveBtn) {
    reasonSaveBtn.addEventListener("click", saveReason);
  }

  if (reasonModal) {
    reasonModal.addEventListener("click", (event) => {
      if (event.target === reasonModal) {
        closeReasonModal();
      }
    });
  }
}

function renderAll() {
  updateStats();
  renderLateTable();
  renderAbsentTable();
  renderRepeatLateList();
  renderLocationErrors();
}

async function initIssuePage() {
  setTodayText();
  bindEvents();

  await fetchIssueData();
  renderAll();
}

initIssuePage();