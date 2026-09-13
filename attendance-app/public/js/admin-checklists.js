import supabase from "./supabase.js";
import { requireAdmin } from "./adminAuth.js";

const itemForm =
  document.getElementById(
    "checklistItemForm"
  );

const itemInput =
  document.getElementById(
    "checklistItemInput"
  );

const catalog =
  document.getElementById(
    "checklistCatalog"
  );

const itemCount =
  document.getElementById(
    "checklistItemCount"
  );

const workplaceSelect =
  document.getElementById(
    "checklistWorkplaceSelect"
  );

const assignedList =
  document.getElementById(
    "workplaceChecklistItems"
  );

const assignedItemCount =
  document.getElementById(
    "assignedItemCount"
  );

const saveButton =
  document.getElementById(
    "saveWorkplaceChecklistBtn"
  );

const saveMessage =
  document.getElementById(
    "checklistSaveMessage"
  );

const submissionCount =
  document.getElementById(
    "submissionCount"
  );

const submissionDateFilter =
  document.getElementById(
    "submissionDateFilter"
  );

const submissionWorkplaceFilter =
  document.getElementById(
    "submissionWorkplaceFilter"
  );

const submissionSearchInput =
  document.getElementById(
    "submissionSearchInput"
  );

const submissionFilterResetBtn =
  document.getElementById(
    "submissionFilterResetBtn"
  );

const submissionTableBody =
  document.getElementById(
    "submissionTableBody"
  );

const previewTableBody =
  document.getElementById(
    "checklistPreviewTableBody"
  );

const appCustomChecklistCatalog =
  document.getElementById(
    "appCustomChecklistCatalog"
  );

const appCustomItemCount =
  document.getElementById(
    "appCustomItemCount"
  );

const checklistDetailModal =
  document.getElementById(
    "checklistDetailModal"
  );

const checklistDetailCloseBtn =
  document.getElementById(
    "checklistDetailCloseBtn"
  );

const checklistDetailCancelBtn =
  document.getElementById(
    "checklistDetailCancelBtn"
  );

const checklistDetailPrintBtn =
  document.getElementById(
    "checklistDetailPrintBtn"
  );

const checklistDetailSubtitle =
  document.getElementById(
    "checklistDetailSubtitle"
  );

const checklistDetailWorkplace =
  document.getElementById(
    "checklistDetailWorkplace"
  );

const checklistDetailEmployee =
  document.getElementById(
    "checklistDetailEmployee"
  );

const checklistDetailDate =
  document.getElementById(
    "checklistDetailDate"
  );

const checklistDetailProgress =
  document.getElementById(
    "checklistDetailProgress"
  );

const checklistDetailTableBody =
  document.getElementById(
    "checklistDetailTableBody"
  );

const checklistDetailNote =
  document.getElementById(
    "checklistDetailNote"
  );

const checklistDetailPhotoCount =
  document.getElementById(
    "checklistDetailPhotoCount"
  );

const checklistDetailPhotoList =
  document.getElementById(
    "checklistDetailPhotoList"
  );

let currentChecklistPhotos = [];

let openedChecklistSubmissionId =
  null;

let appCustomItems = [];
let assignedItemOrder = [];
let submissions = [];
let customItemMap = new Map();
let checklistItems = [];
let workplaces = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showSaveMessage(
  message,
  type = ""
) {
  saveMessage.textContent = message;
  saveMessage.className =
    `workflow-save-message ${type}`;
}

async function loadBaseData() {
  const [
    itemResult,
    workplaceResult,
    customItemResult,
  ] = await Promise.all([
    supabase
      .from("checklist_items")
      .select(
        "id, label, active, created_at"
      )
      .eq("active", true)
      .order("created_at", {
        ascending: true,
      }),

    supabase
      .from("workplaces")
      .select("id, name")
      .order("name", {
        ascending: true,
      }),

    supabase
      .from(
        "employee_custom_checklist_items"
      )
      .select(`
        id,
        user_id,
        workplace_id,
        label,
        created_at,
        users (
          id,
          name,
          department
        )
      `)
      .order("created_at", {
        ascending: false,
      }),
  ]);

  if (itemResult.error) {
    console.error(
      "점검 항목 조회 실패:",
      itemResult.error
    );
  }

  if (workplaceResult.error) {
    console.error(
      "현장 조회 실패:",
      workplaceResult.error
    );

    workplaceSelect.innerHTML = `
      <option value="">
        현장을 불러오지 못했습니다.
      </option>
    `;

    saveButton.disabled = true;
    return;
  }

  if (customItemResult.error) {
    console.error(
      "앱 추가 항목 조회 실패:",
      customItemResult.error
    );
  }

  checklistItems =
    itemResult.data || [];

  workplaces =
    workplaceResult.data || [];

  appCustomItems =
    customItemResult.data || [];

  customItemMap =
    new Map(
      appCustomItems.map(
        (item) => [
          String(item.id),
          item.label,
        ]
      )
    );

  renderCatalog();
  renderAppCustomItems();
  renderWorkplaceOptions();

  await loadAssignments();
}

