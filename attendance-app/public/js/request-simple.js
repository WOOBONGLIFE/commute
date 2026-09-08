import supabase from "./supabase.js";

import {
  getCurrentEmployee,
  getEmployeeSessionToken,
} from "./employeeAuth.js";

const form =
  document.getElementById(
    "simpleRequestForm"
  );

const titleInput =
  document.getElementById(
    "requestTitle"
  );

const contentInput =
  document.getElementById(
    "requestContent"
  );

const imageInput =
  document.getElementById(
    "requestImage"
  );

const imagePreviewBox =
  document.getElementById(
    "requestImagePreviewBox"
  );

const imagePreview =
  document.getElementById(
    "requestImagePreview"
  );

const imageName =
  document.getElementById(
    "requestImageName"
  );

const removeImageButton =
  document.getElementById(
    "removeRequestImageBtn"
  );

const MAX_IMAGE_SIZE =
  1.4 * 1024 * 1024;

const MAX_IMAGE_LENGTH = 1400;

let selectedImage = null;


function getErrorMessage(error) {
  const message =
    error?.message || "";

  if (
    message.includes(
      "TEAM_LEAD_ONLY"
    )
  ) {
    return "팀장 권한이 필요합니다.";
  }

  if (
    message.includes(
      "SUPPLY_REQUEST_PERMISSION_REQUIRED"
    )
  ) {
    return "비품 요청 권한이 필요합니다.";
  }

  if (
    message.includes(
      "INVALID_SESSION"
    )
  ) {
    return "로그인 정보가 만료되었습니다. 다시 로그인해 주세요.";
  }

  if (
    message.includes(
      "IMAGE_TOO_LARGE"
    )
  ) {
    return "사진 용량이 너무 큽니다. 다른 사진을 선택해 주세요.";
  }

  if (
    message.includes(
      "UNSUPPORTED_IMAGE_TYPE"
    )
  ) {
    return "지원하지 않는 사진 형식입니다.";
  }

  if (
    message.includes(
      "INVALID_IMAGE_DATA"
    )
  ) {
    return "사진을 처리하지 못했습니다. 다른 사진을 선택해 주세요.";
  }

  if (
    message.includes(
      "TITLE_REQUIRED"
    )
  ) {
    return "제목을 입력해 주세요.";
  }

  if (
    message.includes(
      "CONTENT_REQUIRED"
    )
  ) {
    return "요청 내용을 입력해 주세요.";
  }

  return "요청을 등록하지 못했습니다.";
}


function loadImage(file) {
  return new Promise(
    (resolve, reject) => {
      const objectUrl =
        URL.createObjectURL(file);

      const image = new Image();

      image.onload = () => {
        URL.revokeObjectURL(
          objectUrl
        );

        resolve(image);
      };

      image.onerror = () => {
        URL.revokeObjectURL(
          objectUrl
        );

        reject(
          new Error(
            "IMAGE_LOAD_FAILED"
          )
        );
      };

      image.src = objectUrl;
    }
  );
}


function canvasToBlob(
  canvas,
  type,
  quality
) {
  return new Promise(
    (resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                "IMAGE_CONVERT_FAILED"
              )
            );

            return;
          }

          resolve(blob);
        },
        type,
        quality
      );
    }
  );
}


function blobToDataUrl(blob) {
  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload = () => {
        resolve(reader.result);
      };

      reader.onerror = () => {
        reject(
          new Error(
            "IMAGE_READ_FAILED"
          )
        );
      };

      reader.readAsDataURL(blob);
    }
  );
}


function makeJpegFileName(
  originalName
) {
  const cleanName =
    String(
      originalName ||
      "request-image"
    )
      .replace(
        /\.[^/.]+$/,
        ""
      )
      .replace(
        /[^a-zA-Z0-9가-힣_-]/g,
        "-"
      )
      .slice(0, 60);

  return `${
    cleanName ||
    "request-image"
  }.jpg`;
}


async function compressImage(file) {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (
    !allowedTypes.includes(
      file.type
    )
  ) {
    throw new Error(
      "UNSUPPORTED_IMAGE_TYPE"
    );
  }

  const image =
    await loadImage(file);

  const originalWidth =
    image.naturalWidth;

  const originalHeight =
    image.naturalHeight;

  const ratio = Math.min(
    1,
    MAX_IMAGE_LENGTH /
      Math.max(
        originalWidth,
        originalHeight
      )
  );

  const width = Math.max(
    1,
    Math.round(
      originalWidth * ratio
    )
  );

  const height = Math.max(
    1,
    Math.round(
      originalHeight * ratio
    )
  );

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width = width;
  canvas.height = height;

  const context =
    canvas.getContext("2d");

  if (!context) {
    throw new Error(
      "IMAGE_CONVERT_FAILED"
    );
  }

  context.fillStyle = "#ffffff";

  context.fillRect(
    0,
    0,
    width,
    height
  );

  context.drawImage(
    image,
    0,
    0,
    width,
    height
  );

  let quality = 0.82;

  let blob =
    await canvasToBlob(
      canvas,
      "image/jpeg",
      quality
    );

  while (
    blob.size >
      MAX_IMAGE_SIZE &&
    quality > 0.42
  ) {
    quality -= 0.1;

    blob =
      await canvasToBlob(
        canvas,
        "image/jpeg",
        quality
      );
  }

  if (
    blob.size >
    MAX_IMAGE_SIZE
  ) {
    throw new Error(
      "IMAGE_TOO_LARGE"
    );
  }

  const dataUrl =
    await blobToDataUrl(blob);

  return {
    name: makeJpegFileName(
      file.name
    ),

    mimeType: "image/jpeg",

    size: blob.size,

    dataUrl,
  };
}


