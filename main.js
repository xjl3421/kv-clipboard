// KV Clipboard

const KVCacheURL = "https://cache.ravelloh.top";
// const KVCacheURL = "http://localhost:3000";

async function stringToUUID(str) {
  // 将字符串转换为ArrayBuffer
  const encoder = new TextEncoder();
  const data = encoder.encode(str);

  // 使用SHA-1哈希函数进行哈希处理
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  // 将哈希值转换为16进制字符串
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // 将哈希值转换为UUID格式
  // 注意：UUID的版本和变体位需要被设置为特定值
  // 这里我们设置版本为4（随机生成的UUID），变体为10xx（RFC 4122）
  const uuid = [
    hashHex.substring(0, 8),
    hashHex.substring(8, 12),
    hashHex.substring(12, 16),
    hashHex.substring(16, 20),
    // 截取20到32位，并设置版本和变体位
    hashHex.substring(20, 24) +
      "4" + // 设置版本为4
      hashHex.substring(24, 36), // 变体位10xx
  ].join("-");

  return uuid;
}

function copy() {
  // 复制div.textarea中的内容到剪切板
  navigator.clipboard.writeText(document.querySelector("textarea").value);
  message("复制成功");
}

function clearclipboard() {
  deleteClipboard(document.querySelector("#uuid").innerHTML, "")
    .then((response) => response.json())
    .then((data) => {
      document.querySelector("#status").innerHTML = data.message;

      console.log(data);
    })
    .catch((error) => {
      alert(error);
    });
}

async function refresh(password="") {
  if (password == "" && document.querySelector("#password").innerHTML !== "..." && document.querySelector("#password").innerHTML !== "未设置") {
    password = document.querySelector("#password").innerHTML;
  }
  // 预先检查
  document.querySelector("#name").innerHTML = window.location.pathname.replace(
    "/",
    ""
  );
  // 生成uuid
  const uuid = (
    await stringToUUID(window.location.pathname.replace("/", ""))
  ).substring(0, 36);
  document.querySelector("#uuid").innerHTML = uuid;
  getClipboard(uuid, password, false)
    .then((response) => response.json())
    .then((data) => {
      if (data.message == "未找到数据") {
        document.querySelector("#status").innerHTML = "无内容，请在下方编辑";
        document.querySelector("#password").innerHTML = "未设置";
        document.querySelector("#ip-protect").innerHTML = "未设置";
        document.querySelector("#time").innerHTML = "未设置";
      } else if (data.message == "无效的密码") {
        refresh(prompt("请输入密码"))
      } else {
        document.querySelector("#status").innerHTML = data.message;
        document.querySelector("textarea").value = data.data;
        document.querySelector("#password").innerHTML =
          data.password || "未设置";
        document.querySelector("#ip-protect").innerHTML = data.safeIP;
        document.querySelector("#time").innerHTML = data.expiredAt;
      }
      console.log(data);
    })
    .catch((error) => {
      alert(error);
    });
}

function setClipboard(data, password, safeIP, expiredTime, uuid) {
  return fetch(`${KVCacheURL}/api?mode=set`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: data,
      password: password,
      safeIP: safeIP,
      expiredTime: expiredTime,
      uuid: uuid,
    }),
  });
}

function save() {
  const data = document.querySelector("textarea").value;
  const password = document
    .querySelector("#password")
    .innerHTML.replace("未设置", "");
  const safeIP = document
    .querySelector("#ip-protect")
    .innerHTML.replace("未设置", "");
  const expiredTime = document
    .querySelector("#time")
    .innerHTML.replace("未设置", 365 * 24 * 60 * 60 * 1000);
  const uuid = document.querySelector("#uuid").innerHTML;

  // 状态提示
  document.querySelector("#status").innerHTML = "正在保存...";
  
  // 先删除数据，然后再保存
  deleteClipboard(uuid, password)
    .then(response => response.json())
    .then(deleteData => {
      console.log("删除结果:", deleteData);
      
      // 不论删除成功与否，都继续保存
      return setClipboard(data, password, safeIP, expiredTime, uuid);
    })
    .then(response => response.json())
    .then(data => {
      document.querySelector("#status").innerHTML = data.message;
      message("保存成功");
    })
    .catch(error => {
      document.querySelector("#status").innerHTML = "保存失败";
      console.error("保存过程出错:", error);
      alert("保存失败: " + error);
    });
}

function getClipboard(uuid, password, shouldDelete) {
  return fetch(`${KVCacheURL}/api?mode=get`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      uuid: uuid,
      password: password,
      shouldDelete: shouldDelete,
    }),
  });
}

function deleteClipboard(uuid, password) {
  return fetch(`${KVCacheURL}/api?mode=del`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      uuid: uuid,
    }),
  });
}

async function main() {
  // 若为主页，随机跳转
  if (
    window.location.pathname === "/" ||
    window.location.pathname === "/404.html"
  ) {
    // 随机生成4位字符串
    const randomString = Math.random().toString(36).substring(2, 6);
    window.location.href = "/" + randomString;
  } else {
    refresh();
  }
}

function message(message) {
  const origin = document.querySelector("#status").innerHTML;
  document.querySelector("#status").innerHTML = message;
  setTimeout(() => {
    document.querySelector("#status").innerHTML = origin;
  }, 2000);
}

function setpassword() {
  document.querySelector("#password").innerHTML = prompt("请输入密码");
}

function setip() {
  fetch("https://ip.api.ravelloh.top")
    .then((response) => response.json())
    .then((data) => {
      document.querySelector("#ip-protect").innerHTML = prompt(
        `请输入IP(当前IP为${data.ip})`
      );
    });
}

function settime() {
  document.querySelector("#time").innerHTML =
    prompt("请输入过期时间(单位为小时)");
}

function copyRaw() {
  navigator.clipboard.writeText(
    `${KVCacheURL}?uuid=${document.querySelector("#uuid").innerHTML}${
      document.querySelector("#password").innerHTML !== "未设置" &&
      document.querySelector("#password").innerHTML !== ""
        ? `&password=${document.querySelector("#password").innerHTML}`
        : ""
    }`
  );
  message("已复制");
}
main();