function renderAppCustomItems() {
  if (!appCustomChecklistCatalog) {
    return;
  }

  appCustomItemCount.textContent =
    `${appCustomItems.length}개`;

  if (!appCustomItems.length) {
    appCustomChecklistCatalog.innerHTML = `
      <p class="workflow-list-empty">
        앱에서 추가된 항목이 없습니다.
      </p>
    `;

    return;
  }

  appCustomChecklistCatalog.innerHTML =
    appCustomItems
      .map((item) => {
        const employeeName =
          item.users?.name ||
          "이름 없음";

        const workplaceName =
          getWorkplaceName(
            item.workplace_id
          );

        return `
          <article class="app-custom-item">
            <div class="app-custom-item-content">
              <strong>
                ${escapeHtml(item.label)}
              </strong>

              <p>
                ${escapeHtml(workplaceName)}
                ·
                ${escapeHtml(employeeName)}
              </p>
            </div>

            <span class="app-custom-badge">
              앱 추가
            </span>

            <button
              type="button"
              data-promote-custom="${escapeHtml(item.id)}"
            >
              현장 항목으로 전환
            </button>

            <button
              class="workflow-delete-button"
              type="button"
              data-delete-custom="${item.id}"
            >
              삭제
            </button>
          </article>
        `;
      })
      .join("");

  appCustomChecklistCatalog
    .querySelectorAll(
      "[data-promote-custom]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          promoteCustomChecklistItem(
            button.dataset.promoteCustom
          );
        }
      );
    });

    appCustomChecklistCatalog
  .querySelectorAll(
    "[data-delete-custom]"
  )
  .forEach((button) => {
    button.addEventListener(
      "click",
      async () => {
        const item =
          appCustomItems.find(
            (currentItem) =>
              currentItem.id ===
              button.dataset.deleteCustom
          );

        if (!item) {
          return;
        }

        await deleteAppCustomChecklistItem(
          item.id,
          item.label
        );
      }
    );
  });
}

async function promoteCustomChecklistItem(
  customItemId
) {
  const customItem =
    appCustomItems.find(
      (item) =>
        String(item.id) ===
        String(customItemId)
    );

  if (!customItem) {
    return;
  }

  const workplaceName =
    getWorkplaceName(
      customItem.workplace_id
    );

  const confirmed = confirm(
    `"${customItem.label}" 항목을 ${workplaceName} 공통 항목으로 전환하시겠습니까?\n해당 현장의 모든 팀장에게 표시됩니다.`
  );

  if (!confirmed) {
    return;
  }

  try {
    const {
      data: commonItem,
      error: commonItemError,
    } = await supabase
      .from("checklist_items")
      .upsert(
        {
          label:
            customItem.label,
          active: true,
        },
        {
          onConflict: "label",
        }
      )
      .select("id, label")
      .single();

    if (commonItemError) {
      throw commonItemError;
    }

    const {
      data: lastAssignment,
    } = await supabase
      .from(
        "workplace_checklist_items"
      )
      .select("sort_order")
      .eq(
        "workplace_id",
        String(
          customItem.workplace_id
        )
      )
      .order("sort_order", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    const nextOrder =
      Number(
        lastAssignment?.sort_order
      ) + 1 || 0;

    const { error: assignmentError } =
      await supabase
        .from(
          "workplace_checklist_items"
        )
        .upsert(
          {
            workplace_id:
              String(
                customItem.workplace_id
              ),

            item_id:
              commonItem.id,

            sort_order:
              nextOrder,
          },
          {
            onConflict:
              "workplace_id,item_id",
          }
        );

    if (assignmentError) {
      throw assignmentError;
    }

    /*
      공통 항목으로 전환했으므로 개인 항목은 삭제한다.
      삭제하지 않으면 앱에 같은 항목이 두 번 표시된다.
    */
    const { error: deleteError } =
      await supabase
        .from(
          "employee_custom_checklist_items"
        )
        .delete()
        .eq(
          "id",
          customItem.id
        );

    if (deleteError) {
      throw deleteError;
    }

    alert(
      "앱 추가 항목이 현장 공통 항목으로 전환되었습니다."
    );

    await loadBaseData();
    await loadSubmissions();
  } catch (error) {
    console.error(
      "앱 항목 전환 실패:",
      error
    );

    alert(
      `현장 항목으로 전환하지 못했습니다.\n${
        error.message || ""
      }`
    );
  }
}

function renderCatalog() {
  itemCount.textContent =
    `${checklistItems.length}개`;

  if (!checklistItems.length) {
    catalog.innerHTML = `
      <p class="workflow-list-empty">
        등록된 점검 항목이 없습니다.
      </p>
    `;

    return;
  }

  catalog.innerHTML =
    checklistItems
      .map((item, index) => `
        <div class="workflow-item">
          <strong class="workflow-item-number">
            ${index + 1}
          </strong>

          <span>
            ${escapeHtml(item.label)}
          </span>

          <button
            type="button"
            data-delete-item="${escapeHtml(item.id)}"
          >
            삭제
          </button>
        </div>
      `)
      .join("");

  catalog
    .querySelectorAll(
      "[data-delete-item]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          deleteChecklistItem(
            button.dataset.deleteItem
          );
        }
      );
    });
}

function renderWorkplaceOptions() {
  if (!workplaces.length) {
    workplaceSelect.innerHTML = `
      <option value="">
        등록된 현장이 없습니다.
      </option>
    `;

    assignedList.innerHTML = `
      <p class="workflow-list-empty">
        먼저 근무지역 관리에서 현장을 등록해 주세요.
      </p>
    `;

    saveButton.disabled = true;
    return;
  }

  workplaceSelect.innerHTML =
    workplaces
      .map((workplace) => `
        <option value="${escapeHtml(workplace.id)}">
          ${escapeHtml(workplace.name)}
        </option>
      `)
      .join("");

  saveButton.disabled = false;
}