function formatFileSize(bytes) {
  if (!bytes) {
    return "";
  }

  if (bytes < 1024) {
    return `${bytes}B`;
  }

  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(2)}MB`;
}


function clearSelectedImage() {
  selectedImage = null;

  if (imageInput) {
    imageInput.value = "";
  }

  if (imagePreview) {
    imagePreview.removeAttribute(
      "src"
    );
  }

  if (imageName) {
    imageName.textContent = "";
  }

  if (imagePreviewBox) {
    imagePreviewBox.hidden = true;
  }
}


async function handleImageChange() {
  const file =
    imageInput?.files?.[0];

  if (!file) {
    clearSelectedImage();
    return;
  }

  const picker =
    document.querySelector(
      ".request-image-picker"
    );

  imageInput.disabled = true;

  if (picker) {
    picker.classList.add(
      "is-processing"
    );
  }

  try {
    selectedImage =
      await compressImage(file);

    imagePreview.src =
      selectedImage.dataUrl;

    imageName.textContent =
      `${
        selectedImage.name
      } · ${
        formatFileSize(
          selectedImage.size
        )
      }`;

    imagePreviewBox.hidden =
      false;
  } catch (error) {
    console.error(
      "사진 처리 실패:",
      error
    );

    clearSelectedImage();

    if (
      error.message ===
      "UNSUPPORTED_IMAGE_TYPE"
    ) {
      alert(
        "JPG, PNG, WEBP 사진만 첨부할 수 있습니다."
      );
    } else if (
      error.message ===
      "IMAGE_TOO_LARGE"
    ) {
      alert(
        "사진 용량을 줄이지 못했습니다. 다른 사진을 선택해 주세요."
      );
    } else {
      alert(
        "사진을 불러오지 못했습니다. 다른 사진을 선택해 주세요."
      );
    }
  } finally {
    imageInput.disabled = false;

    if (picker) {
      picker.classList.remove(
        "is-processing"
      );
    }
  }
}


async function submitRequest(
  event
) {
  event.preventDefault();

  const title =
    titleInput.value.trim();

  const content =
    contentInput.value.trim();

  if (!title) {
    alert(
      "제목을 입력해 주세요."
    );

    titleInput.focus();
    return;
  }

  if (!content) {
    alert(
      "요청 내용을 입력해 주세요."
    );

    contentInput.focus();
    return;
  }

  const submitButton =
    form.querySelector(
      'button[type="submit"]'
    );

  const originalText =
    submitButton.textContent;

  submitButton.disabled = true;

  submitButton.textContent =
    "요청 전송 중...";

  try {
    const sessionToken =
      getEmployeeSessionToken();

    if (!sessionToken) {
      throw new Error(
        "INVALID_SESSION"
      );
    }

    const {
      error,
    } = await supabase.rpc(
      "create_employee_request_with_image_by_session",
      {
        p_session_token:
          sessionToken,

        p_request_type:
          document.body.dataset
            .requestType,

        p_title: title,

        p_content: content,

        p_image_name:
          selectedImage?.name ||
          null,

        p_image_mime_type:
          selectedImage?.mimeType ||
          null,

        p_image_base64:
          selectedImage?.dataUrl ||
          null,
      }
    );

    if (error) {
      throw error;
    }

    alert(
      selectedImage
        ? "사진과 함께 요청이 등록되었습니다."
        : "요청이 등록되었습니다."
    );

    location.replace(
      "request.html"
    );
  } catch (error) {
    console.error(
      "요청 등록 실패:",
      error
    );

    alert(
      getErrorMessage(error)
    );
  } finally {
    submitButton.disabled = false;

    submitButton.textContent =
      originalText;
  }
}


async function init() {
  const employee =
    await getCurrentEmployee();

  if (!employee) {
    return;
  }

  const canUseLeadFeature =
    employee.app_role ===
      "team_lead" ||
    employee.app_role ===
      "checklist_admin";

  if (
    document.body.dataset
      .leadOnly === "true" &&
    !canUseLeadFeature
  ) {
    alert(
      "이 기능을 사용할 권한이 없습니다."
    );

    location.replace(
      "request.html"
    );

    return;
  }

  imageInput?.addEventListener(
    "change",
    handleImageChange
  );

  removeImageButton
    ?.addEventListener(
      "click",
      clearSelectedImage
    );

  form?.addEventListener(
    "submit",
    submitRequest
  );
}

init();