import supabase from "./supabase.js";

import {
  getEmployeeSessionToken,
} from "./employeeAuth.js";

const MAX_OUTPUT_SIZE =
  0.95 * 1024 * 1024;

const MAX_IMAGE_LENGTH = 1600;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];


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
            "사진을 불러오지 못했습니다."
          )
        );
      };

      image.src = objectUrl;
    }
  );
}


function canvasToBlob(
  canvas,
  quality
) {
  return new Promise(
    (resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                "사진을 변환하지 못했습니다."
              )
            );

            return;
          }

          resolve(blob);
        },
        "image/jpeg",
        quality
      );
    }
  );
}


function createFileName(
  originalName
) {
  const name =
    String(
      originalName ||
      "cleaning-photo"
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
    name ||
    "cleaning-photo"
  }.jpg`;
}


export async function compressPhoto(
  originalFile
) {
  if (
    !ALLOWED_TYPES.includes(
      originalFile.type
    )
  ) {
    throw new Error(
      "JPG, PNG, WEBP 사진만 첨부할 수 있습니다."
    );
  }

  const image =
    await loadImage(
      originalFile
    );

  const sourceWidth =
    image.naturalWidth;

  const sourceHeight =
    image.naturalHeight;

  let dimensionRatio =
    Math.min(
      1,
      MAX_IMAGE_LENGTH /
        Math.max(
          sourceWidth,
          sourceHeight
        )
    );

  let quality = 0.82;
  let resultBlob = null;

  for (
    let attempt = 0;
    attempt < 10;
    attempt += 1
  ) {
    const width = Math.max(
      1,
      Math.round(
        sourceWidth *
          dimensionRatio
      )
    );

    const height = Math.max(
      1,
      Math.round(
        sourceHeight *
          dimensionRatio
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
        "사진을 변환하지 못했습니다."
      );
    }

    context.fillStyle =
      "#ffffff";

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

    resultBlob =
      await canvasToBlob(
        canvas,
        quality
      );

    if (
      resultBlob.size <=
      MAX_OUTPUT_SIZE
    ) {
      break;
    }

    if (quality > 0.52) {
      quality -= 0.1;
    } else {
      dimensionRatio *= 0.8;
      quality = 0.72;
    }
  }

  if (
    !resultBlob ||
    resultBlob.size >
      MAX_OUTPUT_SIZE
  ) {
    throw new Error(
      "사진 용량을 줄이지 못했습니다. 다른 사진을 선택해 주세요."
    );
  }

  return new File(
    [resultBlob],
    createFileName(
      originalFile.name
    ),
    {
      type: "image/jpeg",
      lastModified:
        Date.now(),
    }
  );
}


export async function preparePhotos(
  fileList,
  maximumCount
) {
  const files =
    Array.from(
      fileList || []
    );

  if (
    files.length >
    maximumCount
  ) {
    throw new Error(
      `사진은 최대 ${maximumCount}장까지 선택할 수 있습니다.`
    );
  }

  const results = [];

  for (const file of files) {
    const compressedFile =
      await compressPhoto(file);

    results.push({
      id:
        crypto.randomUUID(),

      file:
        compressedFile,

      previewUrl:
        URL.createObjectURL(
          compressedFile
        ),

      caption: "",

      uploaded: false,
    });
  }

  return results;
}


export function releasePhoto(
  photo
) {
  if (photo?.previewUrl) {
    URL.revokeObjectURL(
      photo.previewUrl
    );
  }
}


async function readFunctionError(
  error
) {
  try {
    const response =
      error?.context;

    if (
      response instanceof
      Response
    ) {
      const payload =
        await response
          .clone()
          .json();

      return (
        payload.message ||
        "사진 업로드에 실패했습니다."
      );
    }
  } catch (readError) {
    console.error(
      "함수 오류 읽기 실패:",
      readError
    );
  }

  return (
    error?.message ||
    "사진 업로드에 실패했습니다."
  );
}


export async function uploadPhotos({
  photos,
  parentType,
  parentId,
  onProgress,
  onUploaded,
}) {
  const sessionToken =
    getEmployeeSessionToken();

  if (!sessionToken) {
    throw new Error(
      "로그인 정보가 만료되었습니다. 다시 로그인해 주세요."
    );
  }

  const pendingPhotos =
    photos.filter(
      (photo) =>
        !photo.uploaded
    );

  for (
    let index = 0;
    index <
    pendingPhotos.length;
    index += 1
  ) {
    const photo =
      pendingPhotos[index];

    onProgress?.({
      current: index + 1,
      total:
        pendingPhotos.length,
      photo,
    });

    const formData =
      new FormData();

    formData.append(
      "session_token",
      sessionToken
    );

    formData.append(
      "parent_type",
      parentType
    );

    formData.append(
      "parent_id",
      parentId
    );

    formData.append(
      "photo_caption",
      String(
        photo.caption || ""
      ).trim()
    );

    formData.append(
      "file",
      photo.file,
      photo.file.name
    );

    const {
      data,
      error,
    } =
      await supabase
        .functions
        .invoke(
          "upload-employee-photo",
          {
            body: formData,
          }
        );

    if (error) {
      throw new Error(
        await readFunctionError(
          error
        )
      );
    }

    if (
      !data?.success
    ) {
      throw new Error(
        data?.message ||
        "사진 업로드에 실패했습니다."
      );
    }

    photo.uploaded = true;

    onUploaded?.({
      photo,
      data,
      current: index + 1,
      total:
        pendingPhotos.length,
    });
  }
}