async function loadAssignments() {
  const workplaceId =
    workplaceSelect.value;

  showSaveMessage("");

  if (!workplaceId) {
    assignedItemOrder = [];

    assignedList.innerHTML = `
      <p class="workflow-list-empty">
        현장을 선택해 주세요.
      </p>
    `;

    updateAssignedCount();
    renderChecklistPreview();

    return;
  }

  assignedList.innerHTML = `
    <p class="workflow-list-empty">
      배정된 점검 항목을 불러오는 중입니다.
    </p>
  `;

  const { data, error } =
    await supabase
      .from(
        "workplace_checklist_items"
      )
      .select(
        "item_id, sort_order"
      )
      .eq(
        "workplace_id",
        String(workplaceId)
      )
      .order("sort_order", {
        ascending: true,
      });

  if (error) {
    console.error(
      "배정 항목 조회 실패:",
      error
    );

    assignedItemOrder = [];

    assignedList.innerHTML = `
      <p class="workflow-list-empty error">
        배정 항목을 불러오지 못했습니다.
      </p>
    `;

    updateAssignedCount();
    renderChecklistPreview();

    return;
  }

  const validItemIds =
    new Set(
      checklistItems.map(
        (item) =>
          String(item.id)
      )
    );

  assignedItemOrder =
    (data || [])
      .map(
        (assignment) =>
          String(
            assignment.item_id
          )
      )
      .filter((itemId) =>
        validItemIds.has(itemId)
      );

  renderAssignmentItems();
}

function renderAssignmentItems() {
  if (!checklistItems.length) {
    assignedList.innerHTML = `
      <p class="workflow-list-empty">
        왼쪽 보관함에서 점검 항목을 먼저 추가해 주세요.
      </p>
    `;

    assignedItemOrder = [];

    updateAssignedCount();
    renderChecklistPreview();

    return;
  }

  const selectedIds =
    new Set(assignedItemOrder);

  assignedList.innerHTML =
    checklistItems
      .map((item) => {
        const itemId =
          String(item.id);

        const checked =
          selectedIds.has(itemId);

        return `
          <label class="workflow-check checklist-select-item">
            <input
              type="checkbox"
              value="${escapeHtml(itemId)}"
              ${checked ? "checked" : ""}
            />

            <span>
              ${escapeHtml(item.label)}
            </span>

            <small>
              ${
                checked
                  ? "앱에 표시"
                  : "표시 안 함"
              }
            </small>
          </label>
        `;
      })
      .join("");

  assignedList
    .querySelectorAll(
      'input[type="checkbox"]'
    )
    .forEach((checkbox) => {
      checkbox.addEventListener(
        "change",
        () => {
          const itemId =
            String(
              checkbox.value
            );

          if (checkbox.checked) {
            if (
              !assignedItemOrder.includes(
                itemId
              )
            ) {
              assignedItemOrder.push(
                itemId
              );
            }
          } else {
            assignedItemOrder =
              assignedItemOrder.filter(
                (selectedId) =>
                  selectedId !== itemId
              );
          }

          const statusText =
            checkbox
              .closest(
                ".checklist-select-item"
              )
              ?.querySelector("small");

          if (statusText) {
            statusText.textContent =
              checkbox.checked
                ? "앱에 표시"
                : "표시 안 함";
          }

          updateAssignedCount();
          renderChecklistPreview();
        }
      );
    });

  updateAssignedCount();
  renderChecklistPreview();
}

function updateAssignedCount() {
  assignedItemCount.textContent =
    `${assignedItemOrder.length}개 선택`;
}

function getChecklistItem(
  itemId
) {
  return checklistItems.find(
    (item) =>
      String(item.id) ===
      String(itemId)
  );
}

