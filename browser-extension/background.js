/* Zhangchao background service worker */

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'zhangchao-pause-end') {
    chrome.storage.local.set({ pauseUntil: 0 });
  }
});
