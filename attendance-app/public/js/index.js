import supabase from "./supabase.js";
import {
  getEmployeeSessionToken,
  getCurrentEmployee,
} from "./employeeAuth.js";

const todayDate = document.getElementById("todayDate");
const userName = document.getElementById("userName");

const attendanceBtn = document.getElementById("attendanceBtn");
const buttonText = document.getElementById("buttonText");
const workStatus = document.getElementById("workStatus");
const checkInTime = document.getElementById("checkInTime");
const checkOutTime = document.getElementById("checkOutTime");

const locationStatusText = document.getElementById( "locationStatusText" );
const locationStatusBadge = document.getElementById( "locationStatusBadge" );
const homeNoticeList = document.getElementById("homeNoticeList");
const noticeMoreBtn = document.getElementById("noticeMoreBtn");

let currentEmployee = null;
let todayAttendance = null;


// 상단에 오늘 날짜 표시
function setTodayDate() {
  if (!todayDate) return;

  const today = new Date();
  const formatted = today.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  todayDate.textContent = formatted;
}

// 시간 포맷 (예: 09:02)
function formatTime(dateString) {
  if (!dateString) return "--:--";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 브라우저/스마트폰 GPS 위치 가져오기
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("이 브라우저에서는 위치 정보를 사용할 수 없습니다."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

function calculateDistanceMeters(
  lat1,
  lng1,
  lat2,
  lng2
) {
  const earthRadius = 6371000;

  const toRadians = (value) =>
    value * (Math.PI / 180);

  const latitudeDifference =
    toRadians(lat2 - lat1);

  const longitudeDifference =
    toRadians(lng2 - lng1);

  const firstLatitude =
    toRadians(lat1);

  const secondLatitude =
    toRadians(lat2);

  const value =
    Math.sin(
      latitudeDifference / 2
    ) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(
        longitudeDifference / 2
      ) ** 2;

  const angle =
    2 *
    Math.atan2(
      Math.sqrt(value),
      Math.sqrt(1 - value)
    );

  return earthRadius * angle;
}

function setLocationStatus(
  text,
  badgeText,
  statusClass
) {
  if (locationStatusText) {
    locationStatusText.textContent = text;
  }

  if (locationStatusBadge) {
    locationStatusBadge.textContent =
      badgeText;

    locationStatusBadge.className =
      `status-badge ${statusClass}`;
  }
}

async function loadLocationStatus() {
  const token =
    getEmployeeSessionToken();

  if (!token) return;

  setLocationStatus(
    "현재 위치를 확인하고 있습니다.",
    "확인 중",
    "neutral"
  );

  const workplaceResult =
    await supabase.rpc(
      "get_my_workplaces",
      {
        p_session_token: token,
      }
    );

  if (workplaceResult.error) {
    console.error(
      "배정 근무지 조회 실패:",
      workplaceResult.error
    );

    setLocationStatus(
      "근무지 정보를 불러오지 못했습니다.",
      "확인 실패",
      "danger"
    );

    return;
  }

  const workplaces =
    workplaceResult.data || [];

  if (workplaces.length === 0) {
    setLocationStatus(
      "현재 배정된 근무지가 없습니다.",
      "미배정",
      "warning"
    );

    return;
  }

  try {
    const position =
      await getCurrentPosition();

    const workplaceDistances =
      workplaces
        .map((workplace) => {
          const latitude =
            Number(workplace.latitude);

          const longitude =
            Number(workplace.longitude);

          const radius =
            Math.max(
              Number(
                workplace.radius_m
              ) || 100,
              1
            );

          if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
          ) {
            return null;
          }

          const distance =
            calculateDistanceMeters(
              position.latitude,
              position.longitude,
              latitude,
              longitude
            );

          return {
            ...workplace,
            distance,
            radius,
          };
        })
        .filter(Boolean)
        .sort(
          (a, b) =>
            a.distance - b.distance
        );

    const nearestWorkplace =
      workplaceDistances[0];

    if (!nearestWorkplace) {
      setLocationStatus(
        "근무지 위치가 등록되지 않았습니다.",
        "확인 필요",
        "warning"
      );

      return;
    }

    if (
      nearestWorkplace.distance <=
      nearestWorkplace.radius
    ) {
      setLocationStatus(
        `${nearestWorkplace.workplace_name} 근무지 안입니다.`,
        "확인됨",
        "success"
      );

      return;
    }

    const distanceText =
      nearestWorkplace.distance >= 1000
        ? `${
            (
              nearestWorkplace.distance /
              1000
            ).toFixed(1)
          }km`
        : `${
            Math.round(
              nearestWorkplace.distance
            )
          }m`;

    setLocationStatus(
      `${nearestWorkplace.workplace_name}에서 ${distanceText} 떨어져 있습니다.`,
      "범위 밖",
      "danger"
    );
  } catch (error) {
    console.error(
      "현재 위치 확인 실패:",
      error
    );

    if (error?.code === 1) {
      setLocationStatus(
        "위치 권한을 허용해 주세요.",
        "권한 필요",
        "warning"
      );

      return;
    }

    if (error?.code === 2) {
      setLocationStatus(
        "현재 위치를 확인할 수 없습니다.",
        "확인 실패",
        "danger"
      );

      return;
    }

    if (error?.code === 3) {
      setLocationStatus(
        "위치 확인 시간이 초과되었습니다.",
        "다시 확인",
        "warning"
      );

      return;
    }

    setLocationStatus(
      "현재 위치를 확인하지 못했습니다.",
      "확인 실패",
      "danger"
    );
  }
}

// 화면 UI 상태 업데이트 (출근 전 / 근무 중 / 근무 완료)
function updateAttendanceUI() {
  if (
    !workStatus ||
    !buttonText ||
    !checkInTime ||
    !checkOutTime
  ) {
    return;
  }

  if (!todayAttendance) {
    workStatus.textContent =
      "출근 전";

    buttonText.textContent =
      "출근하기";

    checkInTime.textContent =
      "--:--";

    checkOutTime.textContent =
      "--:--";

    if (attendanceBtn) {
      attendanceBtn.disabled = false;
    }

    return;
  }

  checkInTime.textContent =
    formatTime(
      todayAttendance.check_in_time
    );

  checkOutTime.textContent =
    formatTime(
      todayAttendance.check_out_time
    );

  if (
    todayAttendance.check_in_time &&
    !todayAttendance.check_out_time
  ) {
    workStatus.textContent =
      "근무 중";

    buttonText.textContent =
      "퇴근하기";

    if (attendanceBtn) {
      attendanceBtn.disabled = false;
    }

    return;
  }

  if (
    todayAttendance.check_in_time &&
    todayAttendance.check_out_time
  ) {
    workStatus.textContent =
      "근무 완료";

    buttonText.textContent =
      "퇴근 완료";

    if (attendanceBtn) {
      attendanceBtn.disabled = true;
    }
  }
}

// 에러 메시지 한글화
function getErrorMessage(error) {
  const message = error?.message || "";

  if (message.includes("INVALID_SESSION")) {
    return "로그인 정보가 만료되었습니다. 다시 로그인해주세요.";
  }
  if (message.includes("ALREADY_CHECKED_IN")) {
    return "이미 오늘 출근 처리되었습니다.";
  }
  if (message.includes("OUT_OF_WORKPLACE_RANGE")) {
    return "현재 위치가 배정된 근무지 범위 밖입니다.";
  }
  if (message.includes("NO_WORKING_ATTENDANCE")) {
    return "퇴근 처리할 출근 기록이 없습니다.";
  }

  return "처리 중 오류가 발생했습니다.";
}

// 오늘 출퇴근 기록 조회
async function loadTodayAttendance() {
  const token = getEmployeeSessionToken();
  if (!token) {
    location.href = "../employee/login.html";
    return;
  }

  const { data, error } = await supabase.rpc("get_my_today_attendance", {
    p_session_token: token,
  });

  if (error) {
    console.error("오늘 출근 기록 조회 오류:", error);
    alert("오늘 근무 정보를 불러오지 못했습니다.");
    return;
  }

  todayAttendance = data?.[0] || null;
  updateAttendanceUI();
}

// 출근 처리 함수
async function checkIn() {
  const token = getEmployeeSessionToken();
  if (!token) {
    location.href = "../employee/login.html";
    return;
  }

  const position = await getCurrentPosition();

  const { data, error } = await supabase.rpc("employee_check_in", {
    p_session_token: token,
    p_lat: position.latitude,
    p_lng: position.longitude,
  });

  if (error) {
    console.error(
      "출근 오류:",
      error
    );

    const errorMessage =
      error?.message || "";

    if (
      errorMessage.includes(
        "OUT_OF_WORKPLACE_RANGE"
      )
    ) {
      const {
        error: logError,
      } = await supabase.rpc(
        "employee_log_location_error",
        {
          p_session_token:
            token,

          p_lat:
            position.latitude,

          p_lng:
            position.longitude,
        }
      );

      if (logError) {
        console.error(
          "위치 오류 기록 실패:",
          logError
        );
      }
    }

    throw new Error(
      getErrorMessage(error)
    );
  }

  todayAttendance = data?.[0] || null;
  updateAttendanceUI();

  const workplaceName = todayAttendance?.workplace_name || "근무지";

  await loadLocationStatus();

  alert(`${workplaceName} 출근 완료`);
}

// 퇴근 처리 함수
async function checkOut() {
  const token = getEmployeeSessionToken();
  if (!token) {
    location.href = "../employee/login.html";
    return;
  }

  const position = await getCurrentPosition();

  const { data, error } = await supabase.rpc("employee_check_out", {
    p_session_token: token,
    p_lat: position.latitude,
    p_lng: position.longitude,
  });

  if (error) {
    console.error("퇴근 오류:", error);
    throw new Error(getErrorMessage(error));
  }

  todayAttendance = data?.[0] || null;
  updateAttendanceUI();

  const workplaceName = todayAttendance?.workplace_name || "근무지";

  await loadLocationStatus();

  alert(`${workplaceName} 퇴근 완료`);
}

// 🔥 핵심: 출퇴근 버튼 클릭 이벤트 (확인창 팝업 기능 추가!)
attendanceBtn?.addEventListener("click", async () => {
  try {
    // 1. 출근 전 상태일 때 -> 출근 확인창 띄우기
    if (!todayAttendance) {
      if (!confirm("출근하시겠습니까?")) {
        return; // '아니오/취소'를 누르면 여기서 바로 멈춤!
      }
    }
    // 2. 근무 중(출근 완료, 퇴근 전) 상태일 때 -> 퇴근 확인창 띄우기
    else if (todayAttendance.check_in_time && !todayAttendance.check_out_time) {
      if (!confirm("퇴근하시겠습니까?")) {
        return; // '아니오/취소'를 누르면 여기서 바로 멈춤!
      }
    }
    // 3. 이미 퇴근까지 모두 완료된 상태면 아무 작업도 하지 않음
    else {
      return;
    }

    // --- 확인(예)을 눌렀을 때만 아래 GPS 위치 확인 및 서버 통신 실행 ---
    attendanceBtn.disabled = true;

    if (buttonText) {
      buttonText.textContent = "위치 확인 중...";
    }

    if (!todayAttendance) {
      await checkIn();
      return;
    }

    if (todayAttendance.check_in_time && !todayAttendance.check_out_time) {
      await checkOut();
      return;
    }
  } catch (error) {
    alert(error.message);
    console.error("출퇴근 처리 에러:", error);
  } finally {
    updateAttendanceUI();

    if (!todayAttendance?.check_out_time && attendanceBtn) {
      attendanceBtn.disabled = false;
    }
  }
});

async function loadHomeNoticeFeed() {
  const token = getEmployeeSessionToken();

  if (!token || !homeNoticeList) {
    return;
  }

  const [
    notificationResult,
    workplaceResult,
    noticeResult,
  ] = await Promise.all([
    supabase.rpc(
      "get_my_notifications",
      {
        p_session_token: token,
      }
    ),

    supabase.rpc(
      "get_my_workplaces",
      {
        p_session_token: token,
      }
    ),

    supabase.rpc(
      "get_my_notices_by_session",
      {
        p_session_token: token,
      }
    ),
  ]);

  if (notificationResult.error) {
    console.error(
      "개인 알림 조회 실패:",
      notificationResult.error
    );
  }

  if (noticeResult.error) {
    console.error(
      "공지사항 조회 실패:",
      noticeResult.error
    );
  }

  const targets = new Set([
    "전체 직원",
    currentEmployee?.department,
    ...(workplaceResult.data || []).map(
      (workplace) =>
        workplace.workplace_name
    ),
  ].filter(Boolean));

  const personalNotifications =
    (notificationResult.data || []).map(
      (notification) => ({
        id: notification.id,
        source: "notification",
        title: notification.title,
        content: notification.content,
        createdAt: notification.created_at,
        unread: !notification.read_at,
        important: true,
        type: notification.type,
      })
    );

  const publicNotices =
    (noticeResult.data || [])
      .map((notice) => ({
        id: notice.id,
        source: "notice",
        title: notice.title,
        content: notice.content,
        createdAt: notice.created_at,
        unread: false,
        important:
          notice.important === true,
        type: "notice",
      }));

  const feed = [
    ...personalNotifications,
    ...publicNotices,
  ].sort(
    (a, b) =>
      new Date(b.createdAt) -
      new Date(a.createdAt)
  );

  const latest = feed[0];

  if (!latest) {
    homeNoticeList.innerHTML = `
      <article class="notice-item">
        <div class="notice-icon">🔔</div>

        <div>
          <p class="notice-text">
            새로운 공지사항이 없습니다.
          </p>
        </div>
      </article>
    `;

    return;
  }

  const isLeaveNotification =
    latest.type === "annual_leave";

  homeNoticeList.innerHTML = `
    <button
      class="notice-item ${
        latest.unread ? "unread" : ""
      }"
      type="button"
    >
      <div class="notice-icon">
        ${
          isLeaveNotification
            ? "🌴"
            : latest.important
              ? "!"
              : "🔔"
        }
      </div>

      <div class="home-notice-content">
        <span class="home-notice-kind">
          ${
            latest.source === "notification"
              ? isLeaveNotification
                ? "연차 알림"
                : "개인 알림"
              : "공지"
          }
        </span>

        <p class="notice-text"></p>

        <span class="notice-date">
          ${new Date(
            latest.createdAt
          ).toLocaleDateString("ko-KR")}
        </span>
      </div>
    </button>
  `;

  const noticeButton =
    homeNoticeList.querySelector(
      ".notice-item"
    );

  noticeButton
    .querySelector(".notice-text")
    .textContent = latest.title;

  noticeButton.addEventListener(
    "click",
    async () => {
      if (
        latest.source === "notification" &&
        latest.unread
      ) {
        await supabase.rpc(
          "mark_my_notification_read",
          {
            p_session_token: token,
            p_notification_id: latest.id,
          }
        );
      }

      if (
        latest.source === "notification"
      ) {
        location.href =
          `notices.html?notification=${latest.id}`;
      } else {
        location.href =
          `notices.html?notice=${latest.id}`;
      }
    }
  );
}

// 🔥 핵심: 메인 홈 화면 전용 올바른 초기화 함수
async function init() {
  currentEmployee =
    await getCurrentEmployee();

  if (!currentEmployee) {
    return;
  }

  if (userName) {
    userName.textContent =
      currentEmployee.name ||
      "직원";
  }

  setTodayDate();

  await loadTodayAttendance();
  await loadLocationStatus();

  noticeMoreBtn
    ?.addEventListener(
      "click",
      () => {
        location.href =
          "notices.html";
      }
    );

  await loadHomeNoticeFeed();
}

init();