function renderChecklistPreview() {
  if (!previewTableBody) {
    return;
  }

  if (!assignedItemOrder.length) {
    previewTableBody.innerHTML = `
      <tr>
        <td
          colspan="3"
          class="checklist-preview-empty"
        >
          위에서 앱에 표시할 항목을 선택해 주세요.
        </td>
      </tr>
    `;

    return;
  }

  previewTableBody.innerHTML =
    assignedItemOrder
      .map((itemId, index) => {
        const item =
          getChecklistItem(itemId);

        if (!item) {
          return "";
        }

        const isFirst =
          index === 0;

        const isLast =
          index ===
          assignedItemOrder.length - 1;

        return `
          <tr>
            <td>
              <strong class="checklist-order-number">
                ${index + 1}
              </strong>
            </td>

            <td>
              <div class="checklist-preview-name">
                <span class="checklist-preview-checkbox">
                  ✓
                </span>

                <strong>
                  ${escapeHtml(item.label)}
                </strong>
              </div>
            </td>

            <td>
              <div class="checklist-order-actions">
                <button
                  type="button"
                  data-move-item="${escapeHtml(itemId)}"
                  data-direction="-1"
                  aria-label="위로 이동"
                  ${isFirst ? "disabled" : ""}
                >
                  ↑
                </button>

                <button
                  type="button"
                  data-move-item="${escapeHtml(itemId)}"
                  data-direction="1"
                  aria-label="아래로 이동"
                  ${isLast ? "disabled" : ""}
                >
                  ↓
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

  previewTableBody
    .querySelectorAll(
      "[data-move-item]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          moveChecklistItem(
            button.dataset.moveItem,
            Number(
              button.dataset.direction
            )
          );
        }
      );
    });
}

function moveChecklistItem(
  itemId,
  direction
) {
  const currentIndex =
    assignedItemOrder.indexOf(
      String(itemId)
    );

  if (currentIndex < 0) {
    return;
  }

  const nextIndex =
    currentIndex + direction;

  if (
    nextIndex < 0 ||
    nextIndex >=
      assignedItemOrder.length
  ) {
    return;
  }

  const reorderedItems = [
    ...assignedItemOrder,
  ];

  [
    reorderedItems[currentIndex],
    reorderedItems[nextIndex],
  ] = [
    reorderedItems[nextIndex],
    reorderedItems[currentIndex],
  ];

  assignedItemOrder =
    reorderedItems;

  renderChecklistPreview();

  showSaveMessage(
    "표시 순서가 변경되었습니다. 저장 버튼을 눌러 적용해 주세요."
  );
}

async function addChecklistItem(event) {
  event.preventDefault();

  const label =
    itemInput.value.trim();

  if (!label) {
    alert(
      "추가할 점검 항목을 입력해 주세요."
    );

    return;
  }

  const submitButton =
    itemForm.querySelector(
      'button[type="submit"]'
    );

  submitButton.disabled = true;
  submitButton.textContent =
    "추가 중...";

  const { error } =
    await supabase
      .from("checklist_items")
      .insert({
        label,
        active: true,
      });

  if (error) {
    console.error(
      "점검 항목 추가 실패:",
      error
    );

    if (error.code === "23505") {
      alert(
        "이미 등록된 점검 항목입니다."
      );
    } else {
      alert(
        `점검 항목을 추가하지 못했습니다.\n${
          error.message || ""
        }`
      );
    }

    submitButton.disabled = false;
    submitButton.textContent =
      "항목 추가";

    return;
  }

  itemInput.value = "";

  submitButton.disabled = false;
  submitButton.textContent =
    "항목 추가";

  await loadBaseData();
}

async function deleteChecklistItem(
  itemId
) {
  const item =
    checklistItems.find(
      (checklistItem) =>
        String(checklistItem.id) ===
        String(itemId)
    );

  const confirmed = confirm(
    `"${item?.label || "이 항목"}"을 삭제하시겠습니까?\n모든 현장의 배정 목록에서도 제거됩니다.`
  );

  if (!confirmed) {
    return;
  }

  const { error } =
    await supabase
      .from("checklist_items")
      .delete()
      .eq("id", itemId);

  if (error) {
    console.error(
      "점검 항목 삭제 실패:",
      error
    );

    alert(
      `항목을 삭제하지 못했습니다.\n${
        error.message || ""
      }`
    );

    return;
  }

  await loadBaseData();
}

async function saveWorkplaceAssignments() {
  const workplaceId =
    workplaceSelect.value;

  if (!workplaceId) {
    alert(
      "현장을 선택해 주세요."
    );

    return;
  }

  const assignments =
    assignedItemOrder.map(
      (itemId, index) => ({
        workplace_id:
          String(workplaceId),

        item_id:
          itemId,

        sort_order:
          index,
      })
    );

  saveButton.disabled = true;
  saveButton.textContent =
    "저장 중...";

  showSaveMessage("");

  const { error: deleteError } =
    await supabase
      .from(
        "workplace_checklist_items"
      )
      .delete()
      .eq(
        "workplace_id",
        String(workplaceId)
      );

  if (deleteError) {
    console.error(
      "기존 배정 삭제 실패:",
      deleteError
    );

    alert(
      "기존 점검표 정보를 정리하지 못했습니다."
    );

    saveButton.disabled = false;
    saveButton.textContent =
      "현장 점검표 저장";

    return;
  }

  if (assignments.length) {
    const { error: insertError } =
      await supabase
        .from(
          "workplace_checklist_items"
        )
        .insert(assignments);

    if (insertError) {
      console.error(
        "점검표 저장 실패:",
        insertError
      );

      alert(
        `점검표를 저장하지 못했습니다.\n${
          insertError.message || ""
        }`
      );

      saveButton.disabled = false;
      saveButton.textContent =
        "현장 점검표 저장";

      return;
    }
  }

  saveButton.disabled = false;
  saveButton.textContent =
    "현장 점검표 저장";

  showSaveMessage(
    "선택 항목과 표시 순서가 저장되었습니다.",
    "success"
  );

  await loadAssignments();
}

function formatSubmissionDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString(
    "ko-KR",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function renderSubmissionWorkplaces() {
  const currentValue =
    submissionWorkplaceFilter.value;

  submissionWorkplaceFilter.innerHTML = `
    <option value="all">
      전체 현장
    </option>

    ${workplaces
      .map(
        (workplace) => `
          <option value="${escapeHtml(workplace.id)}">
            ${escapeHtml(workplace.name)}
          </option>
        `
      )
      .join("")}
  `;

  const valueExists = [
    ...submissionWorkplaceFilter.options,
  ].some(
    (option) =>
      option.value === currentValue
  );

  if (valueExists) {
    submissionWorkplaceFilter.value =
      currentValue;
  }
}

function getWorkplaceName(workplaceId) {
  const workplace =
    workplaces.find(
      (item) =>
        String(item.id) ===
        String(workplaceId)
    );

  return workplace?.name ||
    "삭제된 현장";
}

function getSubmissionItemResults(
  checkedItems
) {
  if (
    !Array.isArray(
      checkedItems
    )
  ) {
    return [];
  }

  const commonItemMap =
    new Map(
      checklistItems.map(
        (item) => [
          String(item.id),
          item.label,
        ]
      )
    );

  return checkedItems.map(
    (item) => {
      if (
        item &&
        typeof item === "object"
      ) {
        const rating =
          item.rating ||
          (
            item.checked === false
              ? "incomplete"
              : "completed"
          );

        return {
          id:
            String(
              item.id || ""
            ),

          label:
            item.label ||
            commonItemMap.get(
              String(item.id)
            ) ||
            customItemMap.get(
              String(item.id)
            ) ||
            "삭제된 항목",

          rating,

          /*
            기존 코드 호환용
          */
          checked:
            rating !==
            "incomplete",
        };
      }

      return {
        id:
          String(item),

        label:
          commonItemMap.get(
            String(item)
          ) ||
          customItemMap.get(
            String(item)
          ) ||
          "기존 점검 항목",

        rating:
          "completed",

        checked: true,
      };
    }
  );
}

function getSubmittedItemLabels(
  checkedItems
) {
  return getSubmissionItemResults(
    checkedItems
  )
    .filter(
      (item) =>
        item.rating !==
        "incomplete"
    )
    .map(
      (item) =>
        item.label
    );
}

function formatPhotoFileSize(
  fileSize
) {
  const size =
    Number(fileSize) || 0;

  if (size < 1024) {
    return `${size}B`;
  }

  if (
    size <
    1024 * 1024
  ) {
    return `${Math.ceil(
      size / 1024
    )}KB`;
  }

  return `${(
    size /
    1024 /
    1024
  ).toFixed(1)}MB`;
}


function showChecklistPhotoLoading() {
  currentChecklistPhotos = [];

  checklistDetailPhotoCount.textContent =
    "불러오는 중";

  checklistDetailPhotoList.innerHTML = `
    <p class="checklist-detail-photo-empty">
      사진을 불러오는 중입니다.
    </p>
  `;
}


function renderChecklistDetailPhotos() {
  checklistDetailPhotoCount.textContent =
    `${currentChecklistPhotos.length}장`;

  if (
    currentChecklistPhotos.length === 0
  ) {
    checklistDetailPhotoList.innerHTML = `
      <p class="checklist-detail-photo-empty">
        첨부된 사진이 없습니다.
      </p>
    `;

    return;
  }

  checklistDetailPhotoList.innerHTML =
    currentChecklistPhotos
      .map((photo, index) => {
        const originalName =
          photo.original_name ||
          photo.file_name ||
          `현장사진-${index + 1}.jpg`;

        const photoCaption =
          String(
            photo.photo_caption || ""
          ).trim();

        const displayName =
          photoCaption ||
          `사진 ${index + 1}`;

        const fileSize =
          photo.file_size ??
          photo.size_bytes ??
          0;

        const previewContent =
          photo.signedUrl
            ? `
              <a
                class="checklist-detail-photo-preview"
                href="${escapeHtml(
                  photo.signedUrl
                )}"
                target="_blank"
                rel="noopener noreferrer"
                title="사진 크게 보기"
              >
                <img
                  src="${escapeHtml(
                    photo.signedUrl
                  )}"
                  alt="현장 사진 ${index + 1}"
                  loading="eager"
                >
              </a>
            `
            : `
              <div class="checklist-detail-photo-unavailable">
                미리보기 불가
              </div>
            `;

        return `
          <article class="checklist-detail-photo-card">
            ${previewContent}

            <div class="checklist-detail-photo-info">
              <div>
                <strong title="${escapeHtml(
                  displayName
                )}">
                  ${escapeHtml(
                    displayName
                  )}
                </strong>

                <small>
                  ${escapeHtml(
                    originalName
                  )}
                  ·
                  ${formatPhotoFileSize(
                    fileSize
                  )}
                </small>
              </div>

              <div class="checklist-detail-photo-actions">
                <button
                  type="button"
                  data-checklist-photo-download="${escapeHtml(
                    photo.id
                  )}"
                >
                  다운로드
                </button>

                <button
                  type="button"
                  class="photo-delete-button"
                  data-checklist-photo-delete="${escapeHtml(
                    photo.id
                  )}"
                >
                  삭제
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join("");

  checklistDetailPhotoList
    .querySelectorAll(
      "[data-checklist-photo-download]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        async () => {
          await downloadChecklistPhoto(
            button.dataset
              .checklistPhotoDownload,
            button
          );
        }
      );
    });

    checklistDetailPhotoList
  .querySelectorAll(
    "[data-checklist-photo-delete]"
  )
  .forEach((button) => {
    button.addEventListener(
      "click",
      async () => {
        await deleteChecklistPhoto(
          button.dataset
            .checklistPhotoDelete,
          button
        );
      }
    );
  });
}


