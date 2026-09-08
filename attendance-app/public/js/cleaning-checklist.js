import supabase from "./supabase.js";

import {
  getCurrentEmployee,
  getEmployeeSessionToken,
} from "./employeeAuth.js";

import {
  preparePhotos,
  releasePhoto,
  uploadPhotos,
} from "./photo-upload.js";

const MAX_PHOTO_COUNT = 20;

const workplaceSelect =
  document.getElementById(
    "checklistWorkplace"
  );

const checklistList =
  document.getElementById(
    "checklistList"
  );

const customInput =
  document.getElementById(
    "customChecklistInput"
  );

const noteInput =
  document.getElementById(
    "checklistNote"
  );

const photoInput =
  document.getElementById(
    "checklistPhotoInput"
  );

const photoList =
  document.getElementById(
    "checklistPhotoList"
  );

const photoCount =
  document.getElementById(
    "checklistPhotoCount"
  );

const uploadProgress =
  document.getElementById(
    "checklistUploadProgress"
  );

const uploadProgressText =
  document.getElementById(
    "checklistUploadProgressText"
  );

const uploadProgressBar =
  document.getElementById(
    "checklistUploadProgressBar"
  );

const submitButton =
  document.getElementById(
    "submitChecklistBtn"
  );

let selectedPhotos = [];

let createdSubmissionId = null;


function escapeHtml(value) {
  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}


