import {
  getCurrentEmployee,
} from "./employeeAuth.js";


async function init() {
  const employee =
    await getCurrentEmployee();

  if (!employee) {
    return;
  }

  const isTeamLead =
    employee.app_role ===
    "team_lead";

  const isChecklistAdmin =
    employee.app_role ===
    "checklist_admin";

  const canUseChecklist =
    isTeamLead ||
    isChecklistAdmin;


  /*
    청소점검표 권한

    팀장:
    배정지역만 작성

    점검 관리자:
    모든 활성 지역 작성
  */
  document
    .querySelectorAll(
      ".request-menu-card.checklist-only"
    )
    .forEach((link) => {
      if (canUseChecklist) {
        link.classList.remove(
          "locked"
        );

        link.removeAttribute(
          "aria-disabled"
        );

        return;
      }

      link.classList.add(
        "locked"
      );

      link.setAttribute(
        "aria-disabled",
        "true"
      );

      link.addEventListener(
        "click",
        (event) => {
          event.preventDefault();

          alert(
            "청소 점검표 작성 권한이 필요합니다."
          );
        }
      );
    });


  /*
    비품 요청 권한

    기존대로 팀장만 허용
  */
  document
    .querySelectorAll(
      ".request-menu-card.lead-only"
    )
    .forEach((link) => {
      if (isTeamLead) {
        link.classList.remove(
          "locked"
        );

        link.removeAttribute(
          "aria-disabled"
        );

        return;
      }

      link.classList.add(
        "locked"
      );

      link.setAttribute(
        "aria-disabled",
        "true"
      );

      link.addEventListener(
        "click",
        (event) => {
          event.preventDefault();

          alert(
            "비품 요청은 팀장 권한이 필요합니다."
          );
        }
      );
    });
}

init();