async function loadChecklistDetailPhotos(
  submissionId
) {
  const requestedSubmissionId =
    String(submissionId);

  showChecklistPhotoLoading();

  const {
    data,
    error,
  } = await supabase.rpc(
    "admin_get_uploads",
    {
      p_parent_type:
        "cleaning_checklist",

      p_parent_id:
        requestedSubmissionId,
    }
  );

  if (
    openedChecklistSubmissionId !==
    requestedSubmissionId
  ) {
    return;
  }

  if (error) {
    console.error(
      "점검표 사진 조회 실패:",
      error
    );

    checklistDetailPhotoCount.textContent =
      "조회 실패";

    checklistDetailPhotoList.innerHTML = `
      <p class="checklist-detail-photo-error">
        사진을 불러오지 못했습니다.
      </p>
    `;

    return;
  }

  const photos =
    Array.isArray(data)
      ? data
      : [];

  const photosWithSignedUrls =
    await Promise.all(
      photos.map(
        async (photo) => {
          const {
            data: signedData,
            error: signedError,
          } = await supabase.storage
            .from(
              "employee-uploads"
            )
            .createSignedUrl(
              photo.object_path,
              600
            );

          if (signedError) {
            console.error(
              "사진 미리보기 주소 생성 실패:",
              signedError
            );
          }

          return {
            ...photo,

            signedUrl:
              signedData?.signedUrl ||
              "",
          };
        }
      )
    );

  if (
    openedChecklistSubmissionId !==
    requestedSubmissionId
  ) {
    return;
  }

  currentChecklistPhotos =
    photosWithSignedUrls;

  renderChecklistDetailPhotos();
}


async function downloadChecklistPhoto(
  photoId,
  button
) {
  const photo =
    currentChecklistPhotos.find(
      (item) =>
        String(item.id) ===
        String(photoId)
    );

  if (!photo) {
    alert(
      "다운로드할 사진을 찾지 못했습니다."
    );

    return;
  }

  const originalButtonText =
    button.textContent;

  button.disabled = true;
  button.textContent =
    "받는 중...";

  try {
    const {
      data,
      error,
    } = await supabase.storage
      .from(
        "employee-uploads"
      )
      .download(
        photo.object_path
      );

    if (error) {
      throw error;
    }

    const downloadUrl =
      URL.createObjectURL(data);

    const downloadLink =
      document.createElement(
        "a"
      );

    downloadLink.href =
      downloadUrl;

    downloadLink.download =
      photo.original_name ||
      photo.file_name ||
      `cleaning-photo-${photo.id}.jpg`;

    document.body.appendChild(
      downloadLink
    );

    downloadLink.click();
    downloadLink.remove();

    setTimeout(
      () => {
        URL.revokeObjectURL(
          downloadUrl
        );
      },
      1000
    );
  } catch (error) {
    console.error(
      "사진 다운로드 실패:",
      error
    );

    alert(
      `사진을 다운로드하지 못했습니다.\n${
        error.message ||
        "잠시 후 다시 시도해 주세요."
      }`
    );
  } finally {
    button.disabled = false;
    button.textContent =
      originalButtonText;
  }
}