function formatFileSize(bytes) {
  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(2)}MB`;
}


function renderPhotos() {
  photoCount.textContent =
    `${selectedPhotos.length}/${MAX_PHOTO_COUNT}`;

  if (
    selectedPhotos.length === 0
  ) {
    photoList.innerHTML = "";

    return;
  }

  photoList.innerHTML =
    selectedPhotos
      .map(
        (photo) => `
          <article class="checklist-photo-item">
            <img
              src="${photo.previewUrl}"
              alt="현장 사진 미리보기"
            >

            ${
              photo.uploaded
                ? `
                  <span class="checklist-photo-complete">
                    업로드 완료
                  </span>
                `
                : `
                  <button
                    type="button"
                    data-remove-photo="${photo.id}"
                    aria-label="사진 삭제"
                  >
                    ×
                  </button>
                `
            }

            <small>
              ${formatFileSize(
                photo.file.size
              )}
            </small>
          </article>
        `
      )
      .join("");

  photoList
    .querySelectorAll(
      "[data-remove-photo]"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            removePhoto(
              button.dataset
                .removePhoto
            );
          }
        );
      }
    );
}


function removePhoto(photoId) {
  const targetPhoto =
    selectedPhotos.find(
      (photo) =>
        photo.id === photoId
    );

  if (
    !targetPhoto ||
    targetPhoto.uploaded
  ) {
    return;
  }

  releasePhoto(
    targetPhoto
  );

  selectedPhotos =
    selectedPhotos.filter(
      (photo) =>
        photo.id !== photoId
    );

  renderPhotos();
}


async function handlePhotoSelection() {
  const files =
    Array.from(
      photoInput.files || []
    );

  if (!files.length) {
    return;
  }

  const remainingCount =
    MAX_PHOTO_COUNT -
    selectedPhotos.length;

  if (remainingCount <= 0) {
    alert(
      "사진은 최대 20장까지 첨부할 수 있습니다."
    );

    photoInput.value = "";
    return;
  }

  if (
    files.length >
    remainingCount
  ) {
    alert(
      `사진을 ${remainingCount}장 더 추가할 수 있습니다.`
    );

    photoInput.value = "";
    return;
  }

  photoInput.disabled = true;

  try {
    const preparedPhotos =
      await preparePhotos(
        files,
        remainingCount
      );

    selectedPhotos.push(
      ...preparedPhotos
    );

    renderPhotos();
  } catch (error) {
    console.error(
      "사진 준비 실패:",
      error
    );

    alert(
      error.message ||
      "사진을 처리하지 못했습니다."
    );
  } finally {
    photoInput.disabled =
      false;

    photoInput.value = "";
  }
}


async function loadItems() {
  const workplaceId =
    workplaceSelect.value;

  if (!workplaceId) {
    checklistList.innerHTML =
      "<p>배정된 현장이 없습니다.</p>";

    return;
  }

  checklistList.innerHTML = `
    <p class="checklist-loading">
      점검 항목을 불러오는 중입니다.
    </p>
  `;

  const {
    data,
    error,
  } = await supabase.rpc(
    "get_my_cleaning_checklist",
    {
      p_session_token:
        getEmployeeSessionToken(),

      p_workplace_id:
        workplaceId,
    }
  );

  if (error) {
    console.error(
      "점검 항목 조회 실패:",
      error
    );

    checklistList.innerHTML = `
      <p class="checklist-error">
        점검 항목을 불러오지 못했습니다.
      </p>
    `;

    return;
  }

  const items =
    data || [];

  if (!items.length) {
    checklistList.innerHTML = `
      <p class="checklist-empty">
        등록된 항목이 없습니다.
        위에서 항목을 추가해 주세요.
      </p>
    `;

    return;
  }

  checklistList.innerHTML =
    items
      .map(
        (
          item,
          index
        ) => `
          <article
            class="checklist-rating-row"
            data-checklist-id="${escapeHtml(
              item.id
            )}"
            data-checklist-source="${escapeHtml(
              item.source
            )}"
            data-checklist-rating=""
          >
            <div class="checklist-rating-title">
              <span>
                ${index + 1}
              </span>

              <strong>
                ${escapeHtml(
                  item.label
                )}
              </strong>
            </div>

            <div
              class="checklist-rating-buttons"
              role="group"
              aria-label="${escapeHtml(
                item.label
              )} 상태 선택"
            >
              <button
                type="button"
                class="rating-button poor"
                data-rating="poor"
              >
                불량
              </button>

              <button
                type="button"
                class="rating-button fair"
                data-rating="fair"
              >
                보통
              </button>

              <button
                type="button"
                class="rating-button good"
                data-rating="good"
              >
                양호
              </button>
            </div>

            <p class="checklist-rating-message">
              상태를 선택해 주세요.
            </p>
          </article>
        `
      )
      .join("");

  checklistList
    .querySelectorAll(
      ".checklist-rating-row"
    )
    .forEach(
      (row) => {
        row
          .querySelectorAll(
            "[data-rating]"
          )
          .forEach(
            (button) => {
              button.addEventListener(
                "click",
                () => {
                  const rating =
                    button.dataset
                      .rating;

                  row.dataset
                    .checklistRating =
                    rating;

                  row.classList.remove(
                    "rating-missing"
                  );

                  row
                    .querySelectorAll(
                      "[data-rating]"
                    )
                    .forEach(
                      (
                        currentButton
                      ) => {
                        const selected =
                          currentButton ===
                          button;

                        currentButton
                          .classList
                          .toggle(
                            "selected",
                            selected
                          );

                        currentButton
                          .setAttribute(
                            "aria-pressed",
                            String(
                              selected
                            )
                          );
                      }
                    );

                  const message =
                    row.querySelector(
                      ".checklist-rating-message"
                    );

                  if (message) {
                    const labels = {
                      poor: "불량으로 선택됨",
                      fair: "보통으로 선택됨",
                      good: "양호로 선택됨",
                    };

                    message.textContent =
                      labels[rating];

                    message.className =
                      `checklist-rating-message ${rating}`;
                  }
                }
              );
            }
          );
      }
    );
}


async function addChecklistItem() {
  const label =
    customInput.value.trim();

  if (!label) {
    customInput.focus();
    return;
  }

  const {
    error,
  } = await supabase.rpc(
    "add_my_checklist_item",
    {
      p_session_token:
        getEmployeeSessionToken(),

      p_workplace_id:
        workplaceSelect.value,

      p_label: label,
    }
  );

  if (error) {
    console.error(
      "항목 추가 실패:",
      error
    );

    alert(
      "항목을 추가하지 못했습니다."
    );

    return;
  }

  customInput.value = "";

  await loadItems();
}


function updateProgress(
  current,
  total
) {
  uploadProgress.hidden =
    false;

  uploadProgressText.textContent =
    `${current}/${total}`;

  const percentage =
    total > 0
      ? Math.round(
          (current / total) *
            100
        )
      : 0;

  uploadProgressBar.style.width =
    `${percentage}%`;
}


async function submitChecklist() {
  if (
    !workplaceSelect.value
  ) {
    alert(
      "점검 현장을 선택해 주세요."
    );

    return;
  }

  const checklistRows = [
    ...checklistList
      .querySelectorAll(
        ".checklist-rating-row"
      ),
  ];

  if (!checklistRows.length) {
    alert(
      "제출할 점검 항목이 없습니다."
    );

    return;
  }

  const missingRows =
    checklistRows.filter(
      (row) =>
        !row.dataset
          .checklistRating
    );

  if (missingRows.length) {
    missingRows.forEach(
      (row) => {
        row.classList.add(
          "rating-missing"
        );
      }
    );

    missingRows[0]
      .scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

    alert(
      `선택하지 않은 점검 항목이 ${missingRows.length}개 있습니다.`
    );

    return;
  }

  const checkedItems =
    checklistRows.map(
      (row) => ({
        id:
          row.dataset
            .checklistId,

        source:
          row.dataset
            .checklistSource,

        rating:
          row.dataset
            .checklistRating,
      })
    );

  submitButton.disabled = true;

  submitButton.textContent =
    createdSubmissionId
      ? "남은 사진 업로드 중..."
      : "점검표 저장 중...";

  try {
    /*
     * 처음 누른 경우에만
     * 점검표 제출 내역 생성
     */
    if (
      !createdSubmissionId
    ) {
      const {
        data:
          submissionId,
        error:
          submissionError,
      } = await supabase.rpc(
        "submit_cleaning_checklist",
        {
          p_session_token:
            getEmployeeSessionToken(),

          p_workplace_id:
            workplaceSelect.value,

          p_checked_items:
            checkedItems,

          p_note:
            noteInput.value.trim(),
        }
      );

      if (submissionError) {
        throw submissionError;
      }

      createdSubmissionId =
        submissionId;
    }

    const pendingPhotos =
      selectedPhotos.filter(
        (photo) =>
          !photo.uploaded
      );

    if (
      pendingPhotos.length > 0
    ) {
      submitButton.textContent =
        "사진 업로드 중...";

      await uploadPhotos({
        photos:
          selectedPhotos,

        parentType:
          "cleaning_checklist",

        parentId:
          createdSubmissionId,

        onProgress({
          current,
          total,
        }) {
          updateProgress(
            current,
            total
          );
        },

        onUploaded({
          photo,
          current,
          total,
        }) {
          photo.uploaded = true;

          updateProgress(
            current,
            total
          );

          renderPhotos();
        },
      });
    }

    selectedPhotos.forEach(
      releasePhoto
    );

    alert(
      selectedPhotos.length
        ? "청소 점검표와 현장 사진이 제출되었습니다."
        : "청소 점검표가 제출되었습니다."
    );

    location.replace(
      "request.html"
    );
  } catch (error) {
    console.error(
      "청소 점검표 제출 실패:",
      error
    );

    const uploadedCount =
      selectedPhotos.filter(
        (photo) =>
          photo.uploaded
      ).length;

    if (
      createdSubmissionId
    ) {
      alert(
        `점검표는 저장되었지만 사진 업로드가 중단되었습니다.\n` +
        `현재 ${uploadedCount}/${selectedPhotos.length}장 완료\n\n` +
        `${
          error.message ||
          "남은 사진을 다시 업로드해 주세요."
        }`
      );

      submitButton.textContent =
        "남은 사진 다시 업로드";
    } else {
      alert(
        error.message ||
        "점검표를 제출하지 못했습니다."
      );
    }
  } finally {
    submitButton.disabled =
      false;

    if (
      selectedPhotos.every(
        (photo) =>
          !photo.uploaded
      )
    ) {
      submitButton.textContent =
        "점검 결과 제출";
    }
  }
}


async function init() {
  const employee =
    await getCurrentEmployee();

  if (!employee) {
    return;
  }

  const canUseChecklist =
    employee.app_role ===
      "team_lead" ||
    employee.app_role ===
      "checklist_admin";

  if (!canUseChecklist) {
    alert(
      "청소점검 권한이 없습니다."
    );

    location.replace(
      "request.html"
    );

    return;
  }

  const {
    data: workplaces,
    error:
      workplaceError,
  } = await supabase.rpc(
    "get_my_checklist_workplaces",
    {
      p_session_token:
        getEmployeeSessionToken(),
    }
  );

  if (workplaceError) {
    console.error(
      "점검 현장 조회 실패:",
      workplaceError
    );

    alert(
      "점검 현장을 불러오지 못했습니다."
    );

    return;
  }

  const availableWorkplaces =
    Array.isArray(workplaces)
      ? workplaces
      : [];

  workplaceSelect.innerHTML =
    availableWorkplaces
      .map((workplace) => {
        const workplaceId =
          workplace.workplace_id ??
          workplace.workplaceId ??
          workplace.id;

        const workplaceName =
          workplace.workplace_name ??
          workplace.workplaceName ??
          workplace.name ??
          "이름 없는 현장";

        return `
          <option
            value="${escapeHtml(
              workplaceId
            )}"
          >
            ${escapeHtml(
              workplaceName
            )}
          </option>
        `;
      })
      .join("");

  if (
    !availableWorkplaces.length
  ) {
    const emptyMessage =
      employee.app_role ===
      "checklist_admin"
        ? `
          현재 등록된 활성 현장이
          없습니다.
        `
        : `
          관리자 웹의 직원 관리에서
          이 계정에 근무지를 먼저
          배정해 주세요.
        `;

    workplaceSelect.innerHTML = `
      <option value="">
        선택 가능한 현장이 없습니다
      </option>
    `;

    workplaceSelect.disabled =
      true;

    checklistList.innerHTML = `
      <p class="checklist-empty">
        ${emptyMessage}
      </p>
    `;

    return;
  }

  workplaceSelect.disabled =
    false;

  workplaceSelect.addEventListener(
    "change",
    loadItems
  );

  document
    .getElementById(
      "addChecklistItemBtn"
    )
    ?.addEventListener(
      "click",
      addChecklistItem
    );

  photoInput?.addEventListener(
    "change",
    handlePhotoSelection
  );

  submitButton?.addEventListener(
    "click",
    submitChecklist
  );

  renderPhotos();

  await loadItems();
}

init();