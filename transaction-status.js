let countdownInterval;

window.addEventListener('message', (event) => {
  if (event.data.action === 'waiting') {
    const countdownElem = document.getElementById('countdown');
    const statusElem = document.getElementById('status');
    const scheduledTime = new Date(event.data.scheduledTime); // 스케줄된 시간을 Date 객체로 변환

    countdownInterval = setInterval(() => {
      const now = new Date();  // 현재 시간
      const timeRemaining = (scheduledTime - now) / 1000;  // 남은 시간 (초)

      if (timeRemaining <= 0) {
        clearInterval(countdownInterval);
        countdownElem.innerText = 'Transaction sending now!';
      } else {
        countdownElem.innerText = `Time Remaining: ${timeRemaining.toFixed(1)} seconds`;
        statusElem.innerText = `Current Time: ${now.toLocaleTimeString()} | Scheduled Time: ${scheduledTime.toLocaleTimeString()}`;
      }
    }, 100);  // 0.1초마다 업데이트
  } else if (event.data.action === 'sendingTransaction') {
    document.getElementById('status').innerText = 'Sending transaction...';
  } else if (event.data.action === 'transactionComplete') {
    document.getElementById('status').innerText = `Transaction complete! TX Hash: ${event.data.receipt.transactionHash}`;
    const link = document.createElement('a');
    link.href = event.data.scanUrl;
    link.textContent = 'View on Scan Site';
    link.target = '_blank';
    document.body.appendChild(link);
  } else if (event.data.action === 'transactionError') {
    document.getElementById('status').innerText = `Transaction failed: ${event.data.error}`;
  }
});

document.getElementById('cancelTransaction').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'cancelTransaction' });
  clearInterval(countdownInterval);  // 카운트다운 중지
  window.close();  // 팝업 창 닫기
});