async function deleteChecklistPhoto(
  photoId,
  button
) {
  const photo =
    currentChecklistPhotos.find(
      (item) =>
        String(item.id) ===
        String(photoId)
    );

  if (!photo) {
    alert(
      "삭제할 사진을 찾지 못했습니다."
    );

    return;
  }

  const confirmed =
    confirm(
      "이 사진을 삭제하시겠습니까?\n\n삭제한 사진은 복구할 수 없습니다."
    );

  if (!confirmed) {
    return;
  }

  const originalButtonText =
    button.textContent;

  button.disabled = true;
  button.textContent =
    "삭제 중...";

  try {
    const {
      data,
      error,
    } =
      await supabase.functions.invoke(
        "delete-employee-photo",
        {
          body: {
            photo_id:
              photo.id,
          },
        }
      );

    if (error) {
      let errorMessage =
        error.message;

      try {
        const errorBody =
          await error.context?.json();

        errorMessage =
          errorBody?.error ||
          errorMessage;
      } catch {
        // 응답 본문을 읽지 못한 경우
      }

      throw new Error(
        errorMessage ||
        "사진 삭제에 실패했습니다."
      );
    }

    if (
      !data?.success
    ) {
      throw new Error(
        data?.error ||
        "사진 삭제에 실패했습니다."
      );
    }

    currentChecklistPhotos =
      currentChecklistPhotos.filter(
        (item) =>
          String(item.id) !==
          String(photoId)
      );

    renderChecklistDetailPhotos();
  } catch (error) {
    console.error(
      "사진 삭제 실패:",
      error
    );

    alert(
      `사진을 삭제하지 못했습니다.\n${
        error.message ||
        "잠시 후 다시 시도해 주세요."
      }`
    );

    button.disabled = false;
    button.textContent =
      originalButtonText;
  }
}

async function deleteChecklistSubmission(
  submissionId,
  button
) {
  const submission =
    submissions.find(
      (item) =>
        String(item.id) ===
        String(submissionId)
    );

  if (!submission) {
    alert(
      "삭제할 점검표를 찾지 못했습니다."
    );

    return;
  }

  const employeeName =
    submission.users?.name ||
    "이름 없음";

  const workplaceName =
    getWorkplaceName(
      submission.workplace_id
    );

  const confirmation =
    prompt(
      `${workplaceName} · ${employeeName} 직원의 점검표를 삭제합니다.\n\n연결된 현장 사진도 모두 삭제되며 복구할 수 없습니다.\n계속하려면 아래에 "삭제"라고 입력해 주세요.`
    );

  if (
    confirmation === null
  ) {
    return;
  }

  if (
    confirmation.trim() !==
    "삭제"
  ) {
    alert(
      '"삭제"라고 정확하게 입력해야 합니다.'
    );

    return;
  }

  const originalButtonText =
    button.textContent;

  button.disabled = true;
  button.textContent =
    "삭제 중...";

  try {
    const {
      data,
      error,
    } =
      await supabase.functions.invoke(
        "delete-cleaning-submission",
        {
          body: {
            submission_id:
              submission.id,

            confirmation:
              "삭제",
          },
        }
      );

    if (error) {
      let errorMessage =
        error.message;

      try {
        const errorBody =
          await error.context?.json();

        errorMessage =
          errorBody?.error ||
          errorMessage;
      } catch {
        // 응답 내용을 읽지 못한 경우
      }

      throw new Error(
        errorMessage ||
        "점검표 삭제에 실패했습니다."
      );
    }

    if (
      !data?.success
    ) {
      throw new Error(
        data?.error ||
        "점검표 삭제에 실패했습니다."
      );
    }

    submissions =
      submissions.filter(
        (item) =>
          String(item.id) !==
          String(submissionId)
      );

    if (
      openedChecklistSubmissionId ===
      String(submissionId)
    ) {
      closeChecklistSubmissionDetail();
    }

    renderSubmissions();

    alert(
      `점검표가 삭제되었습니다.\n연결 사진 ${Number(
        data.deleted_photo_count
      ) || 0}장도 함께 삭제했습니다.`
    );
  } catch (error) {
    console.error(
      "점검표 삭제 실패:",
      error
    );

    alert(
      `점검표를 삭제하지 못했습니다.\n${
        error.message ||
        "잠시 후 다시 시도해 주세요."
      }`
    );

    button.disabled = false;
    button.textContent =
      originalButtonText;
  }
}

