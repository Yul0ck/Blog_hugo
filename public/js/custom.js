/* 离开当前页面时修改网页标题，回到当前页面时恢复原来标题 */
window.onload = function () {
  var OriginTitile = document.title;
  var titleTime;
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      $('[rel="icon"]').attr("href", "/failure.ico");
      $('[rel="shortcut icon"]').attr("href", "/failure.ico");
      document.title = "哦~该回码头了";
      clearTimeout(titleTime);
    } else {
      $('[rel="icon"]').attr("href", "/favicon.ico");
      $('[rel="shortcut icon"]').attr("href", "/favicon.ico");
      document.title = "哈~又整到薯条了";
      titleTime = setTimeout(function () {
        document.title = OriginTitile;
      }, 2000);
    }
  });
};
