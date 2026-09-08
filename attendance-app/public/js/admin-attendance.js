/* =========================================================
   🔥 관리자 출퇴근관리 (Supabase 실시간 DB 연동 완료 버전)
========================================================= */
import supabase from "./supabase.js";

// DOM 요소 연결
const todayDateElement = document.getElementById("todayDate");
const attendanceTableBody = document.getElementById("attendanceTableBody");
const regionFilter = document.getElementById("regionFilter");
const statusFilter = document.getElementById("statusFilter");
const employeeSearchInput = document.getElementById("employeeSearchInput");
const lateList = document.querySelector(".late-list");
const excelDownloadBtn = document.getElementById("excelDownloadBtn");
const monthlyLateAlert = document.getElementById("monthlyLateAlert");
const monthlyLateAlertText = document.getElementById("monthlyLateAlertText");

// 상단 통계 숫자 DOM
const statCheckIn = document.getElementById("statCheckIn");
const statDone = document.getElementById("statDone");
const statWorking = document.getElementById("statWorking");
const statLate = document.getElementById("statLate");
const statAbsent = document.getElementById("statAbsent");
const statLocation = document.getElementById("statLocation");

// 오늘 날짜 문자열 (YYYY-MM-DD)
function getAttendanceWorkDate() {
  const sixHours =
    6 * 60 * 60 * 1000;

  /*
    오전 6시를 하루의 시작으로 봅니다.
    현재 시각에서 6시간을 빼고
    한국 날짜를 계산합니다.
  */
  const shiftedDate =
    new Date(
      Date.now() - sixHours
    );

  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
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
  getAttendanceWorkDate();
// 실제 DB에서 불러온 데이터를 보관할 배열 (필터링용)
let realAttendanceList = [];

function startAttendanceDateWatcher() {
  window.setInterval(
    () => {
      const currentWorkDate =
        getAttendanceWorkDate();

      if (
        currentWorkDate !== todayStr
      ) {
        window.location.reload();
      }
    },
    60 * 1000
  );
}
// 1. 상단 안내 날짜 설정
function setTodayDate() {
  if (!todayDateElement) return;
  const today = new Date();
  const formattedDate = today.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  todayDateElement.textContent = `${formattedDate} 출퇴근 현황과 반복 지각 직원을 실시간으로 확인합니다.`;
}

// 2. 시간 포맷 (예: 09:02)
function formatTime(timeString) {
  if (!timeString) return "—";
  const date = new Date(timeString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

// 3. 총 근무시간 계산
function calcWorkTime(checkIn, checkOut) {
  if (!checkIn || !checkOut) return "근무중";
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "—";

  const diffMs = end - start;
  if (diffMs <= 0) return "—";

  const totalMinutes = Math.floor(diffMs / 1000 / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}시간 ${minutes >= 10 ? minutes : "0" + minutes}분`;
}

// 4. 상태별 CSS 클래스 반환
function getStatusClass(statusType) {
  if (
    statusType === "late" ||
    statusType === "지각"
  ) {
    return "late";
  }

  if (
    statusType === "absent" ||
    statusType === "미출근"
  ) {
    return "absent";
  }

  if (
    statusType === "location_error" ||
    statusType === "위치오류"
  ) {
    return "location";
  }

  if (
    statusType === "annual_leave"
  ) {
    return "annual-leave";
  }

  return "normal";
}

// 5. 🔥 Supabase에서 오늘 출퇴근 데이터 및 전체 직원 조회
async function fetchTodayAttendance() {
  try {
    const [
      userResult,
      attendanceResult,
      leaveResult,
      assignmentResult,
    ] = await Promise.all([
      supabase
        .from("users")
        .select(
          "id, name, phone, department"
        )
        .eq(
          "status",
          "active"
        ),

      supabase
        .from("attendance")
        .select(`
          id,
          user_id,
          check_in_time,
          check_out_time,
          status,
          users (
            name,
            phone,
            department
          ),
          workplaces (
            name
          )
        `)
        .eq("work_date", todayStr),

      supabase
        .from("employee_daily_notes")
        .select(
          "user_id, note_date, content, day_type"
        )
        .eq("note_date", todayStr)
        .eq(
          "day_type",
          "annual_leave"
        ),

      supabase
        .from("workplace_users")
        .select(`
          user_id,
          workplace_id,
          start_date,
          end_date,
          workplaces (
            name,
            is_active
          )
        `),
    ]);

    if (userResult.error) {
      throw userResult.error;
    }

    if (attendanceResult.error) {
      throw attendanceResult.error;
    }

    if (leaveResult.error) {
      throw leaveResult.error;
    }

    if (assignmentResult.error) {
      throw assignmentResult.error;
    }

    const allUsers =
      userResult.data || [];

    const attendanceData =
      attendanceResult.data || [];
      
    const workplaceAssignments =
      assignmentResult.data || [];

    const assignedRegionMap =
      new Map();

    workplaceAssignments
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

        const names =
          assignedRegionMap.get(
            userId
          );

        if (
          !names.includes(
            workplaceName
          )
        ) {
          names.push(
            workplaceName
          );
        }
      });

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

    const formattedAttendance =
      attendanceData
        .filter(
          (item) =>
            !annualLeaveUserIds.has(
              String(item.user_id)
            )
        )
        .map((item) => {
          let statusText =
            "근무중";

          let statusType =
            "normal";

          if (
            item.status === "late" ||
            item.status === "지각"
          ) {
            statusText = "지각";
            statusType = "late";
          } else if (
            item.status ===
              "location_error" ||
            item.status ===
              "위치오류"
          ) {
            statusText =
              "위치오류";

            statusType =
              "location";
          } else if (
            item.check_out_time
          ) {
            statusText =
              "퇴근완료";
          }

          return {
            id: item.id,
            user_id:
              item.user_id,

            name:
              item.users?.name ||
              "이름 없음",

            phone:
              item.users?.phone || "",

            department:
              item.users?.department ||
              "부서 없음",

            region:
              item.workplaces?.name ||
              "미배정",

            checkIn:
              formatTime(
                item.check_in_time
              ),

            checkOut:
              formatTime(
                item.check_out_time
              ),

            workTime:
              calcWorkTime(
                item.check_in_time,
                item.check_out_time
              ),

            status:
              statusText,

            statusType,

            rawCheckIn:
              item.check_in_time,

            rawCheckOut:
              item.check_out_time,
          };
        });

    const annualLeaveUsers =
      allUsers
        .filter((user) =>
          annualLeaveUserIds.has(
            String(user.id)
          )
        )
        .map((user) => ({
          id:
            `leave-${user.id}`,

          user_id:
            user.id,

          name:
            user.name ||
            "이름 없음",

          phone:
            user.phone || "",

          department:
            user.department ||
            "부서 없음",

          region: "연차",

          checkIn: "—",
          checkOut: "—",
          workTime: "—",

          status: "연차",
          statusType:
            "annual_leave",

          rawCheckIn: null,
          rawCheckOut: null,
        }));

    const absentUsers =
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
          id:
            `absent-${user.id}`,

          user_id:
            user.id,

          name:
            user.name ||
            "이름 없음",

          phone:
            user.phone || "",

          department:
            user.department ||
            "부서 없음",

          region:
            assignedRegionMap
              .get(String(user.id))
              ?.join(", ") ||
            "미배정",

          checkIn: "—",
          checkOut: "—",
          workTime: "—",

          status: "미출근",
          statusType: "absent",

          rawCheckIn: null,
          rawCheckOut: null,
        }));

    return [
      ...formattedAttendance,
      ...annualLeaveUsers,
      ...absentUsers,
    ];
  } catch (error) {
    console.error(
      "출퇴근 조회 오류:",
      error
    );

    return [];
  }
}

// 6. 🔥 상단 통계 숫자 실시간 계산 및 반영
function updateSummaryStats(data) {
  let totalCheckIn = 0;
  let totalDone = 0;
  let totalWorking = 0;
  let totalLate = 0;
  let totalAbsent = 0;
  let totalLocation = 0;

  data.forEach((item) => {
    if (
      item.statusType ===
      "annual_leave"
    ) {
      return;
    }

    if (
      item.statusType ===
      "absent"
    ) {
      totalAbsent += 1;
      return;
    }

    totalCheckIn += 1;

    if (item.rawCheckOut) {
      totalDone += 1;
    } else {
      totalWorking += 1;
    }

    if (
      item.statusType ===
      "late"
    ) {
      totalLate += 1;
    }

    if (
      item.statusType ===
      "location"
    ) {
      totalLocation += 1;
    }
  });

  if (statCheckIn) {
    statCheckIn.textContent =
      totalCheckIn;
  }

  if (statDone) {
    statDone.textContent =
      totalDone;
  }

  if (statWorking) {
    statWorking.textContent =
      totalWorking;
  }

  if (statLate) {
    statLate.textContent =
      totalLate;
  }

  if (statAbsent) {
    statAbsent.textContent =
      totalAbsent;
  }

  if (statLocation) {
    statLocation.textContent =
      totalLocation;
  }
}

// 7. 출퇴근 테이블 화면 렌더링
function renderAttendanceTable(data) {
  if (!attendanceTableBody) return;

  if (!data || data.length === 0) {
    attendanceTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-row" style="text-align:center; padding:30px; color:#888;">
          조회된 출퇴근 기록이 없습니다.
        </tr>
      </tr>
    `;
    return;
  }

  attendanceTableBody.innerHTML = data
    .map((item) => {
      const firstName = item.name.slice(0, 1);
      const checkOutClass = item.checkOut === "—" ? "muted" : "";
      const workTimeClass = item.workTime === "—" ? "muted" : "";

      return `
        <tr>
          <td>
            <div class="employee">
              <span class="avatar">${firstName}</span>
              <div>
                <strong>${item.name}</strong>
                <span style="display:block; font-size:11px; color:#888;">${item.department}</span>
              </div>
            </div>
          </td>
          <td>${item.region}</td>
          <td>${item.checkIn}</td>
          <td class="${checkOutClass}">${item.checkOut}</td>
          <td class="${workTimeClass}">${item.workTime}</td>
          <td>
            <span class="status ${getStatusClass(item.statusType)}">
              ${item.status}
            </span>
          </td>
          <td>
            <a href="admin-employee-detail.html?id=${item.user_id}" class="table-action-btn" style="text-decoration:none; display:inline-block; text-align:center;">
              상세
            </a>
          </td>
        </tr>
      `;
    })
    .join("");
}

// 8. 🔥 이번 달 지각 3회 이상 상습 지각자 실시간 조회
async function loadMonthlyLateEmployees() {
  if (monthlyLateAlert) {
    monthlyLateAlert.hidden = true;
  }

  try {
    const today = new Date();

    const year = today.getFullYear();

    const month = String(
      today.getMonth() + 1
    ).padStart(2, "0");

    const firstDayOfMonth =
      `${year}-${month}-01`;

    const { data, error } =
      await supabase
        .from("attendance")
        .select(`
          user_id,
          work_date,
          users (
            name,
            department,
            attendance_exempt
          ),
          workplaces (
            name
          )
        `)
        .gte(
          "work_date",
          firstDayOfMonth
        )
        .lte(
          "work_date",
          todayStr
        )
        .in(
          "status",
          ["late", "지각"]
        );

    if (error) {
      throw error;
    }

    const employeeLateMap =
      new Map();

    (data || []).forEach((item) => {
      if (!item.user_id) {
        return;
      }

      if (
        !employeeLateMap.has(
          item.user_id
        )
      ) {
        employeeLateMap.set(
          item.user_id,
          {
            name:
              item.users?.name ||
              "직원",

            department:
              item.users?.department ||
              "부서 없음",

            workplace:
              item.workplaces?.name ||
              "미배정",

            dates: new Set(),
          }
        );
      }

      employeeLateMap
        .get(item.user_id)
        .dates.add(item.work_date);
    });

    const chronicLates = [
      ...employeeLateMap.values(),
    ]
      .map((employee) => ({
        ...employee,
        count: employee.dates.size,
      }))
      .filter(
        (employee) =>
          employee.count >= 3
      )
      .sort(
        (a, b) =>
          b.count - a.count
      );

    if (!chronicLates.length) {
      if (lateList) {
        lateList.innerHTML = `
          <p style="padding:16px; color:#888; text-align:center;">
            지각 3회 이상 직원이 없습니다.
          </p>
        `;
      }

      return;
    }

    if (monthlyLateAlert) {
      monthlyLateAlert.hidden = false;
    }

    if (monthlyLateAlertText) {
      monthlyLateAlertText.textContent =
        `이번 달 지각 3회 이상 직원 ${chronicLates.length}명이 있습니다.`;
    }

    if (lateList) {
      lateList.innerHTML =
        chronicLates
          .map((employee) => `
            <div class="late-item">
              <div>
                <strong>
                  ${employee.name}
                </strong>

                <p>
                  ${employee.department}
                  ·
                  ${employee.workplace}
                </p>
              </div>

              <span style="background:#fee2e2; color:#dc2626; font-weight:bold; padding:4px 8px; border-radius:8px;">
                ${employee.count}회
              </span>
            </div>
          `)
          .join("");
    }
  } catch (error) {
    console.error(
      "지각자 조회 에러:",
      error
    );

    if (monthlyLateAlert) {
      monthlyLateAlert.hidden = true;
    }

    if (lateList) {
      lateList.innerHTML = `
        <p style="padding:10px; color:#888;">
          지각 정보를 불러오지 못했습니다.
        </p>
      `;
    }
  }
}

// 9. 지역, 상태, 이름 검색 필터링 기능
function renderRegionFilterOptions() {
  if (!regionFilter) {
    return;
  }

  const currentValue =
    regionFilter.value ||
    "전체 지역";


  const excludedValues = new Set([
    "",
    "미배정",
    "미출근",
    "연차",
  ]);

  const regionNames = [
    ...new Set(
      realAttendanceList
        .map((item) =>
          String(
            item.region || ""
          ).trim()
        )
        .filter(
          (regionName) =>
            !excludedValues.has(
              regionName
            )
        )
    ),
  ].sort((a, b) =>
    a.localeCompare(
      b,
      "ko"
    )
  );

  regionFilter.innerHTML = `
    <option value="전체 지역">
      전체 지역
    </option>

    <option value="미배정">
      미배정
    </option>

    ${regionNames
      .map(
        (regionName) => `
          <option value="${regionName}">
            ${regionName}
          </option>
        `
      )
      .join("")}
  `;

  const valueExists = [
    ...regionFilter.options,
  ].some(
    (option) =>
      option.value === currentValue
  );

  regionFilter.value =
    valueExists
      ? currentValue
      : "전체 지역";
}

function filterAttendanceData() {
  const selectedRegion = regionFilter ? regionFilter.value : "전체 지역";
  const selectedStatus = statusFilter ? statusFilter.value : "전체 상태";
  const searchKeyword = employeeSearchInput
    ? employeeSearchInput.value.trim()
    : "";

  const filteredData = realAttendanceList.filter((item) => {
    const isRegionMatched =
      selectedRegion === "전체 지역" || item.region === selectedRegion;

    const isStatusMatched =
      selectedStatus === "전체 상태" || item.status === selectedStatus;

    const normalizedKeyword =
      searchKeyword
        .toLowerCase()
        .replace(/[^0-9a-z가-힣]/g, "");

    const normalizedName =
      String(item.name || "")
        .toLowerCase()
        .replace(/[^0-9a-z가-힣]/g, "");

    const normalizedPhone =
      String(item.phone || "")
        .replace(/[^0-9]/g, "");

    const isSearchMatched =
      !normalizedKeyword ||
      normalizedName.includes(
        normalizedKeyword
      ) ||
      normalizedPhone.includes(
        normalizedKeyword
      );

    return isRegionMatched && isStatusMatched && isSearchMatched;
  });

  updateSummaryStats(filteredData);
  renderAttendanceTable(filteredData);
}

// 10. 엑셀 다운로드 실제 구현
function handleExcelDownload() {
  if (!realAttendanceList || realAttendanceList.length === 0) {
    alert("다운로드할 데이터가 없습니다.");
    return;
  }

  // 엑셀로 변환할 데이터 가공 (한글 헤더)
  const excelData = realAttendanceList.map((item, index) => ({
    "No": index + 1,
    "직원명": item.name,
    "부서": item.department,
    "배정지역": item.region,
    "출근시간": item.checkIn,
    "퇴근시간": item.checkOut,
    "총 근무시간": item.workTime,
    "출근상태": item.status
  }));

  // 워크시트 및 워크북 생성
  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "오늘_출퇴근현황");

  // 열 너비 자동 맞춤 설정
  worksheet["!cols"] = [
    { wch: 5 },  { wch: 10 }, { wch: 12 }, { wch: 15 }, 
    { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 10 }
  ];

  // 엑셀 파일 다운로드 실행
  XLSX.writeFile(workbook, `출퇴근현황_${todayStr}.xlsx`);
}

// 🔥 페이지 초기화 실행
async function initAttendancePage() {
  setTodayDate();
  startAttendanceDateWatcher();

  realAttendanceList =
    await fetchTodayAttendance();

  renderRegionFilterOptions();

  updateSummaryStats(
    realAttendanceList
  );

  renderAttendanceTable(
    realAttendanceList
  );

  await loadMonthlyLateEmployees();

  if (regionFilter) {
    regionFilter.addEventListener(
      "change",
      filterAttendanceData
    );
  }

  if (statusFilter) {
    statusFilter.addEventListener(
      "change",
      filterAttendanceData
    );
  }

  if (employeeSearchInput) {
    employeeSearchInput.addEventListener(
      "input",
      filterAttendanceData
    );
  }

  if (excelDownloadBtn) {
    excelDownloadBtn.addEventListener(
      "click",
      handleExcelDownload
    );
  }
}

initAttendancePage();

// 특정 출퇴근 로그 ID의 시간을 수동으로 변경하는 관리자 전용 함수
async function adminUpdateAttendanceTime(logId, newCheckIn, newCheckOut, newStatus) {
  try {
    const { data, error } = await supabase
      .from("attendance")
      .update({
        check_in_time: newCheckIn,   // ISO string 형식 (예: 2026-07-07T09:00:00Z)
        check_out_time: newCheckOut, // ISO string 형식
        status: newStatus            // 'normal', 'late' 등
      })
      .eq("id", logId)
      .select();

    if (error) throw error;

    alert("출퇴근 기록이 성공적으로 수정되었습니다.");
    // 수정 후 테이블 새로고침
    initAttendancePage(); 
  } catch (err) {
    console.error("출퇴근 수정 실패:", err.message);
    alert("기록 수정 중 오류가 발생했습니다.");
  }
}