async function openChecklistSubmissionDetail(
  submissionId
) {
  const submission =
    submissions.find(
      (item) =>
        String(item.id) ===
        String(submissionId)
    );

  if (!submission) {
    return;
  }

  openedChecklistSubmissionId =
    String(submission.id);

  const results =
    getSubmissionItemResults(
      submission.checked_items
    );

  const poorCount =
    results.filter(
      (item) =>
        item.rating === "poor"
    ).length;

  const fairCount =
    results.filter(
      (item) =>
        item.rating === "fair"
    ).length;

  const goodCount =
    results.filter(
      (item) =>
        item.rating === "good"
    ).length;

  const employeeName =
    submission.users?.name ||
    "이름 없음";

  const department =
    submission.users?.department ||
    "소속 미지정";

  const workplaceName =
    getWorkplaceName(
      submission.workplace_id
    );

  checklistDetailCloseBtn.onclick =
    closeChecklistSubmissionDetail;

  checklistDetailCancelBtn.onclick =
    closeChecklistSubmissionDetail;

  checklistDetailPrintBtn.onclick =
    printChecklistSubmissionDetail;

  checklistDetailModal.onclick =
    (event) => {
      if (
        event.target ===
        checklistDetailModal
      ) {
        closeChecklistSubmissionDetail();
      }
    };

  checklistDetailSubtitle.textContent =
    `${workplaceName} · ${employeeName}`;

  checklistDetailWorkplace.textContent =
    workplaceName;

  checklistDetailEmployee.textContent =
    `${employeeName} · ${department}`;

  checklistDetailDate.textContent =
    formatSubmissionDate(
      submission.created_at
    );

  checklistDetailProgress.textContent =
    (
      poorCount +
      fairCount +
      goodCount
    ) > 0
      ? `불량 ${poorCount} · 보통 ${fairCount} · 양호 ${goodCount}`
      : `${results.length}개 항목`;

  checklistDetailNote.textContent =
    submission.note ||
    "메모 없음";

  if (!results.length) {
    checklistDetailTableBody.innerHTML = `
      <tr>
        <td
          colspan="3"
          class="checklist-detail-empty"
        >
          저장된 점검 항목이 없습니다.
        </td>
      </tr>
    `;
  } else {
    checklistDetailTableBody.innerHTML =
      results
        .map(
          (
            item,
            index
          ) => {
            const ratingLabels = {
              poor: "불량",
              fair: "보통",
              good: "양호",
              completed: "기존 완료",
              incomplete: "미완료",
            };

            return `
              <tr>
                <td>
                  ${index + 1}
                </td>

                <td>
                  ${escapeHtml(
                    item.label
                  )}
                </td>

                <td>
                  <span
                    class="checklist-result ${escapeHtml(
                      item.rating
                    )}"
                  >
                    ${escapeHtml(
                      ratingLabels[
                        item.rating
                      ] ||
                      item.rating
                    )}
                  </span>
                </td>
              </tr>
            `;
          }
        )
        .join("");
    }

  checklistDetailModal.classList.add(
    "open"
  );

  checklistDetailModal.setAttribute(
    "aria-hidden",
    "false"
  );

  await loadChecklistDetailPhotos(
    submission.id
  );
}

function closeChecklistSubmissionDetail() {
  openedChecklistSubmissionId =
    null;

  currentChecklistPhotos = [];

  checklistDetailModal.classList.remove(
    "open"
  );

  checklistDetailModal.setAttribute(
    "aria-hidden",
    "true"
  );
}

async function waitForChecklistPrintImages() {
  const images = [
    ...checklistDetailPhotoList
      .querySelectorAll("img"),
  ];

  if (!images.length) {
    return;
  }

  await Promise.all(
    images.map(
      async (image) => {
        if (
          image.complete &&
          image.naturalWidth > 0
        ) {
          try {
            await image.decode();
          } catch {
            // 이미 표시 가능한 사진
          }

          return;
        }

        await new Promise(
          (resolve) => {
            const finish = () => {
              resolve();
            };

            image.addEventListener(
              "load",
              finish,
              {
                once: true,
              }
            );

            image.addEventListener(
              "error",
              finish,
              {
                once: true,
              }
            );
          }
        );

        try {
          await image.decode();
        } catch {
          // 불러오지 못한 사진은
          // 나머지 내용만 인쇄
        }
      }
    )
  );
}

async function printChecklistSubmissionDetail() {
  if (
    checklistDetailPhotoCount
      .textContent ===
    "불러오는 중"
  ) {
    alert(
      "사진을 불러온 후 다시 출력해 주세요."
    );

    return;
  }

  await waitForChecklistPrintImages();

  document.body.classList.add(
    "checklist-detail-printing"
  );

  const removePrintClass = () => {
    document.body.classList.remove(
      "checklist-detail-printing"
    );
  };

  window.addEventListener(
    "afterprint",
    removePrintClass,
    {
      once: true,
    }
  );

  window.print();

  setTimeout(
    removePrintClass,
    1500
  );
}

async function loadSubmissions() {
  submissionTableBody.innerHTML = `
    <tr>
      <td
        colspan="7"
        class="workflow-empty"
      >
        제출 내역을 불러오는 중입니다.
      </td>
    </tr>
  `;

  const [
    submissionResult,
    customItemResult,
  ] = await Promise.all([
    supabase
      .from(
        "cleaning_checklist_submissions"
      )
      .select(`
        id,
        user_id,
        workplace_id,
        work_date,
        checked_items,
        note,
        created_at,
        users (
          id,
          name,
          department
        )
      `)
      .order("created_at", {
        ascending: false,
      })
      .limit(200),

    supabase
      .from(
        "employee_custom_checklist_items"
      )
      .select("id, label"),
  ]);

  if (submissionResult.error) {
    console.error(
      "점검표 제출 내역 조회 실패:",
      submissionResult.error
    );

    submissionTableBody.innerHTML = `
      <tr>
        <td
          colspan="7"
          class="workflow-empty error"
        >
          제출 내역을 불러오지 못했습니다.
        </td>
      </tr>
    `;

    return;
  }

  if (customItemResult.error) {
    console.error(
      "개인 점검 항목 조회 실패:",
      customItemResult.error
    );
  }

  customItemMap =
    new Map(
      (
        customItemResult.data || []
      ).map((item) => [
        String(item.id),
        item.label,
      ])
    );

  submissions =
    submissionResult.data || [];

  renderSubmissions();
}

function renderSubmissions() {
  const selectedDate =
    submissionDateFilter.value;

  const selectedWorkplace =
    submissionWorkplaceFilter.value;

  const keyword =
    submissionSearchInput.value
      .trim()
      .toLowerCase();

  const filteredSubmissions =
    submissions.filter(
      (submission) => {
        const dateMatched =
          !selectedDate ||
          submission.work_date ===
            selectedDate;

        const workplaceMatched =
          selectedWorkplace === "all" ||
          String(
            submission.workplace_id
          ) ===
            String(
              selectedWorkplace
            );

        const employeeName =
          submission.users?.name ||
          "";

        const searchMatched =
          !keyword ||
          employeeName
            .toLowerCase()
            .includes(keyword);

        return (
          dateMatched &&
          workplaceMatched &&
          searchMatched
        );
      }
    );

  submissionCount.textContent =
    `${filteredSubmissions.length}건`;

  if (!filteredSubmissions.length) {
    submissionTableBody.innerHTML = `
      <tr>
        <td
          colspan="7"
          class="workflow-empty"
        >
          조건에 맞는 제출 내역이 없습니다.
        </td>
      </tr>
    `;

    return;
  }

  submissionTableBody.innerHTML =
    filteredSubmissions
      .map((submission) => {
        const results =
          getSubmissionItemResults(
            submission.checked_items
          );

        const completedResults =
          results.filter(
            (item) =>
              item.rating !==
              "incomplete"
          );

        const poorCount =
          results.filter(
            (item) =>
              item.rating === "poor"
          ).length;

        const fairCount =
          results.filter(
            (item) =>
              item.rating === "fair"
          ).length;

        const goodCount =
          results.filter(
            (item) =>
              item.rating === "good"
          ).length;

        const employeeName =
          submission.users?.name ||
          "이름 없음";

        const department =
          submission.users?.department ||
          "소속 미지정";

        return `
          <tr>
            <td>
              ${escapeHtml(
                formatSubmissionDate(
                  submission.created_at
                )
              )}
            </td>

            <td>
              ${escapeHtml(
                getWorkplaceName(
                  submission.workplace_id
                )
              )}
            </td>

            <td>
              <strong>
                ${escapeHtml(employeeName)}
              </strong>

              <small class="workflow-department">
                ${escapeHtml(department)}
              </small>
            </td>

            <td>
              <div class="admin-rating-summary">
                ${
                  (
                    poorCount +
                    fairCount +
                    goodCount
                  ) > 0
                    ? `
                      <span class="poor">
                        불량 ${poorCount}
                      </span>

                      <span class="fair">
                        보통 ${fairCount}
                      </span>

                      <span class="good">
                        양호 ${goodCount}
                      </span>
                    `
                    : `
                      <span class="legacy">
                        ${completedResults.length}
                        /
                        ${results.length}
                      </span>
                    `
                }
              </div>
            </td>

            <td>
              <div class="workflow-submitted-items">
                ${
                  completedResults.length
                    ? completedResults
                        .slice(0, 3)
                        .map(
                          (item) => `
                            <span>
                              ${escapeHtml(item.label)}
                            </span>
                          `
                        )
                        .join("")
                    : `
                      <em>
                        완료한 항목 없음
                      </em>
                    `
                }

                ${
                  completedResults.length > 3
                    ? `
                      <em>
                        외 ${completedResults.length - 3}개
                      </em>
                    `
                    : ""
                }
              </div>
            </td>

            <td class="workflow-submission-note">
              ${escapeHtml(
                submission.note || "-"
              )}
            </td>

            <td>
              <div class="workflow-submission-actions">
                <button
                  type="button"
                  class="workflow-detail-button"
                  data-submission-detail="${escapeHtml(
                    submission.id
                  )}"
                >
                  상세
                </button>

                <button
                  type="button"
                  class="workflow-submission-delete-button"
                  data-submission-delete="${escapeHtml(
                    submission.id
                  )}"
                >
                  삭제
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

  submissionTableBody
    .querySelectorAll(
      "[data-submission-detail]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          openChecklistSubmissionDetail(
            button.dataset
              .submissionDetail
          );
        }
      );
    });

    submissionTableBody
  .querySelectorAll(
    "[data-submission-delete]"
  )
  .forEach((button) => {
    button.addEventListener(
      "click",
      async () => {
        await deleteChecklistSubmission(
          button.dataset
            .submissionDelete,
          button
        );
      }
    );
  });
}

submissionDateFilter.addEventListener(
  "change",
  renderSubmissions
);

submissionWorkplaceFilter.addEventListener(
  "change",
  renderSubmissions
);

submissionSearchInput.addEventListener(
  "input",
  renderSubmissions
);

submissionFilterResetBtn.addEventListener(
  "click",
  () => {
    submissionDateFilter.value = "";
    submissionWorkplaceFilter.value =
      "all";
    submissionSearchInput.value = "";

    renderSubmissions();
  }
);

itemForm.addEventListener(
  "submit",
  addChecklistItem
);

workplaceSelect.addEventListener(
  "change",
  loadAssignments
);

saveButton.addEventListener(
  "click",
  saveWorkplaceAssignments
);

const currentAdmin =
  await requireAdmin();

if (currentAdmin) {
  await loadBaseData();

  renderSubmissionWorkplaces();

  await loadSubmissions();
}

async function deleteAppCustomChecklistItem(
  itemId,
  itemLabel
) {
  const confirmed = confirm(
    `"${itemLabel}" 항목을 삭제하시겠습니까?\n\n삭제하면 해당 직원의 앱 점검표에서도 사라집니다.`
  );

  if (!confirmed) {
    return;
  }

  const { error } = await supabase
    .from(
      "employee_custom_checklist_items"
    )
    .delete()
    .eq("id", itemId);

  if (error) {
    console.error(
      "앱 추가 항목 삭제 실패:",
      error
    );

    alert(
      `항목을 삭제하지 못했습니다.\n${error.message}`
    );

    return;
  }

  alert("앱 추가 항목이 삭제되었습니다.");

  await loadBaseData();
}